'use client';

import Link from 'next/link';
import { BookOpen, Brain, CheckCircle2, Clock3, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';

const QUICK_ACTIONS = [
  {
    href: '/practice/select?mode=quiz&scope=all&order=random',
    title: '随机答题',
    desc: '直接进入答题模式，提交后自动判题。',
    icon: CheckCircle2,
  },
  {
    href: '/practice/select?mode=study&scope=all&order=random',
    title: '快速背题',
    desc: '先看答案，适合考前快速过一遍。',
    icon: Brain,
  },
  {
    href: '/practice/select?scope=wrong&mode=quiz',
    title: '刷错题',
    desc: '集中处理还没掌握的题。',
    icon: Target,
  },
  {
    href: '/practice/select?scope=review&mode=study',
    title: '背待背题',
    desc: '复习标记为没记住的题。',
    icon: Clock3,
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <section className="mb-6 rounded-lg border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">思政刷题系统</Badge>
              <span className="text-xs text-muted-foreground">刷题、背题、错题复习</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">今天从哪里开始？</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {user ? (
              <Link href="/practice/select">
                <Button size="lg">配置刷题</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg">登录</Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" size="lg">注册</Button>
                </Link>
              </>
            )}
            <Link href="/books">
              <Button variant="outline" size="lg">
                <BookOpen className="size-4" />
                教材
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:ring-foreground/25">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>{item.title}</span>
                    <Icon className="size-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="text-sm font-medium">背题模式</div>
          <p className="mt-1 text-sm text-muted-foreground">答案直接展示，适合建立记忆。</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="text-sm font-medium">答题模式</div>
          <p className="mt-1 text-sm text-muted-foreground">提交后判题，答错自动进入错题本。</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="text-sm font-medium">AI 解析</div>
          <p className="mt-1 text-sm text-muted-foreground">支持者和管理员可查看知识点、辨析和记忆方法。</p>
        </div>
      </section>
    </div>
  );
}
