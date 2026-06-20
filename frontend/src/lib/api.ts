/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const cookieToken = document.cookie
      .split('; ')
      .find((item) => item.startsWith('accessToken='))
      ?.split('=')[1];
    return localStorage.getItem('accessToken') || (cookieToken ? decodeURIComponent(cookieToken) : null) || localStorage.getItem('token');
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
      delete headers['Content-Type']; // Let browser set multipart
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    return data;
  }

  get(path: string) {
    return this.fetch(path);
  }

  post(path: string, body?: any) {
    return this.fetch(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  patch(path: string, body?: any) {
    return this.fetch(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  put(path: string, body?: any) {
    return this.fetch(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(path: string) {
    return this.fetch(path, { method: 'DELETE' });
  }

  upload(path: string, formData: FormData) {
    return this.fetch(path, {
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiClient(API_BASE);
