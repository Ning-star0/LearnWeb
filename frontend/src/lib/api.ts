/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const CACHE_PREFIX = 'api:v2:';
const CACHE_SECRET_KEY = 'apiCacheSecret';

/** 缓存规则：路径匹配 → TTL（秒） */
const CACHE_RULES: { pattern: RegExp; ttl: number }[] = [
  { pattern: /^\/books/, ttl: 1800 },       // 教材列表 30 分钟
  { pattern: /^\/settings\/announcements?/, ttl: 300 }, // 公告 5 分钟
  { pattern: /^\/questions/, ttl: 120 },     // 题库浏览 2 分钟
  { pattern: /^\/practice\/questions/, ttl: 60 }, // 练习题 1 分钟，避免答案修正后长时间 stale
  { pattern: /^\/users\/me\/stats/, ttl: 300 }, // 用户统计 5 分钟
  { pattern: /^\/payment\/status/, ttl: 120 },  // 支付状态 2 分钟
  { pattern: /^\/bookmarks/, ttl: 120 },     // 收藏列表 2 分钟
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
    return localStorage.getItem(TOKEN_KEY)
      || localStorage.getItem('token');
  }

  private getUserScope(): string {
    const token = this.getToken();
    if (!token) return 'public';
    try {
      const payload = token.split('.')[1];
      if (!payload) return 'public';
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));
      return decoded?.sub ? `user:${decoded.sub}` : 'public';
    } catch {
      return 'public';
    }
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  }

  private setAuthTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(accessToken)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    document.cookie = `${REFRESH_KEY}=${encodeURIComponent(refreshToken)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }

  private clearAuthTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${REFRESH_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }

  private async refreshAuthToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    const res = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      this.clearAuthTokens();
      return false;
    }
    const data = await res.json();
    if (data?.code === 0 && data.data?.accessToken && data.data?.refreshToken) {
      this.setAuthTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    }
    this.clearAuthTokens();
    return false;
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

    const method = (options.method || 'GET').toUpperCase();
    const skipLocalCache = method === 'GET' && options.cache === 'no-store';

    // GET 请求优先从缓存读取。no-store 用于后台发布后的强制刷新。
    if (method === 'GET' && typeof window !== 'undefined' && !skipLocalCache) {
      const cached = await this.getFromCache(path);
      if (cached) return cached;
    }

    let res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
      const refreshed = await this.refreshAuthToken();
      if (refreshed) {
        const nextToken = this.getToken();
        res = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: {
            ...headers,
            ...(nextToken ? { Authorization: `Bearer ${nextToken}` } : {}),
          },
        });
      }
    }

    const data = await res.json();

    // 缓存成功的 GET 响应
    if (method === 'GET' && data?.code === 0 && typeof window !== 'undefined' && !skipLocalCache) {
      await this.saveToCache(path, data);
    } else if (method !== 'GET' && data?.code === 0 && typeof window !== 'undefined') {
      this.clearMutationCache(path);
    }

    return data;
  }

  /** 清除匹配路径的缓存 */
  clearCache(pattern?: string) {
    if (typeof window === 'undefined') return;
    if (pattern) {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX) && k.includes(pattern));
      keys.forEach((k) => localStorage.removeItem(k));
    } else {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('api:'));
      keys.forEach((k) => localStorage.removeItem(k));
    }
  }

  private cacheKey(path: string) {
    return `${CACHE_PREFIX}${this.getUserScope()}:${path}`;
  }

  private async getFromCache(path: string): Promise<any | null> {
    const key = this.cacheKey(path);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const entry = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }
      if (!entry.encrypted) return entry.data;
      return await this.decryptCachePayload(entry.data, entry.iv);
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  private async saveToCache(path: string, data: any) {
    const ttl = getCacheTTL(path);
    if (ttl <= 0) return;
    const key = this.cacheKey(path);
    try {
      const encrypted = await this.encryptCachePayload(data);
      if (!encrypted) return;
      const entry = {
        encrypted: true,
        data: encrypted.data,
        iv: encrypted.iv,
        expiresAt: Date.now() + ttl * 1000,
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // localStorage 满了就清掉旧缓存
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
      keys.slice(0, Math.floor(keys.length / 2)).forEach((k) => localStorage.removeItem(k));
    }
  }

  private clearMutationCache(path: string) {
    if (path.startsWith('/practice/submit')) {
      this.clearCache('/practice/questions');
      this.clearCache('/wrong');
      this.clearCache('/review');
      return;
    }
    if (path.startsWith('/practice/study-action')) {
      this.clearCache('/practice/questions');
      this.clearCache('/review');
      return;
    }
    if (path.startsWith('/bookmarks')) {
      this.clearCache('/bookmarks');
      return;
    }
    if (path.startsWith('/questions') || path.startsWith('/admin/banks')) {
      this.clearCache('/questions');
      this.clearCache('/practice/questions');
      return;
    }
    if (path.startsWith('/admin/settings/announcement')) {
      this.clearCache('/settings/announcement');
      this.clearCache('/settings/announcements');
    }
  }

  private async getCacheCryptoKey() {
    if (!window.crypto?.subtle) return null;
    let secret = localStorage.getItem(CACHE_SECRET_KEY);
    if (!secret) {
      const bytes = window.crypto.getRandomValues(new Uint8Array(32));
      secret = this.bytesToBase64(bytes);
      localStorage.setItem(CACHE_SECRET_KEY, secret);
    }
    return window.crypto.subtle.importKey(
      'raw',
      this.base64ToBytes(secret),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  private async encryptCachePayload(data: any) {
    const key = await this.getCacheCryptoKey();
    if (!key) return null;
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(data));
    const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    return {
      data: this.bytesToBase64(new Uint8Array(ciphertext)),
      iv: this.bytesToBase64(iv),
    };
  }

  private async decryptCachePayload(data: string, iv: string) {
    const key = await this.getCacheCryptoKey();
    if (!key) return null;
    const plaintext = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.base64ToBytes(iv) },
      key,
      this.base64ToBytes(data),
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  private bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.slice(index, index + 0x8000));
    }
    return btoa(binary);
  }

  private base64ToBytes(value: string) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  get(path: string, options: RequestInit = {}) {
    return this.fetch(path, options);
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
