'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      router.push('/');
    } else {
      setError(result.message || '登录失败');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold mx-auto">
            <GraduationCap className="size-7 text-blue-600" />
            思政刷题系统
          </Link>
          <CardDescription className="mt-2">登录后开始刷题</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" placeholder="请输入邮箱" value={email}
                onChange={(e) => setEmail(e.target.value)} required className="h-10" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">忘记密码？</Link>
              </div>
              <Input id="password" type="password" placeholder="请输入密码" value={password}
                onChange={(e) => setPassword(e.target.value)} required className="h-10" />
            </div>
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-0">
            <p className="text-sm text-muted-foreground text-center">
              还没有账号？
              <Link href="/register" className="ml-1 font-medium text-blue-600 hover:underline">立即注册</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
