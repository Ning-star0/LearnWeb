import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { SecurityService } from '../common/security/security.service';
import { MailService } from '../common/mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private securityService: SecurityService,
    private mailService: MailService,
  ) {}

  // ============================================================
  // 注册
  // ============================================================

  async register(dto: RegisterDto, ip: string, userAgent: string) {
    // 弱密码检测
    this.checkWeakPassword(dto.password);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      return { message: '如果邮箱可用，我们已经发送了验证邮件' };
    }

    const hashedPassword = await hash(dto.password, 12);

    // 生成验证 token
    const token = this.securityService.generateToken();
    const tokenHash = this.securityService.hashToken(token);

    await this.prisma.pendingRegistration.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        username: dto.username,
        passwordHash: hashedPassword,
        tokenHash,
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 分钟
      },
      update: {
        username: dto.username,
        passwordHash: hashedPassword,
        tokenHash,
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        usedAt: null,
      },
    });

    // 安全日志
    await this.securityService.log({
      email: dto.email,
      ip,
      userAgent,
      event: 'REGISTER',
    });

    // 发送验证邮件
    await this.mailService
      .sendVerificationEmail(dto.email, dto.username, token)
      .catch(() => {});

    // 返回通用消息
    return { message: '如果邮箱可用，我们已经发送了验证邮件' };
  }

  // ============================================================
  // 邮箱验证
  // ============================================================

  async verifyEmail(token: string, ip: string, userAgent: string) {
    const tokenHash = this.securityService.hashToken(token);

    const record = await this.prisma.pendingRegistration.findFirst({
      where: { tokenHash, usedAt: null },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('验证链接已过期或无效');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: record.email },
      });
      if (existing) {
        await tx.pendingRegistration.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });
        return existing;
      }

      const created = await tx.user.create({
        data: {
          email: record.email,
          username: record.username,
          password: record.passwordHash,
          status: 'ACTIVE',
        },
      });

      await tx.pendingRegistration.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      return created;
    });

    await this.securityService.log({
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      event: 'EMAIL_VERIFY_SUCCESS',
    });

    return { message: '邮箱验证成功，请登录' };
  }

  async resendVerification(email: string, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.status === 'ACTIVE') {
      return { message: '该邮箱已验证，请直接登录' };
    }

    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { email },
    });
    if (!pending || pending.usedAt) {
      return { message: '如果邮箱可用，我们已经发送了验证邮件' };
    }

    const token = this.securityService.generateToken();
    const tokenHash = this.securityService.hashToken(token);

    await this.prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        ip,
        userAgent,
      },
    });

    await this.securityService.log({
      email,
      ip,
      userAgent,
      event: 'EMAIL_VERIFY_SENT',
    });

    await this.mailService
      .sendVerificationEmail(email, pending.username, token)
      .catch(() => {});

    return { message: '如果邮箱可用，我们已经发送了验证邮件' };
  }

  // ============================================================
  // 登录
  // ============================================================

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // 统一错误消息，不区分邮箱不存在和密码错误
    const genericError = '邮箱或密码错误';

    if (!user || user.status === 'DELETED') {
      await this.securityService.log({
        email: dto.email,
        ip,
        userAgent,
        event: 'LOGIN_FAILED',
      });
      throw new UnauthorizedException(genericError);
    }

    if (user.status === 'DISABLED') {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (user.status === 'PENDING_VERIFY') {
      throw new UnauthorizedException('请先验证邮箱后再登录');
    }

    const valid = await compare(dto.password, user.password);
    if (!valid) {
      await this.securityService.log({
        userId: user.id,
        email: dto.email,
        ip,
        userAgent,
        event: 'LOGIN_FAILED',
      });

      // 管理员登录失败额外日志
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        await this.securityService.log({
          userId: user.id,
          email: dto.email,
          ip,
          userAgent,
          event: 'ADMIN_LOGIN_FAILED',
        });
      }

      throw new UnauthorizedException(genericError);
    }

    // 生成 Access Token + Refresh Token
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' },
    );

    const refreshToken = this.securityService.generateToken();
    const refreshTokenHash = this.securityService.hashToken(refreshToken);

    // 保存 Session
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.securityService.log({
      userId: user.id,
      email: dto.email,
      ip,
      userAgent,
      event: 'LOGIN_SUCCESS',
    });

    const { password, ...userResult } = user;
    return {
      accessToken,
      refreshToken,
      user: userResult,
      requiresVerification: false,
    };
  }

  // ============================================================
  // Refresh Token
  // ============================================================

  async refreshToken(oldRefreshToken: string, ip: string, userAgent: string) {
    const oldHash = this.securityService.hashToken(oldRefreshToken);

    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: oldHash, revokedAt: null },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('refresh token 已过期或无效');
    }

    if (
      session.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('账号状态异常');
    }

    // 轮换 refresh token：撤销旧 session，创建新的
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const newAccessToken = this.jwtService.sign(
      {
        sub: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      { expiresIn: '15m' },
    );

    const newRefreshToken = this.securityService.generateToken();
    const newRefreshTokenHash = this.securityService.hashToken(newRefreshToken);

    await this.prisma.session.create({
      data: {
        userId: session.userId,
        refreshTokenHash: newRefreshTokenHash,
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // ============================================================
  // 登出
  // ============================================================

  async logout(refreshToken: string) {
    const hash = this.securityService.hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash },
      data: { revokedAt: new Date() },
    });
    return { message: '已退出登录' };
  }

  async logoutAll(userId: number) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: '已退出所有设备' };
  }

  // ============================================================
  // 个人中心：管理 Session
  // ============================================================

  async getSessions(userId: number) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: number, sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
    return { message: '已退出该设备' };
  }

  // ============================================================
  // 密码安全
  // ============================================================

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
    ip: string,
  ) {
    this.checkWeakPassword(newPassword);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');

    const valid = await compare(oldPassword, user.password);
    if (!valid) throw new BadRequestException('旧密码错误');

    const hashedPassword = await hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // 注销所有其他 session
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.securityService.log({
      userId,
      email: user.email,
      ip,
      event: 'PASSWORD_CHANGED',
    });

    return { message: '密码修改成功，请重新登录' };
  }

  async requestPasswordReset(email: string, ip: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // 不泄露邮箱是否存在，统一返回
    if (user) {
      const token = this.securityService.generateToken();
      const tokenHash = this.securityService.hashToken(token);

      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      await this.securityService.log({
        userId: user.id,
        email,
        ip,
        event: 'PASSWORD_RESET_REQUEST',
      });

      await this.mailService
        .sendPasswordResetEmail(email, token)
        .catch(() => {});
    }

    return { message: '如果邮箱已注册，重置链接已发送' };
  }

  async resetPassword(token: string, newPassword: string, ip: string) {
    this.checkWeakPassword(newPassword);

    const tokenHash = this.securityService.hashToken(token);
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('重置链接已过期或无效');
    }

    await this.prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const hashedPassword = await hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    });

    // 注销所有 session
    await this.prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.securityService.log({
      userId: record.userId,
      ip,
      event: 'PASSWORD_CHANGED',
    });

    return { message: '密码重置成功，请重新登录' };
  }

  // ============================================================
  // 账号注销
  // ============================================================

  async deleteAccount(userId: number, ip: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');

    // 软删除：状态改为 DELETED，脱敏邮箱
    const deletedEmail = `deleted_${userId}@deleted.local`;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        email: deletedEmail,
        username: `已注销用户_${userId}`,
      },
    });

    // 注销所有 session
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.securityService.log({
      userId,
      email: user.email,
      ip,
      event: 'ACCOUNT_DELETED',
    });

    return { message: '账号已注销' };
  }

  // ============================================================
  // 获取当前用户
  // ============================================================

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === 'DELETED') {
      throw new UnauthorizedException('用户不存在');
    }
    const { password, ...result } = user;
    return result;
  }

  // ============================================================
  // 弱密码检测
  // ============================================================

  private checkWeakPassword(password: string) {
    const weakPasswords = [
      '12345678',
      'password',
      '123456789',
      'qwerty123',
      'abc12345',
      '11111111',
      'aaaaaaaa',
    ];
    if (weakPasswords.includes(password.toLowerCase())) {
      throw new BadRequestException('密码过于简单，请使用更安全的密码');
    }
    if (password.length < 8) {
      throw new BadRequestException('密码至少需要 8 位');
    }
  }
}
