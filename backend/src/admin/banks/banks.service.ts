import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { parseExcel, ParsedQuestion } from '../../common/utils/excel-parser';

// 放宽限制，更大的文件和更多题目
const MAX_PARSE_ROWS = Number(process.env.QUESTION_IMPORT_MAX_ROWS || 50000);
const MAX_IMPORT_QUESTIONS = Number(process.env.QUESTION_IMPORT_MAX_QUESTIONS || 50000);
const MAX_STEM_LENGTH = Number(process.env.QUESTION_IMPORT_MAX_STEM || 50000);
const MAX_ANSWER_LENGTH = Number(process.env.QUESTION_IMPORT_MAX_ANSWER || 10000);
const MAX_OPTION_LENGTH = Number(process.env.QUESTION_IMPORT_MAX_OPTION || 10000);
const BATCH_SIZE = 500; // 每批创建 500 道题

@Injectable()
export class BanksService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async parseFile(file: Express.Multer.File, bookId: number) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('教材不存在');

    const result = parseExcel(file.buffer, { maxRows: MAX_PARSE_ROWS });
    return { bookId, bookName: book.name, ...result };
  }

  async findAll() {
    return this.prisma.questionBank.findMany({
      include: {
        book: true,
        user: { select: { id: true, username: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const bank = await this.prisma.questionBank.findUnique({
      where: { id },
      include: {
        book: true,
        user: { select: { id: true, username: true } },
        _count: { select: { questions: true } },
        questions: {
          include: { options: { orderBy: { orderNo: 'asc' } } },
          orderBy: { orderNo: 'asc' },
        },
      },
    });
    if (!bank) throw new NotFoundException('题库不存在');
    return bank;
  }

  async importQuestions(
    adminId: number,
    data: {
      bookId: number;
      name: string;
      questions: ParsedQuestion[];
    },
  ) {
    const book = await this.prisma.book.findUnique({
      where: { id: data.bookId },
    });
    if (!book) throw new NotFoundException('教材不存在');

    if (!data.questions || data.questions.length === 0) {
      throw new BadRequestException('没有可导入的题目');
    }
    if (data.questions.length > MAX_IMPORT_QUESTIONS) {
      throw new BadRequestException(
        `单次最多导入 ${MAX_IMPORT_QUESTIONS} 道题，当前 ${data.questions.length} 题，请拆分后导入`,
      );
    }

    // 校验题目数据
    this.validateQuestionPayload(data.questions);

    // 防并发导入
    const lockKey = `bank-import:book:${data.bookId}`;
    const locked = await this.redisService.lock(lockKey, 300);
    if (!locked) {
      throw new BadRequestException('已有题库正在导入，请等待当前导入完成');
    }

    try {
      // 创建题库
      const bank = await this.prisma.questionBank.create({
        data: {
          userId: adminId,
          bookId: data.bookId,
          name: data.name,
          isPublic: true,
        },
      });

      // 分批导入题目
      let imported = 0;
      let skippedDuplicates = 0;
      let processed = 0;
      const questions = data.questions;

      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = questions.slice(i, i + BATCH_SIZE);

        // 每批使用一个事务
        await this.prisma.$transaction(
          async (tx) => {
            for (const q of batch) {
              const contentHash = this.createContentHash(q.stem, q.type);
              const legacyContentHash = this.createLegacyContentHash(
                q.stem,
                data.bookId,
                q.type,
              );

              // 检查重复
              const duplicate = await tx.question.findFirst({
                where: {
                  bookId: data.bookId,
                  OR: [
                    { contentHash },
                    { contentHash: legacyContentHash },
                    { type: q.type as any, stem: q.stem },
                  ],
                },
              });
              if (duplicate) {
                skippedDuplicates++;
                processed++;
                continue;
              }

              try {
                await tx.question.create({
                  data: {
                    bankId: bank.id,
                    bookId: data.bookId,
                    orderNo: q.orderNo,
                    type: q.type as any,
                    stem: q.stem,
                    contentHash,
                    answerRaw: q.answerRaw,
                    answerJson: q.answerJson,
                    isPublished: true,
                    options: {
                      create: q.options.map((o) => ({
                        label: o.label,
                        content: o.content,
                        orderNo: o.orderNo,
                      })),
                    },
                  },
                });
                imported++;
              } catch (e: any) {
                if (e?.code === 'P2002') {
                  skippedDuplicates++;
                } else {
                  throw e;
                }
              } finally {
                processed++;
              }
            }
          },
          { timeout: 60000 }, // 每批 60 秒超时
        );

        const progress = Math.round((processed / questions.length) * 100);
        await this.redisService.set(
          `bank-import-progress:${bank.id}`,
          String(progress),
          300,
        );
      }

      if (imported === 0 && skippedDuplicates > 0) {
        await this.prisma.questionBank.delete({ where: { id: bank.id } });
      }

      // 写入管理日志
      await this.prisma.adminLog.create({
        data: {
          adminId,
          action: 'UPLOAD_BANK',
          target: `Bank:${bank.id}`,
          detail: `导入 ${imported} 题到教材 ${book.name}，跳过重复 ${skippedDuplicates} 题`,
        },
      });

      return {
        bankId: imported > 0 ? bank.id : null,
        name: bank.name,
        bookName: book.name,
        imported,
        skippedDuplicates,
      };
    } catch (e: any) {
      // 提供明确的错误信息
      const message = e.message || '导入失败';
      throw new BadRequestException(`导入失败: ${message}`);
    } finally {
      await this.redisService.unlock(lockKey);
    }
  }

  /** 新增：查询导入进度 */
  async getImportProgress(bankId: number) {
    const progress = await this.redisService.get(`bank-import-progress:${bankId}`);
    return { bankId, progress: progress ? parseInt(progress) : 100 };
  }

  private normalizeQuestionStem(stem: string) {
    return stem
      .normalize('NFKC')
      .replace(/\s+/g, '')
      .trim();
  }

  private createContentHash(stem: string, type: string) {
    return crypto
      .createHash('sha256')
      .update(`${this.normalizeQuestionStem(stem)}|${type}`)
      .digest('hex');
  }

  private createLegacyContentHash(stem: string, bookId: number, type: string) {
    return crypto
      .createHash('sha256')
      .update(`${stem}|${bookId}|${type}`)
      .digest('hex');
  }

  private validateQuestionPayload(questions: ParsedQuestion[]) {
    const errors: string[] = [];
    for (const q of questions) {
      if (q.stem.length > MAX_STEM_LENGTH) {
        errors.push(
          `第 ${q.rawRow} 行题干过长（${q.stem.length}/${MAX_STEM_LENGTH} 字）`,
        );
      }
      if ((q.answerRaw || '').length > MAX_ANSWER_LENGTH) {
        errors.push(
          `第 ${q.rawRow} 行答案过长（${(q.answerRaw || '').length}/${MAX_ANSWER_LENGTH} 字）`,
        );
      }
      for (const option of q.options || []) {
        if (option.content.length > MAX_OPTION_LENGTH) {
          errors.push(
            `第 ${q.rawRow} 行选项 ${option.label} 过长（${option.content.length}/${MAX_OPTION_LENGTH} 字）`,
          );
        }
      }
    }
    if (errors.length > 0) {
      const preview = errors.slice(0, 10).join('；');
      const suffix = errors.length > 10 ? `... 等 ${errors.length} 个错误` : '';
      throw new BadRequestException(`题目数据校验失败: ${preview}${suffix}`);
    }
  }

  async remove(id: number, adminId: number) {
    const bank = await this.prisma.questionBank.findUnique({ where: { id } });
    if (!bank) throw new NotFoundException('题库不存在');

    await this.prisma.question.deleteMany({ where: { bankId: id } });
    await this.prisma.questionBank.delete({ where: { id } });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_BANK',
        target: `Bank:${id}`,
        detail: `删除题库: ${bank.name}`,
      },
    });

    return { deleted: true };
  }
}
