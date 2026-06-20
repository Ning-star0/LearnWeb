'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, BookOpen, Brain, CheckCircle2, Clock3, Play, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

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

interface Book {
  id: number;
  name: string;
  _count: { questions: number };
}

export default function HomePage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [announcement, setAnnouncement] = useState({
    enabled: true,
    title: '新人必读',
    content: `欢迎使用思政刷题系统！以下是快速上手指南：

📚 刷题模式
· 答题模式 — 先作答再判题，答错自动加入错题本
· 背题模式 — 直接显示答案，适合考前快速记忆

📖 题库范围
· 全部题库 — 从所有教材中随机抽题
· 按教材 — 选择一本教材集中练习
· 错题本 — 只刷之前答错的题
· 待背题 — 复习背题模式中标记"没记住"的题

🤖 AI 解析
· 首次使用有 5 次免费试用
· 试用完后需订阅（2.9元/月）方可继续使用
· 请在个人中心上传付款截图，管理员审核后开通

💡 小提示
· 个人中心可查看学习进度和教材掌握情况
· 题库浏览中可按教材和题型筛选题目
· 点击顶栏「刷题」直接进入练习`,
  });

  useEffect(() => {
    api.get('/settings/announcement').then((res) => {
      if (res.code === 0 && res.data) setAnnouncement(res.data);
    });
    api.get('/books').then((res) => {
      if (res.code === 0) setBooks(res.data);
    });
  }, []);

  const preferredBookId = typeof window !== 'undefined' ? localStorage.getItem('preferredBookId') : '';
  const preferredBook = books.find((book) => String(book.id) === preferredBookId && book._count.questions > 0)
    || books.find((book) => book._count.questions > 0);
  const todayHref = preferredBook
    ? `/practice?mode=quiz&scope=book&bookId=${preferredBook.id}&order=random`
    : '/practice?mode=quiz&scope=all&order=random';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <section className="mb-6 rounded-lg border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">思政刷题系统</Badge>
              <span className="text-xs text-muted-foreground">刷题、背题、错题复习</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">今日学习</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {preferredBook ? `默认教材：${preferredBook.name}` : '默认进入全部题库随机练习'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user ? (
              <Link href={todayHref}>
                <Button size="lg">
                  <Play className="size-4" />
                  开始学习
                </Button>
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
                选择教材
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {announcement.enabled && (
        <section id="announcement" className="mb-6 rounded-lg border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-blue-200 bg-white p-2 text-blue-700">
              <Bell className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-blue-950">{announcement.title || '复习公告'}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-blue-900">
                {announcement.content}
              </p>
            </div>
          </div>
        </section>
      )}

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
    </div>
  );
}
