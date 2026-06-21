'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, BookOpen, Brain, CheckCircle2, Clock3, Play, Target } from 'lucide-react';
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

interface Book {
  id: number; name: string;
  _count: { questions: number };
}

interface Announcement {
  enabled: boolean;
  title: string;
  content: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementRead, setAnnouncementRead] = useState(false);

  useEffect(() => {
    api.get('/books').then((res) => { if (res.code === 0) setBooks(res.data); });
    api.get('/settings/announcement').then((res) => {
      if (res.code !== 0 || !res.data?.enabled) return;
      const data = res.data as Announcement;
      const key = `announcementRead:${data.title}:${data.content}`;
      const read = localStorage.getItem(key) === 'true';
      setAnnouncement(data);
      setAnnouncementRead(read);
      if (!read) setShowAnnouncement(true);
    });
  }, []);

  const markAnnouncementRead = () => {
    if (announcement) {
      localStorage.setItem(`announcementRead:${announcement.title}:${announcement.content}`, 'true');
    }
    setAnnouncementRead(true);
    setShowAnnouncement(false);
  };

  const preferredBookId = typeof window !== 'undefined' ? localStorage.getItem('preferredBookId') : '';
  const preferredBook = books.find((book) => String(book.id) === preferredBookId && book._count.questions > 0)
    || books.find((book) => book._count.questions > 0);
  const todayHref = preferredBook
    ? `/practice?mode=quiz&scope=book&bookId=${preferredBook.id}&order=sequential`
    : '/practice?mode=quiz&scope=all&order=sequential';

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
              {preferredBook ? `默认教材：${preferredBook.name}` : '默认进入全部题库顺序练习'}
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

      {announcement && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-sm text-blue-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setShowAnnouncement(true)}
              className="flex min-w-0 items-center gap-2 text-left font-medium"
            >
              <Bell className="size-4 shrink-0" />
              <span className="truncate">{announcement.title}</span>
              {announcementRead && <Badge variant="outline" className="bg-white text-blue-700">已读</Badge>}
            </button>
            <Link href="/announcements" className="text-xs font-medium text-blue-700 hover:text-blue-900">
              查看历史公告
            </Link>
          </div>
          {!announcementRead && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-blue-700/80">{announcement.content}</p>
          )}
        </div>
      )}

      <Dialog open={showAnnouncement} onOpenChange={setShowAnnouncement}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-5 text-blue-500" />
              {announcement?.title || '公告'}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {announcement?.content}
          </div>
          <Button onClick={markAnnouncementRead} className="w-full mt-4">我已阅读</Button>
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
