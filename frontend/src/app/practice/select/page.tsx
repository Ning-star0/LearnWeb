'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Brain, CheckCircle2, CircleHelp, Clock3, ListChecks, Shuffle, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Book {
  id: number;
  name: string;
  _count: { questions: number };
}

const SCOPE_OPTIONS = [
  { value: 'all', label: '全部题库', desc: '从所有已发布题目中抽取', icon: Shuffle },
  { value: 'book', label: '按教材', desc: '集中刷一本教材', icon: BookOpen },
  { value: 'wrong', label: '错题本', desc: '只练还没掌握的错题', icon: Target },
  { value: 'review', label: '待背题', desc: '复习没记住的题', icon: Clock3 },
];

const MODE_OPTIONS = [
  { value: 'quiz', label: '答题模式', desc: '先作答，再判题', icon: CheckCircle2 },
  { value: 'study', label: '背题模式', desc: '先看答案，快速记忆', icon: Brain },
];

const TYPE_OPTIONS = [
  { value: '', label: '全部题型' },
  { value: 'SINGLE', label: '单选题' },
  { value: 'MULTIPLE', label: '多选题' },
  { value: 'JUDGE', label: '判断题' },
  { value: 'SHORT', label: '简答题' },
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
  const [type, setType] = useState(searchParams.get('type') || '');
  const [order, setOrder] = useState(searchParams.get('order') || 'random');

  useEffect(() => {
    api.get('/books').then((res) => {
      if (res.code === 0) setBooks(res.data);
    });
  }, []);

  const selectedBook = useMemo(
    () => books.find((book) => String(book.id) === bookId),
    [books, bookId],
  );

  const selectedScope = SCOPE_OPTIONS.find((item) => item.value === scope);
  const selectedMode = MODE_OPTIONS.find((item) => item.value === mode);
  const canStart = scope !== 'book' || Boolean(bookId);

  const handleStart = () => {
    if (!canStart) return;
    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('scope', scope);
    if (scope === 'book' && bookId) params.set('bookId', bookId);
    if (type) params.set('type', type);
    params.set('order', order);
    router.push(`/practice?${params.toString()}`);
  };

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">登录后开始刷题</h1>
        <p className="mt-2 text-sm text-muted-foreground">系统会记录错题和待背题，方便你回头复习。</p>
        <Button className="mt-6" onClick={() => router.push('/login')}>去登录</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">刷题配置</Badge>
            <span className="text-xs text-muted-foreground">最多一次抽取 50 题</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">选择本次练习</h1>
        </div>
        <Button onClick={handleStart} disabled={!canStart} size="lg" className="sm:min-w-32">
          开始刷题
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* 刷题范围 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">刷题范围</h2>
              {scope === 'book' && !bookId && <span className="text-xs text-destructive">请选择教材</span>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SCOPE_OPTIONS.map((item) => {
                const Icon = item.icon;
                const active = scope === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setScope(item.value)}
                    className={`rounded-lg border p-4 text-left transition ${
                      active
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-border bg-card hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`font-medium ${active ? 'text-blue-700' : ''}`}>{item.label}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{item.desc}</div>
                      </div>
                      <Icon className={`mt-0.5 size-4 shrink-0 ${active ? 'text-blue-500' : ''}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 教材选择 */}
          {scope === 'book' && (
            <section>
              <h2 className="mb-3 text-sm font-medium">选择教材</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {books.map((book) => {
                  const active = String(book.id) === bookId;
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setBookId(String(book.id))}
                      className={`rounded-lg border p-3 text-left transition ${
                        active
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-border bg-card hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium ${active ? 'text-blue-700' : ''}`}>
                          {book.name}
                        </span>
                        <Badge variant={active ? 'default' : 'secondary'} className="shrink-0">
                          {book._count.questions} 题
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 刷题模式 */}
          <section>
            <h2 className="mb-3 text-sm font-medium">刷题模式</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODE_OPTIONS.map((item) => {
                const Icon = item.icon;
                const active = mode === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMode(item.value)}
                    className={`rounded-lg border p-4 text-left transition ${
                      active
                        ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                        : 'border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`mt-0.5 size-4 shrink-0 ${active ? 'text-emerald-600' : ''}`} />
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

          {/* 题型 + 排序 */}
          <section className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">题型</Label>
              <Select value={type || ''} onValueChange={(value) => setType(value || '')}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="全部题型" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">排序方式</Label>
              <Select value={order} onValueChange={(value) => setOrder(value || 'random')}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="随机排序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">随机排序</SelectItem>
                  <SelectItem value="sequential">顺序排列</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>
        </div>

        {/* 侧边栏摘要 */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-4" />
                本次练习
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-[5rem_1fr] gap-y-2 text-sm">
                <span className="text-muted-foreground">范围</span>
                <span className="font-medium">{selectedScope?.label}</span>
                <span className="text-muted-foreground">教材</span>
                <span className="font-medium">{scope === 'book' ? selectedBook?.name || '未选择' : '不限'}</span>
                <span className="text-muted-foreground">模式</span>
                <span className="font-medium">{selectedMode?.label}</span>
                <span className="text-muted-foreground">题型</span>
                <span className="font-medium">{TYPE_OPTIONS.find((item) => item.value === (type || ''))?.label || '全部题型'}</span>
                <span className="text-muted-foreground">排序</span>
                <span className="font-medium">{order === 'random' ? '随机排序' : '顺序排列'}</span>
              </div>
              <div className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                <CircleHelp className="mr-1 inline size-3.5" />
                答题模式提交后错题自动加入错题本；背题模式直接显示答案。
              </div>
              <Button className="w-full" onClick={handleStart} disabled={!canStart}>
                开始刷题
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default function PracticeSelectWrapper() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 text-center">加载中...</div>}>
      <PracticeSelectPage />
    </Suspense>
  );
}
