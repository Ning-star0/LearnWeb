import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private _redis: Redis | null = null;
  private _available = false;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this._redis = new Redis(url, {
      maxRetriesPerRequest: 0,
      retryStrategy() {
        return null;
      },
      lazyConnect: true,
      connectTimeout: 2000,
      enableOfflineQueue: false,
    });

    this._redis
      .connect()
      .then(() => {
        this._available = true;
        console.log('✅ Redis 已连接');
      })
      .catch(() => {
        this._available = false;
        console.warn('⚠️ Redis 未运行，限流功能降级：所有请求不受限制');
      });
  }

  /** Redis 是否可用 */
  get available(): boolean {
    return this._available && this._redis?.status === 'ready';
  }

  async get(key: string): Promise<string | null> {
    if (!this.available) return null;
    try {
      return await this._redis!.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.available) return;
    try {
      if (ttlSeconds) await this._redis!.set(key, value, 'EX', ttlSeconds);
      else await this._redis!.set(key, value);
    } catch {}
  }

  async incr(key: string): Promise<number> {
    if (!this.available) return 0; // Redis 不可用时返回 0（不限流）
    try {
      return await this._redis!.incr(key);
    } catch {
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.available) return;
    try {
      await this._redis!.expire(key, seconds);
    } catch {}
  }

  async del(key: string): Promise<void> {
    if (!this.available) return;
    try {
      await this._redis!.del(key);
    } catch {}
  }

  async ttl(key: string): Promise<number> {
    if (!this.available) return -2;
    try {
      return await this._redis!.ttl(key);
    } catch {
      return -2;
    }
  }

  async lock(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.available) return true; // Redis 不可用时跳过锁
    try {
      const result = await this._redis!.call(
        'SET',
        key,
        '1',
        'NX',
        'EX',
        ttlSeconds,
      );
      return result === 'OK';
    } catch {
      return true;
    }
  }

  async unlock(key: string): Promise<void> {
    if (!this.available) return;
    try {
      await this._redis!.del(key);
    } catch {}
  }

  async onModuleDestroy() {
    this._available = false;
    await this._redis?.quit().catch(() => {});
  }
}
