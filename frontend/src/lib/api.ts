/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/** 缓存规则：路径匹配 → TTL（秒） */
const CACHE_RULES: { pattern: RegExp; ttl: number }[] = [
  { pattern: /^\/books/, ttl: 1800 },       // 教材列表 30 分钟
  { pattern: /^\/questions/, ttl: 600 },     // 题目数据 10 分钟
  { pattern: /^\/users\/me\/stats/, ttl: 300 }, // 用户统计 5 分钟
  { pattern: /^\/payment\/status/, ttl: 120 },  // 支付状态 2 分钟
];

function getCacheTTL(path: string): number {
  for (const rule of CACHE_RULES) {
    if (rule.pattern.test(path)) return rule.ttl;
  }
  return 0; // 默认不缓存
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken')
      || localStorage.getItem('token');
  }

  async fetch(path: string, options: RequestInit = {}): Promise<any> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    } else {
      delete headers['Content-Type'];
    }

    // GET 请求优先从缓存读取
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'GET' && typeof window !== 'undefined') {
      const cached = this.getFromCache(path);
      if (cached) return cached;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    const data = await res.json();

    // 缓存成功的 GET 响应
    if (method === 'GET' && data?.code === 0 && typeof window !== 'undefined') {
      this.saveToCache(path, data);
    }

    return data;
  }

  /** 清除匹配路径的缓存 */
  clearCache(pattern?: string) {
    if (typeof window === 'undefined') return;
    if (pattern) {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('api:') && k.includes(pattern));
      keys.forEach((k) => localStorage.removeItem(k));
    } else {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('api:'));
      keys.forEach((k) => localStorage.removeItem(k));
    }
  }

  private cacheKey(path: string) {
    return `api:${path}`;
  }

  private getFromCache(path: string): any | null {
    const key = this.cacheKey(path);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const entry = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }
      return entry.data;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  private saveToCache(path: string, data: any) {
    const ttl = getCacheTTL(path);
    if (ttl <= 0) return;
    const key = this.cacheKey(path);
    const entry = {
      data,
      expiresAt: Date.now() + ttl * 1000,
    };
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // localStorage 满了就清掉旧缓存
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('api:'));
      keys.slice(0, Math.floor(keys.length / 2)).forEach((k) => localStorage.removeItem(k));
    }
  }

  get(path: string) {
    return this.fetch(path);
  }

  post(path: string, body?: any) {
    return this.fetch(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) });
  }

  patch(path: string, body?: any) {
    return this.fetch(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  put(path: string, body?: any) {
    return this.fetch(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete(path: string) {
    return this.fetch(path, { method: 'DELETE' });
  }

  upload(path: string, formData: FormData) {
    return this.fetch(path, { method: 'POST', body: formData });
  }
}

export const api = new ApiClient(API_BASE);
