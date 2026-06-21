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
      activeSessions,
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
      this.prisma.session.findMany({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        select: {
          id: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          expiresAt: true,
          user: { select: { id: true, username: true, email: true, role: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
    ]);
    const onlineUserIds = new Set(activeSessions.map((session) => session.user.id));

    return {
      userCount,
      bookCount,
      bankCount,
      questionCount,
      todayAnswerCount,
      wrongCount,
      aiCount,
      supporterCount,
      onlineUserCount: onlineUserIds.size,
      activeSessionCount: activeSessions.length,
      activeSessions,
      recentBanks,
      recentUsers,
    };
  }
}
