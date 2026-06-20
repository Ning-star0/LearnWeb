import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseExcel, ParsedQuestion } from '../../common/utils/excel-parser';

@Injectable()
export class BanksService {
  constructor(private prisma: PrismaService) {}

  async parseFile(file: Express.Multer.File, bookId: number) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('教材不存在');

    const result = parseExcel(file.buffer);
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
      sourceType?: string;
      copyrightRisk?: string;
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

    const result = await this.prisma.$transaction(async (tx) => {
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
            sourceType: (data.sourceType as any) || 'UNKNOWN',
            copyrightRisk: (data.copyrightRisk as any) || 'LOW',
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
    });

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
