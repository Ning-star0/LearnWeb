import { Controller, Get, Query, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('questions')
export class QuestionsController {
  constructor(private prisma: PrismaService) {}

  /** 题目浏览器：支持筛选、搜索、分页 */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Query('bookId') bookId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('mode') mode?: string, // 'wrong' | 'correct' | 'all'
  ) {
    const where: any = { isPublished: true };
    if (bookId) where.bookId = parseInt(bookId);
    if (type) where.type = type;
    if (search) where.stem = { contains: search };

    const p = page ? parseInt(page) : 1;
    const ps = Math.min(pageSize ? parseInt(pageSize) : 30, 100);

    const [items, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        select: {
          id: true, type: true, stem: true,
          book: { select: { id: true, name: true } },
          options: { select: { label: true, content: true }, orderBy: { orderNo: 'asc' } },
          answerJson: mode === 'study', // study mode shows answer
        },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.question.count({ where }),
    ]);

    return { items, total, page: p, pageSize: ps };
  }

  /** 单题详情 */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { orderNo: 'asc' } },
        book: { select: { id: true, name: true } },
        aiExplanation: { select: { id: true, status: true } },
      },
    });
  }
}
