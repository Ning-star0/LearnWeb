import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    role?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { email: { contains: params.search } },
        { username: { contains: params.search } },
      ];
    }
    if (params.role) where.role = params.role;

    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              answerRecords: true,
              wrongQuestions: true,
              supporterAccesses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            answerRecords: true,
            wrongQuestions: true,
            reviewQuestions: true,
            supporterAccesses: true,
          },
        },
        supporterAccesses: true,
      },
    });
    if (!user) throw new NotFoundException('用户不存在');

    const answerStats = await this.prisma.answerRecord.groupBy({
      by: ['isCorrect'],
      where: { userId: id },
      _count: true,
    });

    return { ...user, answerStats };
  }

  async updateRole(
    adminId: number,
    userId: number,
    role: string,
    currentAdminRole: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    // ADMIN 不能修改 SUPER_ADMIN 的角色
    if (user.role === 'SUPER_ADMIN' && currentAdminRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('不能修改超级管理员的角色');
    }

    // 只有 SUPER_ADMIN 可以设置 SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && currentAdminRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('只有超级管理员可以设置超级管理员角色');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: { id: true, email: true, username: true, role: true },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_USER_ROLE',
        target: `User:${userId}`,
        detail: `修改角色: ${user.role} → ${role}`,
      },
    });

    return updated;
  }

  async updateStatus(adminId: number, userId: number, status: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('不能禁用超级管理员');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: status as any },
      select: { id: true, email: true, username: true, status: true },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: status === 'DISABLED' ? 'DISABLE_USER' : 'ENABLE_USER',
        target: `User:${userId}`,
        detail: `状态变更为: ${status}`,
      },
    });

    return updated;
  }

  async remove(adminId: number, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('不能删除超级管理员');
    }

    await this.prisma.user.delete({ where: { id: userId } });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_USER',
        target: `User:${userId}`,
        detail: `删除用户: ${user.email}`,
      },
    });

    return { deleted: true };
  }

  async suspend(
    adminId: number,
    userId: number,
    hours: number,
    reason?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 'SUPER_ADMIN')
      throw new ForbiddenException('不能限制超级管理员');
    if (userId === adminId) throw new ForbiddenException('不能限制自己');

    const suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
        suspendedUntil,
        banReason: reason || `管理员临时限制 ${hours} 小时`,
      },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        suspendedUntil: true,
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'SUSPEND_USER',
        target: `User:${userId}`,
        detail: `临时限制 ${hours} 小时, 原因: ${reason || '未指定'}`,
      },
    });

    return updated;
  }

  async unsuspend(adminId: number, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (userId === adminId) throw new ForbiddenException('不能操作自己');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', suspendedUntil: null, banReason: null },
      select: { id: true, email: true, username: true, status: true },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UNSUSPEND_USER',
        target: `User:${userId}`,
        detail: '解除限制',
      },
    });

    return updated;
  }

  async ban(adminId: number, userId: number, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 'SUPER_ADMIN')
      throw new ForbiddenException('不能封禁超级管理员');
    if (userId === adminId) throw new ForbiddenException('不能封禁自己');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'BANNED',
        banReason: reason || '违反使用规则',
      },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        banReason: true,
      },
    });

    // 注销该用户所有 session
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'BAN_USER',
        target: `User:${userId}`,
        detail: `封禁用户, 原因: ${reason || '未指定'}`,
      },
    });

    return updated;
  }

  async unban(adminId: number, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (userId === adminId) throw new ForbiddenException('不能操作自己');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', banReason: null },
      select: { id: true, email: true, username: true, status: true },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UNBAN_USER',
        target: `User:${userId}`,
        detail: '解封用户',
      },
    });

    return updated;
  }
}
