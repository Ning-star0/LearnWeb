'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail } = useAuth();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (verifyingRef.current) return;
    if (!token) {
      setStatus('error');
      setMessage('缺少验证链接参数');
      return;
    }

    verifyingRef.current = true;
    verifyEmail(token)
      .then((res) => {
        if (!res.success) {
          setStatus('error');
          setMessage(res.message || '验证失败');
          return;
        }

        setStatus('success');
        setMessage(res.message || '邮箱验证成功，正在进入系统。');
        setTimeout(() => router.replace('/'), 800);
      })
      .catch(() => {
        setStatus('error');
        setMessage('验证失败，请稍后重试');
      });
  }, [router, token, verifyEmail]);

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <Card>
        <CardHeader>
          <CardTitle>{status === 'loading' ? '验证中...' : status === 'success' ? '验证成功' : '验证失败'}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">{message}</p>
          {status === 'success' && (
            <Button onClick={() => router.replace('/')}>进入系统</Button>
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
