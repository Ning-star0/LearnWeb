import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  async dashboard() {
    const [
      userCount,
      bookCount,
      bankCount,
      questionCount,
      todayAnswerCount,
      wrongCount,
      aiCount,
      supporterCount,
      recentBanks,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.book.count(),
      this.prisma.questionBank.count(),
      this.prisma.question.count(),
      this.prisma.answerRecord.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.wrongQuestion.count({ where: { mastered: false } }),
      this.prisma.questionAiExplanation.count(),
      this.prisma.supporterAccess.count(),
      this.prisma.questionBank.findMany({
        include: { book: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.user.findMany({
        select: { id: true, username: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      userCount,
      bookCount,
      bankCount,
      questionCount,
      todayAnswerCount,
      wrongCount,
      aiCount,
      supporterCount,
      recentBanks,
      recentUsers,
    };
  }
}
