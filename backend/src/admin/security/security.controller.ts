import {
  Controller,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminSecurityController {
  constructor(private prisma: PrismaService) {}

  /** 风险标记列表 */
  @Get('risk-flags')
  async findAllRiskFlags(
    @Query('type') type?: string,
    @Query('level') level?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const where: any = {};
    if (type) where.type = type;
    if (level) where.level = level;
    if (status) where.status = status;

    const p = page ? parseInt(page) : 1;
    const ps = Math.min(pageSize ? parseInt(pageSize) : 50, 200);

    const [items, total] = await Promise.all([
      this.prisma.userRiskFlag.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, username: true, status: true },
          },
          handler: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.userRiskFlag.count({ where }),
    ]);

    return { items, total, page: p, pageSize: ps };
  }

  /** 用户的风险记录 */
  @Get('users/:id/risk-flags')
  async findUserRiskFlags(@Param('id', ParseIntPipe) userId: number) {
    return this.prisma.userRiskFlag.findMany({
      where: { userId },
      include: { handler: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 标记风险已处理 */
  @Patch('risk-flags/:id/resolve')
  async resolveRiskFlag(
    @Param('id') id: string,
    @CurrentUser('id') adminId: number,
  ) {
    return this.prisma.userRiskFlag.update({
      where: { id },
      data: { status: 'RESOLVED', handledBy: adminId, handledAt: new Date() },
    });
  }

  /** 安全统计 */
  @Get('security/stats')
  async securityStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      aiViewCount,
      aiGenCount,
      totalAiExplanations,
      aiGenToday,
      rateLimitedToday,
      highRiskCount,
      pendingFeedback,
      supporterCount,
    ] = await Promise.all([
      this.prisma.aiViewLog.count(),
      this.prisma.aiGenerationLog.count(),
      this.prisma.questionAiExplanation.count(),
      this.prisma.aiGenerationLog.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.securityLog.count({
        where: { event: 'RATE_LIMITED', createdAt: { gte: today } },
      }),
      this.prisma.userRiskFlag.count({
        where: { level: { in: ['HIGH', 'CRITICAL'] }, status: 'OPEN' },
      }),
      this.prisma.feedback.count({ where: { status: 'PENDING' } }),
      this.prisma.supporterAccess.count(),
    ]);

    const cacheHitRate =
      aiViewCount > 0
        ? (((aiViewCount - aiGenToday) / aiViewCount) * 100).toFixed(1)
        : '0';

    return {
      todayAiViews: aiViewCount,
      aiViewTotal: aiViewCount,
      aiGenTotal: totalAiExplanations,
      todayAiGenerations: aiGenToday,
      cacheHitRate: `${cacheHitRate}%`,
      todayRateLimited: rateLimitedToday,
      highRiskUsers: highRiskCount,
      pendingFeedback,
      supporterCount,
    };
  }
}
