import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class RiskService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  /** 检查 AI 查看是否异常 */
  async checkAiViewRisk(userId: number, ip: string) {
    const now = new Date();

    // 每分钟查看 > 20 次 → LOW
    const oneMinAgo = new Date(now.getTime() - 60 * 1000);
    const recentViews = await this.prisma.aiViewLog.count({
      where: { userId, createdAt: { gte: oneMinAgo } },
    });

    if (recentViews > 20) {
      await this.createRiskFlag(
        userId,
        ip,
        'AI_ABUSE',
        'LOW',
        `用户 1 分钟内查看 AI 解析 ${recentViews} 次`,
      );
    }

    // 10 分钟查看 > 150 次 → MEDIUM
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const tenMinViews = await this.prisma.aiViewLog.count({
      where: { userId, createdAt: { gte: tenMinAgo } },
    });

    if (tenMinViews > 150) {
      await this.createRiskFlag(
        userId,
        ip,
        'AI_ABUSE',
        'MEDIUM',
        `用户 10 分钟内查看 AI 解析 ${tenMinViews} 次`,
      );
    }

    // 1 天查看 > 1000 次 → HIGH
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dayViews = await this.prisma.aiViewLog.count({
      where: { userId, createdAt: { gte: oneDayAgo } },
    });

    if (dayViews > 1000) {
      await this.createRiskFlag(
        userId,
        ip,
        'AI_ABUSE',
        'HIGH',
        `用户 1 天内查看 AI 解析 ${dayViews} 次`,
      );
    }

    // IP 共享检测：不同用户同 IP
    const recentIps = await this.prisma.aiViewLog.findMany({
      where: { createdAt: { gte: tenMinAgo }, ip },
      select: { userId: true },
      distinct: ['userId'],
      take: 10,
    });
    if (recentIps.length > 3) {
      await this.createRiskFlag(
        userId,
        ip,
        'ACCOUNT_SHARING',
        'MEDIUM',
        `同 IP 在 10 分钟内被 ${recentIps.length} 个不同账号使用`,
      );
    }
  }

  /** 检查限流滥用 */
  async checkRateLimitAbuse(userId: number, ip: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRateLimited = await this.prisma.securityLog.count({
      where: {
        userId,
        event: 'RATE_LIMITED',
        createdAt: { gte: today },
      },
    });

    if (todayRateLimited > 20) {
      await this.createRiskFlag(
        userId,
        ip,
        'RATE_LIMIT_ABUSE',
        'HIGH',
        `用户今日触发限流 ${todayRateLimited} 次`,
      );
    }
  }

  /** 检查反馈刷屏 */
  async checkFeedbackSpam(userId: number, ip: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayFeedbacks = await this.prisma.feedback.count({
      where: { userId, createdAt: { gte: today } },
    });

    if (todayFeedbacks > 20) {
      await this.createRiskFlag(
        userId,
        ip,
        'FEEDBACK_SPAM',
        'MEDIUM',
        `用户今日提交反馈 ${todayFeedbacks} 条`,
      );
    }
  }

  /** 检查登录暴力破解 */
  async checkLoginBruteForce(email: string, ip: string) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const failedLogins = await this.prisma.securityLog.count({
      where: {
        ip,
        event: 'LOGIN_FAILED',
        createdAt: { gte: fiveMinAgo },
      },
    });

    if (failedLogins > 20) {
      const user = await this.prisma.user.findUnique({ where: { email } });
      await this.createRiskFlag(
        user?.id || undefined,
        ip,
        'LOGIN_BRUTE_FORCE',
        'HIGH',
        `IP ${ip} 5 分钟内登录失败 ${failedLogins} 次`,
      );
    }
  }

  /** 创建风险标记（去重） */
  private async createRiskFlag(
    userId: number | undefined,
    ip: string,
    type: string,
    level: string,
    reason: string,
  ) {
    // 检查是否已有相同风险标记
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existing = await this.prisma.userRiskFlag.findFirst({
      where: {
        userId: userId || undefined,
        ip,
        type: type as any,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (existing) return; // 1 小时内不重复创建

    return this.prisma.userRiskFlag.create({
      data: {
        userId,
        ip,
        type: type as any,
        level: level as any,
        reason,
      },
    });
  }
}
