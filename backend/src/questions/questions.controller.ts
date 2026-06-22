import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeQuestionAnswer } from '../common/utils/question-answer';

@Controller('questions')
export class QuestionsController {
  constructor(private prisma: PrismaService) {}

  /** 题目浏览器：支持筛选、搜索、分页 */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Query('bookId') bookId?: string,
    @Query('chapter') chapter?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('mode') mode?: string, // 'wrong' | 'correct' | 'all'
    @CurrentUser() user?: any,
    @CurrentUser('id') userId?: number,
  ) {
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    const where: any = isAdmin ? {} : { isPublished: true };
    if (bookId) where.bookId = parseInt(bookId);
    if (chapter) where.chapter = chapter;
    if (type) where.type = type;
    if (search) where.stem = { contains: search };

    const p = page ? parseInt(page) : 1;
    const ps = Math.min(pageSize ? parseInt(pageSize) : 50, 100);

    const [items, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        select: {
          id: true, type: true, stem: true,
          chapter: true, knowledgePoint: true, difficulty: true, courseObjective: true, score: true,
          book: { select: { id: true, name: true } },
          bank: { select: { id: true, name: true, sourceFile: true } },
          options: { select: { label: true, content: true }, orderBy: { orderNo: 'asc' } },
          answerRaw: isAdmin,
          answerJson: isAdmin || mode === 'study', // study/admin mode shows answer
        },
        orderBy: [{ bookId: 'asc' }, { orderNo: 'asc' }, { id: 'asc' }],
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.question.count({ where }),
    ]);

    if (!userId || items.length === 0) {
      return { items, total, page: p, pageSize: ps };
    }

    const records = await this.prisma.answerRecord.findMany({
      where: {
        userId,
        mode: 'QUIZ',
        questionId: { in: items.map((item) => item.id) },
        isCorrect: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { questionId: true, isCorrect: true },
    });
    const statusMap = new Map<number, 'correct' | 'wrong'>();
    for (const record of records) {
      if (!statusMap.has(record.questionId)) {
        statusMap.set(record.questionId, record.isCorrect === true ? 'correct' : 'wrong');
      }
    }

    return {
      items: items.map((item) => ({
        ...item,
        userStatus: statusMap.get(item.id) || 'unanswered',
      })),
      total,
      page: p,
      pageSize: ps,
    };
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
        bank: { select: { id: true, name: true } },
        aiExplanation: { select: { id: true, status: true } },
      },
    });
  }

  /** 管理端：编辑题目 */
  @Put(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { stem?: string; type?: string; answerRaw?: string; options?: { label: string; content: string }[] },
  ) {
    const { stem, type, answerRaw, options } = body;

    const existing = await this.prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { orderNo: 'asc' } } },
    });
    if (!existing) throw new BadRequestException('题目不存在');

    const nextType = type || existing.type;
    const nextOptions = options ?? existing.options.map((option) => ({
      label: option.label,
      content: option.content,
    }));
    const nextAnswerRaw = answerRaw !== undefined ? answerRaw : existing.answerRaw || '';
    const normalizedAnswer = normalizeQuestionAnswer(nextAnswerRaw, nextType, nextOptions);
    if (normalizedAnswer.errors.length > 0) {
      throw new BadRequestException(normalizedAnswer.errors.join('；'));
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (options) {
        await tx.option.deleteMany({ where: { questionId: id } });
        await tx.option.createMany({
          data: nextOptions.map((o, i) => ({
            questionId: id,
            label: o.label,
            content: o.content,
            orderNo: i + 1,
          })),
        });
      }

      return tx.question.update({
        where: { id },
        data: {
          ...(stem !== undefined ? { stem } : {}),
          ...(type !== undefined ? { type: type as any } : {}),
          answerRaw: normalizedAnswer.answerRaw,
          answerJson: normalizedAnswer.answerJson as any,
        },
        include: {
          options: { orderBy: { orderNo: 'asc' } },
          book: { select: { id: true, name: true } },
          bank: { select: { id: true, name: true, sourceFile: true } },
        },
      });
    });

    return { code: 0, data: updated };
  }
}
