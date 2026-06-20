'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { register, resendVerification } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = await register(email, password, username);
    if (result.success) {
      setPendingEmail(email);
      setMessage(result.message || '验证邮件已发送，请先完成邮箱确认。');
    } else {
      setError(result.message || '注册失败');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setError('');
    setMessage('');
    setResending(true);
    const result = await resendVerification(pendingEmail);
    if (result.success) {
      setMessage(result.message || '验证邮件已重新发送。');
    } else {
      setError(result.message || '重新发送失败');
    }
    setResending(false);
  };

  if (pendingEmail) {
    return (
      <div className="max-w-md mx-auto mt-20 px-4">
        <Card>
          <CardHeader>
            <CardTitle>确认邮箱</CardTitle>
            <CardDescription>验证邮件已发送到 {pendingEmail}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && <p className="text-sm text-green-600">{message}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-sm text-muted-foreground">
              点击邮件里的确认链接后，系统会自动完成登录。没有完成邮箱确认前，这个账号不会写入正式用户表，也不能登录。
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="button" className="w-full" onClick={handleResend} disabled={resending}>
              {resending ? '发送中...' : '重新发送验证邮件'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setPendingEmail('')}>
              修改注册信息
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <Card>
        <CardHeader>
          <CardTitle>注册</CardTitle>
          <CardDescription>创建账号后需要先确认邮箱</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码（至少8位）</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '注册中...' : '注册'}
            </Button>
            <p className="text-sm text-muted-foreground">
              已有账号？<Link href="/login" className="underline">登录</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
