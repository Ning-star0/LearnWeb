import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.book.findMany({
      include: {
        course: true,
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        course: true,
        _count: {
          select: { questions: true },
        },
      },
    });
    if (!book) {
      throw new NotFoundException('教材不存在');
    }
    return book;
  }

  async findChapters(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!book) {
      throw new NotFoundException('教材不存在');
    }

    const rows = await this.prisma.question.groupBy({
      by: ['chapter'],
      where: {
        bookId: id,
        isPublished: true,
        chapter: { not: null },
      },
      _count: { _all: true },
      orderBy: { chapter: 'asc' },
    });

    return rows
      .filter((row) => row.chapter)
      .map((row) => ({
        name: row.chapter,
        count: row._count._all,
      }));
  }
}
