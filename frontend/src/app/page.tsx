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
  id: string;
  enabled: boolean;
  title: string;
  content: string;
  pinned?: boolean;
  createdAt?: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/books').then((res) => {
      if (res.code !== 0) return;
      const list = res.data as Book[];
      const storedBookId = localStorage.getItem('preferredBookId') || '';
      const storedBook = list.find((book) => String(book.id) === storedBookId && book._count.questions > 0);
      const fallbackBook = list.find((book) => book._count.questions > 0);
      const nextBookId = String((storedBook || fallbackBook)?.id || '');

      setBooks(list);
      setSelectedBookId(nextBookId);
      if (nextBookId && nextBookId !== storedBookId) {
        localStorage.setItem('preferredBookId', nextBookId);
      }
    });
    api.get('/settings/announcements').then((res) => {
      if (res.code !== 0 || !Array.isArray(res.data)) return;
      const list = (res.data as Announcement[]).filter((item) => item.enabled);
      const readIds = new Set(
        list
          .filter((item) => localStorage.getItem(`announcementRead:${item.id}`) === 'true')
          .map((item) => item.id),
      );
      const unread = list.filter((item) => !readIds.has(item.id));
      const displayList = unread.length > 0
        ? unread
        : list.filter((item) => item.pinned).slice(0, 1).concat(list.filter((item) => !item.pinned).slice(0, 1)).slice(0, 1);
      setAnnouncements(displayList);
      setAnnouncement(displayList[0] || null);
      setReadAnnouncementIds(readIds);
      if (unread.length > 0 && displayList[0]) setShowAnnouncement(true);
    });
  }, []);

  const markAnnouncementRead = () => {
    if (announcement) {
      localStorage.setItem(`announcementRead:${announcement.id}`, 'true');
      setReadAnnouncementIds((current) => new Set(current).add(announcement.id));
    }
    const nextUnread = announcements.find((item) => item.id !== announcement?.id && !readAnnouncementIds.has(item.id));
    if (nextUnread) {
      setAnnouncement(nextUnread);
    } else {
      setShowAnnouncement(false);
    }
  };

  const preferredBook = books.find((book) => String(book.id) === selectedBookId && book._count.questions > 0)
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
              <Badge variant="secondary">思政学习系统</Badge>
              <span className="text-xs text-muted-foreground">练习、背题、错题复习</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">今日学习</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {preferredBook ? `当前选择教材：${preferredBook.name}` : '当前未选择教材，可先进入全部题库顺序练习'}
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

      {announcements.length > 0 && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-sm text-blue-800">
          <div className="flex flex-col gap-2">
            {announcements.map((item) => {
              const read = readAnnouncementIds.has(item.id);
              return (
                <div key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => { setAnnouncement(item); setShowAnnouncement(true); }}
                    className="flex min-w-0 items-center gap-2 text-left font-medium"
                  >
                    <Bell className="size-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    {item.pinned && <Badge variant="outline" className="bg-white text-blue-700">置顶</Badge>}
                    {read && <Badge variant="outline" className="bg-white text-blue-700">已读</Badge>}
                  </button>
                  {!read && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-blue-700/80 sm:hidden">{item.content}</p>
                  )}
                </div>
              );
            })}
            <Link href="/announcements" className="text-xs font-medium text-blue-700 hover:text-blue-900">
              查看历史公告
            </Link>
          </div>
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
