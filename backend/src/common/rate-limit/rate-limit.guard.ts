import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);

export interface RateLimitConfig {
  points: number;
  duration: number;
  keyPrefix: string;
  keyFn?: (req: any) => string;
  /** 是否跳过 SUPER_ADMIN（默认 true） */
  skipSuperAdmin?: boolean;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<RateLimitConfig>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) return true;

    const request = context.switchToHttp().getRequest();

    // 管理员跳过应用层限流（除非显式禁用），保证后台操作优先可用。
    if (config.skipSuperAdmin !== false) {
      const user = request.user;
      const role = user?.role || this.getRoleFromAuthorization(request);
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') return true;
    }

    const key = this.buildKey(config, request);
    const current = await this.redisService.incr(key);

    if (current === 1) {
      await this.redisService.expire(key, config.duration);
    }

    if (current > config.points) {
      throw new HttpException(
        {
          code: -1,
          message: '请求过于频繁，请稍后再试',
          retryAfter: await this.redisService.ttl(key),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private buildKey(config: RateLimitConfig, request: any): string {
    if (config.keyFn) {
      return `rl:${config.keyPrefix}:${config.keyFn(request)}`;
    }
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    return `rl:${config.keyPrefix}:${ip}`;
  }

  private getRoleFromAuthorization(request: any): string | undefined {
    const header = request.headers?.authorization || '';
    const token = typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : '';
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
      return decoded?.role;
    } catch {
      return undefined;
    }
  }
}
