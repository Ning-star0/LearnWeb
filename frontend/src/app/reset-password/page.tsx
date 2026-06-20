'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { toast.error('缺少重置参数'); return; }
    setLoading(true);
    const res = await api.post('/auth/reset-password', { token, newPassword: password });
    if (res.code === 0) {
      toast.success('密码已重置，请重新登录');
      router.push('/login');
    } else {
      toast.error(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <Card>
        <CardHeader>
          <CardTitle>重置密码</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>新密码（至少 8 位）</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '提交中...' : '重置密码'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}

export default function ResetPasswordWrapper() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-20 px-4 text-center">加载中...</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
