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
}
