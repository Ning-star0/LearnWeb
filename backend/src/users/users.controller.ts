import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser('id') userId: number) {
    return this.usersService.findMe(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateMe(userId, dto);
  }

  /** 用户学习统计 */
  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@CurrentUser('id') userId: number) {
    const [
      totalAnswers,
      correctAnswers,
      wrongCount,
      reviewCount,
      studyActions,
    ] = await Promise.all([
      this.prisma.answerRecord.count({ where: { userId } }),
      this.prisma.answerRecord.count({ where: { userId, isCorrect: true } }),
      this.prisma.wrongQuestion.count({ where: { userId, mastered: false } }),
      this.prisma.reviewQuestion.count({ where: { userId } }),
      this.prisma.answerRecord.count({ where: { userId, mode: 'STUDY' } }),
    ]);

    // 每本教材的进度
    const bookStats = await this.prisma.book.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { questions: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 每个教材用户答过的题
    const bookAnswers = await this.prisma.answerRecord.groupBy({
      by: ['questionId'],
      where: { userId, isCorrect: true },
    });
    const answeredQuestionIds = new Set(bookAnswers.map((a) => a.questionId));

    // 获取每个教材的题目 ID
    const booksWithProgress = await Promise.all(
      bookStats.map(async (book) => {
        const bookQuestions = await this.prisma.question.findMany({
          where: { bookId: book.id, isPublished: true },
          select: { id: true },
        });
        const done = bookQuestions.filter((q) => answeredQuestionIds.has(q.id)).length;
        return {
          id: book.id,
          name: book.name,
          total: book._count.questions,
          done,
          progress: book._count.questions > 0 ? Math.round((done / book._count.questions) * 100) : 0,
        };
      }),
    );

    // 会员状态
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdminRole = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    let membership = { isMember: isAdminRole, remaining: 0, trialUsed: 0, trialRemaining: 5, subscribed: false };
    if (!isAdminRole) {
      const approved = await this.prisma.paymentProof.findFirst({
        where: { userId, status: 'APPROVED' },
        orderBy: { reviewedAt: 'desc' },
      });
      if (approved?.reviewedAt) {
        const expiresAt = new Date(approved.reviewedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        const remaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
        membership = { isMember: remaining > 0, remaining, trialUsed: 0, trialRemaining: 0, subscribed: remaining > 0 };
      }
      if (!membership.isMember) {
        const trialCount = await this.prisma.trialUsage.count({ where: { userId } });
        membership = { isMember: false, remaining: 0, trialUsed: trialCount, trialRemaining: Math.max(0, 5 - trialCount), subscribed: false };
      }
    }

    return {
      totalAnswers,
      correctAnswers,
      wrongCount,
      reviewCount,
      studyActions,
      accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
      membership,
      books: booksWithProgress,
    };
  }
}
