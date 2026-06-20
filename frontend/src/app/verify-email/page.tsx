'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('缺少验证链接参数');
      return;
    }
    api.post('/auth/verify-email', { token }).then((res) => {
      if (res.code === 0) {
        setStatus('success');
        setMessage('邮箱验证成功！请登录。');
      } else {
        setStatus('error');
        setMessage(res.message || '验证失败');
      }
    });
  }, [token]);

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <Card>
        <CardHeader>
          <CardTitle>{status === 'loading' ? '验证中...' : status === 'success' ? '验证成功' : '验证失败'}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">{message}</p>
          {status === 'success' && (
            <Button onClick={() => router.push('/login')}>去登录</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailWrapper() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-20 px-4 text-center">加载中...</div>}>
      <VerifyEmailPage />
    </Suspense>
  );
}
