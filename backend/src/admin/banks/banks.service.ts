import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { parseExcel, ParsedQuestion } from '../../common/utils/excel-parser';

const MAX_PARSE_ROWS = Number(process.env.QUESTION_IMPORT_MAX_ROWS || 5000);
const MAX_IMPORT_QUESTIONS = Number(
  process.env.QUESTION_IMPORT_MAX_QUESTIONS || 3000,
);
const MAX_STEM_LENGTH = Number(process.env.QUESTION_IMPORT_MAX_STEM || 5000);
const MAX_ANSWER_LENGTH = Number(process.env.QUESTION_IMPORT_MAX_ANSWER || 5000);
const MAX_OPTION_LENGTH = Number(process.env.QUESTION_IMPORT_MAX_OPTION || 1000);

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
        `单次最多导入 ${MAX_IMPORT_QUESTIONS} 道题，请拆分题库后再导入`,
      );
    }

    this.validateQuestionPayload(data.questions);

    const lockKey = `bank-import:admin:${adminId}`;
    const locked = await this.redisService.lock(lockKey, 120);
    if (!locked) {
      throw new BadRequestException('已有题库正在导入，请等待当前导入完成');
    }

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const bank = await tx.questionBank.create({
            data: {
              userId: adminId,
              bookId: data.bookId,
              name: data.name,
              isPublic: true,
            },
          });

          let imported = 0;
          for (const q of data.questions) {
            await tx.question.create({
              data: {
                bankId: bank.id,
                bookId: data.bookId,
                orderNo: q.orderNo,
                type: q.type as any,
                stem: q.stem,
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
          }
          return { bank, imported };
        },
        { maxWait: 5000, timeout: 30000 },
      );

      // 写入管理日志
      await this.prisma.adminLog.create({
        data: {
          adminId,
          action: 'UPLOAD_BANK',
          target: `Bank:${result.bank.id}`,
          detail: `导入 ${result.imported} 题到教材 ${book.name}`,
        },
      });

      return {
        bankId: result.bank.id,
        name: result.bank.name,
        bookName: book.name,
        imported: result.imported,
      };
    } finally {
      await this.redisService.unlock(lockKey);
    }
  }

  private validateQuestionPayload(questions: ParsedQuestion[]) {
    for (const q of questions) {
      if (q.stem.length > MAX_STEM_LENGTH) {
        throw new BadRequestException(
          `第 ${q.rawRow} 行题干过长，最多 ${MAX_STEM_LENGTH} 字`,
        );
      }
      if ((q.answerRaw || '').length > MAX_ANSWER_LENGTH) {
        throw new BadRequestException(
          `第 ${q.rawRow} 行答案过长，最多 ${MAX_ANSWER_LENGTH} 字`,
        );
      }
      for (const option of q.options || []) {
        if (option.content.length > MAX_OPTION_LENGTH) {
          throw new BadRequestException(
            `第 ${q.rawRow} 行选项 ${option.label} 过长，最多 ${MAX_OPTION_LENGTH} 字`,
          );
        }
      }
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
