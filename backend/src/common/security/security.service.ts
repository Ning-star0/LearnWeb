import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SecurityService {
  constructor(private prisma: PrismaService) {}

  /** 计算 SHA-256 hash（用于 token 存储） */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** 生成随机 token */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /** 写入安全日志 */
  async log(params: {
    userId?: number;
    email?: string;
    ip?: string;
    userAgent?: string;
    event: string;
    detail?: any;
  }) {
    // 敏感字段脱敏
    const safeDetail = params.detail
      ? this.sanitizeDetail(params.detail)
      : undefined;

    return this.prisma.securityLog.create({
      data: {
        userId: params.userId,
        email: params.email,
        ip: params.ip,
        userAgent: params.userAgent,
        event: params.event as any,
        detail: safeDetail,
      },
    });
  }

  /** 获取客户端真实 IP */
  getClientIp(request: any): string {
    return (
      request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers?.['x-real-ip'] ||
      request.ip ||
      request.connection?.remoteAddress ||
      'unknown'
    );
  }

  /** 脱敏敏感字段，确保日志不含密码/token */
  private sanitizeDetail(detail: any): any {
    if (!detail) return detail;
    const safe = { ...detail };
    const sensitiveKeys = [
      'password',
      'token',
      'refreshToken',
      'apiKey',
      'accessToken',
    ];
    for (const key of sensitiveKeys) {
      if (safe[key]) safe[key] = '[REDACTED]';
    }
    return safe;
  }
}
