'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Brain, CheckCircle2, Clock3, ListChecks, Shuffle, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Book {
  id: number; name: string;
  _count: { questions: number };
}

const TYPE_OPTIONS = [
  { value: '', label: '全部题型' },
  { value: 'SINGLE', label: '单选题' }, { value: 'MULTIPLE', label: '多选题' },
  { value: 'JUDGE', label: '判断题' }, { value: 'SHORT', label: '简答题' },
];

const ORDER_OPTIONS = [
  { value: 'random', label: '随机排序' },
  { value: 'sequential', label: '顺序排列' },
];

const SCOPE_OPTIONS = [
  { value: 'all', label: '全部题库', icon: Shuffle },
  { value: 'book', label: '按教材', icon: BookOpen },
  { value: 'wrong', label: '错题本', icon: Target },
  { value: 'review', label: '待背题', icon: Clock3 },
];

function PracticeSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const initialBookId = searchParams.get('bookId') || '';
  const [books, setBooks] = useState<Book[]>([]);
  const [scope, setScope] = useState(searchParams.get('scope') || (initialBookId ? 'book' : 'all'));
  const [bookId, setBookId] = useState(initialBookId);
  const [mode, setMode] = useState(searchParams.get('mode') || 'quiz');
  const [type, setType] = useState(normalizeTypeParam(searchParams.get('type')));
  const [order, setOrder] = useState(searchParams.get('order') || 'random');

  useEffect(() => {
    api.get('/books').then((res) => {
      if (res.code === 0) setBooks(res.data);
    });
  }, []);

  const selectedBook = useMemo(
    () => books.find((book) => String(book.id) === bookId), [books, bookId],
  );

  const needsBook = scope === 'book' && !bookId;
  const canStart = !needsBook;

  const handleStart = () => {
    if (!canStart) return;
    const params = new URLSearchParams();
    params.set('mode', mode); params.set('scope', scope);
    if (scope === 'book' && bookId) params.set('bookId', bookId);
    if (type) params.set('type', type);
    params.set('order', order);
    router.push(`/practice?${params.toString()}`);
  };

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10 text-center">加载中...</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">登录后开始刷题</h1>
        <p className="mt-2 text-sm text-muted-foreground">系统会记录错题和待背题。</p>
        <Button className="mt-6" onClick={() => router.push('/login')}>去登录</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">选择本次练习</h1>
          {needsBook && (
            <p className="mt-1 text-sm text-destructive">请选择左侧教材后开始按教材刷题。</p>
          )}
        </div>
        <Button onClick={handleStart} disabled={!canStart} size="lg">开始刷题</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* 左侧：教材选择 + 答题模式 + 排序 */}
        <div className="space-y-5">
          {/* 教材选择 */}
          <section>
            <h2 className="mb-3 text-sm font-medium">选择教材</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => {
                const active = scope === 'book' && String(book.id) === bookId;
                return (
                  <button
                    key={book.id} type="button"
                    onClick={() => { setBookId(String(book.id)); setScope('book'); }}
                    className={`rounded-lg border p-3 text-left transition ${
                      active
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-border bg-card hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${active ? 'text-blue-700' : ''}`}>{book.name}</span>
                      <Badge variant={active ? 'default' : 'secondary'} className="shrink-0">{book._count.questions} 题</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 答题模式 */}
          <section>
            <h2 className="mb-3 text-sm font-medium">答题模式</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: 'quiz', label: '答题模式', desc: '先作答再判题，答错自动进入错题本', icon: CheckCircle2 },
                { value: 'study', label: '背题模式', desc: '直接显示答案，适合快速记忆', icon: Brain },
              ].map((item) => {
                const Icon = item.icon;
                const active = mode === item.value;
                return (
                  <button key={item.value} type="button" onClick={() => setMode(item.value)}
                    className={`rounded-lg border p-4 text-left transition ${
                      active ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                        : 'border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`mt-0.5 size-4 ${active ? 'text-emerald-600' : ''}`} />
                      <div>
                        <div className={`font-medium ${active ? 'text-emerald-800' : ''}`}>{item.label}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 题型 + 排序方式 */}
          <section className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[minmax(0,1fr)_14rem]">
            <div>
              <div className="text-sm font-medium">题型</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((item) => {
                  const active = type === item.value;
                  return (
                    <button
                      key={item.value || 'all'}
                      type="button"
                      onClick={() => setType(item.value)}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        active
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                          : 'border-border hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">排序方式</div>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-1">
                {ORDER_OPTIONS.map((item) => {
                  const active = order === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setOrder(item.value)}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-border hover:border-slate-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* 右侧：刷题范围 + 摘要 */}
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">刷题范围</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {SCOPE_OPTIONS.map((item) => {
                const active = scope === item.value;
                const Icon = item.icon;
                return (
                  <button key={item.value} type="button" onClick={() => setScope(item.value)}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition flex items-center justify-between ${
                      active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-border hover:border-blue-300'
                    }`}>
                    <span className={`flex items-center gap-2 ${active ? 'font-medium text-blue-700' : ''}`}>
                      <Icon className="size-4" />
                      {item.label}
                    </span>
                    {active && <div className="size-2 rounded-full bg-blue-500" />}
                  </button>
                );
              })}
              {needsBook && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  当前范围需要先选择一本教材。
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ListChecks className="size-4" />本次练习</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">教材</span>
                <span className={needsBook ? 'text-destructive' : ''}>
                  {scope === 'book' ? selectedBook?.name || '未选择' : '不限'}
                </span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">模式</span>
                <span>{mode === 'quiz' ? '答题模式' : '背题模式'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">题型</span>
                <span>{TYPE_OPTIONS.find((t) => t.value === type)?.label || '全部题型'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">排序</span>
                <span>{order === 'random' ? '随机' : '顺序'}</span></div>
              <Button className="w-full mt-3" onClick={handleStart} disabled={!canStart}>开始刷题</Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default function PracticeSelectWrapper() {
  return <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 text-center">加载中...</div>}>
    <PracticeSelectPage /></Suspense>;
}

function normalizeTypeParam(value: string | null) {
  if (!value || value === '_all' || value === 'all') return '';
  return TYPE_OPTIONS.some((item) => item.value === value) ? value : '';
}
