'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* 左侧装饰区 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <GraduationCap className="size-8" />
            思政刷题系统
          </Link>
          <div className="mt-16 space-y-6">
            <h2 className="text-3xl font-bold leading-tight">高效刷题<br />从容应考</h2>
            <div className="space-y-4 text-blue-100 text-sm leading-relaxed max-w-sm">
              <div className="flex items-start gap-3">
                <Sparkles className="size-5 mt-0.5 shrink-0" />
                <p>答题模式和背题模式自由切换，错题自动收集</p>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="size-5 mt-0.5 shrink-0" />
                <p>覆盖 5 本核心教材，持续更新题库</p>
              </div>
            </div>
          </div>
        </div>
        <p className="relative text-sm text-blue-200">© 2026 思政刷题系统</p>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-bold">登录</h1>
            <p className="mt-2 text-sm text-muted-foreground">登录后开始刷题，系统会记录你的学习进度</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">
                  忘记密码？
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            还没有账号？
            <Link href="/register" className="ml-1 font-medium text-blue-600 hover:underline">
              立即注册
            </Link>
          </div>

          {/* 测试账号提示 */}
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium mb-1">测试账号</p>
            <p>管理员：admin@example.com / Admin123456</p>
            <p>用户：user@example.com / User123456</p>
          </div>
        </div>
      </div>
    </div>
  );
}
