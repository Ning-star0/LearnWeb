'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, BookOpen, Brain, CheckCircle2, Clock3, Play, Target, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const QUICK_ACTIONS = [
  { href: '/practice/select?mode=quiz&scope=all&order=random', title: '随机答题', desc: '直接进入答题模式，提交后自动判题。', icon: CheckCircle2 },
  { href: '/practice/select?mode=study&scope=all&order=random', title: '快速背题', desc: '先看答案，适合考前快速过一遍。', icon: Brain },
  { href: '/practice/select?scope=wrong&mode=quiz', title: '刷错题', desc: '集中处理还没掌握的题。', icon: Target },
  { href: '/practice/select?scope=review&mode=study', title: '背待背题', desc: '复习标记为没记住的题。', icon: Clock3 },
];

const GUIDE_CONTENT = `欢迎使用思政刷题系统！以下是快速上手指南：

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
· 请在「AI 订阅」页面上传付款截图，管理员审核后开通

⚠️ 关于 AI 解析费用
AI 解析需要调用大模型 API，每次调用都产生费用，成本较高。
如果大量用户同时使用，费用会非常昂贵，我们目前无法承担。
因此设置了试用次数和付费订阅机制，感谢理解。

💡 小提示
· 个人中心可查看学习进度和教材掌握情况
· 题库浏览中可按教材和题型筛选题目
· 点击顶栏「刷题」直接进入练习`;

interface Book {
  id: number; name: string;
  _count: { questions: number };
}

export default function HomePage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    api.get('/books').then((res) => { if (res.code === 0) setBooks(res.data); });
    // 首次访问自动弹出新人必读
    const dismissed = localStorage.getItem('guideDismissed');
    if (!dismissed) setShowGuide(true);
  }, []);

  const dismissGuide = () => {
    localStorage.setItem('guideDismissed', 'true');
    setShowGuide(false);
  };

  const dismissed = typeof window !== 'undefined' && localStorage.getItem('guideDismissed');

  const preferredBook = books.find((b) => b._count.questions > 0);
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
              <Link href={todayHref}><Button size="lg"><Play className="size-4" />开始学习</Button></Link>
            ) : (
              <>
                <Link href="/login"><Button size="lg">登录</Button></Link>
                <Link href="/register"><Button variant="outline" size="lg">注册</Button></Link>
              </>
            )}
            <Link href="/books"><Button variant="outline" size="lg"><BookOpen className="size-4" />选择教材</Button></Link>
          </div>
        </div>
      </section>

      {/* 新人必读提示条（已读后缩小） */}
      {dismissed && (
        <button
          onClick={() => setShowGuide(true)}
          className="mb-4 w-full rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-left text-sm text-blue-700 hover:bg-blue-50 flex items-center justify-between"
        >
          <span className="flex items-center gap-2"><Bell className="size-4" />新人必读 · 已读</span>
          <span className="text-xs text-blue-400">点击重新查看</span>
        </button>
      )}

      {/* 新人必读弹窗 */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bell className="size-5 text-blue-500" />新人必读</DialogTitle>
          </DialogHeader>
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {GUIDE_CONTENT}
          </div>
          <Button onClick={dismissGuide} className="w-full mt-4">我已阅读，不再显示</Button>
        </DialogContent>
      </Dialog>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition hover:-translate-y-0.5">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>{item.title}</span><Icon className="size-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{item.desc}</p></CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
