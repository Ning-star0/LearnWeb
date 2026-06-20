import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminSupportersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.supporterAccess.findMany({
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async grant(
    adminId: number,
    data: { userId: number; source?: string; amount?: number; note?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) throw new NotFoundException('用户不存在');

    // 检查是否已有支持者权限
    const existing = await this.prisma.supporterAccess.findFirst({
      where: { userId: data.userId, type: 'LIFETIME_AI_EXPLANATION' },
    });
    if (existing) throw new NotFoundException('该用户已有支持者权限');

    const access = await this.prisma.supporterAccess.create({
      data: {
        userId: data.userId,
        type: 'LIFETIME_AI_EXPLANATION',
        source: (data.source as any) || 'MANUAL',
        amount: data.amount || 0,
        note: data.note || '',
      },
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'GRANT_SUPPORTER',
        target: `User:${data.userId}`,
        detail: `开通支持者权限, 金额: ${data.amount || 0}, 备注: ${data.note || ''}`,
      },
    });

    return access;
  }

  async revoke(adminId: number, userId: number) {
    const existing = await this.prisma.supporterAccess.findFirst({
      where: { userId, type: 'LIFETIME_AI_EXPLANATION' },
    });
    if (!existing) throw new NotFoundException('该用户没有支持者权限');

    await this.prisma.supporterAccess.delete({ where: { id: existing.id } });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'REVOKE_SUPPORTER',
        target: `User:${userId}`,
        detail: '取消支持者权限',
      },
    });

    return { deleted: true };
  }
}
