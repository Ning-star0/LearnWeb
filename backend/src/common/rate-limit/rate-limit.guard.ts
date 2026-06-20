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
  points: number; // 请求次数
  duration: number; // 时间窗口（秒）
  keyPrefix: string; // Redis key 前缀
  keyFn?: (req: any) => string; // 自定义 key 生成函数
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

    if (!config) return true; // 没有限流配置直接放行

    const request = context.switchToHttp().getRequest();
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
}
