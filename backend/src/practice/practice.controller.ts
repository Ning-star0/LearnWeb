import { Controller, Get, Post, Delete, Param, ParseIntPipe, Body, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PracticeService } from './practice.service';

@Controller()
export class PracticeController {
  constructor(
    private practiceService: PracticeService,
    private prisma: PrismaService,
  ) {}

  @Get('practice/questions')
  @UseGuards(JwtAuthGuard)
  async getQuestions(
    @CurrentUser('id') userId: number,
    @Query() query: any,
  ) {
    return this.practiceService.getQuestions({
      userId,
      ...query,
      bookId: parseOptionalInt(query.bookId),
      limit: parseOptionalInt(query.limit),
      restart: query.restart === true || query.restart === 'true' || query.restart === '1',
      ids: parseIds(query.ids),
    });
  }

  @Post('practice/study-action')
  @UseGuards(JwtAuthGuard)
  async studyAction(
    @CurrentUser('id') userId: number,
    @Body() body: { questionId: number; action: 'remembered' | 'not_remembered' },
  ) {
    return this.practiceService.studyAction(userId, body.questionId, body.action);
  }

  @Post('practice/submit')
  @UseGuards(JwtAuthGuard)
  async submitQuiz(
    @CurrentUser('id') userId: number,
    @Body() body: { questionId: number; userAnswer: any },
  ) {
    return this.practiceService.submitQuiz(userId, body.questionId, body.userAnswer);
  }

  @Get('wrong')
  @UseGuards(JwtAuthGuard)
  async getWrong(@CurrentUser('id') userId: number) {
    return this.prisma.wrongQuestion.findMany({
      where: { userId, mastered: false },
      include: {
        question: {
          include: {
            options: { orderBy: { orderNo: 'asc' } },
            book: { select: { id: true, name: true } },
            bank: { select: { id: true, name: true, sourceFile: true } },
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  @Delete('wrong/:questionId')
  @UseGuards(JwtAuthGuard)
  async removeWrong(
    @CurrentUser('id') userId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    await this.prisma.wrongQuestion.deleteMany({ where: { userId, questionId } });
    return { success: true };
  }

  @Get('review')
  @UseGuards(JwtAuthGuard)
  async getReview(@CurrentUser('id') userId: number) {
    return this.prisma.reviewQuestion.findMany({
      where: { userId },
      include: {
        question: { include: { book: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('study/remembered-shorts')
  @UseGuards(JwtAuthGuard)
  async getRememberedShorts(@CurrentUser('id') userId: number) {
    return this.practiceService.getRememberedShortQuestions(userId);
  }

  @Delete('review/:questionId')
  @UseGuards(JwtAuthGuard)
  async removeReview(
    @CurrentUser('id') userId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    await this.prisma.reviewQuestion.deleteMany({ where: { userId, questionId } });
    return { success: true };
  }

  /** 练习历史：查看自己做对的题 */
  @Get('practice/history')
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page) : 1;
    const ps = Math.min(pageSize ? parseInt(pageSize) : 30, 100);
    const [items, total] = await Promise.all([
      this.prisma.answerRecord.findMany({
        where: { userId, isCorrect: true },
        include: { question: { include: { options: { orderBy: { orderNo: 'asc' } }, book: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: 'desc' }, distinct: ['questionId'], skip: (p - 1) * ps, take: ps,
      }),
      this.prisma.answerRecord.groupBy({ by: ['questionId'], where: { userId, isCorrect: true }, _count: true }),
    ]);
    return { items, total: total.length, page: p, pageSize: ps };
  }

  // ======== 收藏功能 ========

  @Post('bookmarks/:questionId')
  @UseGuards(JwtAuthGuard)
  async addBookmark(
    @CurrentUser('id') userId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    await this.prisma.userBookmark.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: { userId, questionId },
      update: {},
    });
    return { success: true };
  }

  @Delete('bookmarks/:questionId')
  @UseGuards(JwtAuthGuard)
  async removeBookmark(
    @CurrentUser('id') userId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    await this.prisma.userBookmark.deleteMany({ where: { userId, questionId } });
    return { success: true };
  }

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  async getBookmarks(@CurrentUser('id') userId: number) {
    return this.prisma.userBookmark.findMany({
      where: { userId },
      include: { question: { include: { book: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

function parseOptionalInt(value: unknown) {
  if (value === undefined || value === null || value === '' || value === '_all') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIds(value: unknown) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseIds(item) || []);
  }
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const ids = value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
  return ids.length > 0 ? ids : undefined;
}
