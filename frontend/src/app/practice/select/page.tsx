'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Brain, CheckCircle2, ChevronDown, Clock3, ListFilter, Play, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Book {
  id: number;
  name: string;
  _count: { questions: number };
}

interface Chapter {
  name: string;
  count: number;
}

const TYPE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'SINGLE', label: '单选' },
  { value: 'MULTIPLE', label: '多选' },
  { value: 'JUDGE', label: '判断' },
  { value: 'SHORT', label: '简答' },
];

const ORDER_OPTIONS = [
  { value: 'random', label: '随机' },
  { value: 'sequential', label: '顺序' },
];

function PracticeSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const initialBookId = searchParams.get('bookId') || '';
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState(initialBookId);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapter, setChapter] = useState(searchParams.get('chapter') || '');
  const [type, setType] = useState(normalizeTypeParam(searchParams.get('type')));
  const [order, setOrder] = useState(searchParams.get('order') || 'sequential');
  const [scope, setScope] = useState(searchParams.get('scope') || 'book');

  useEffect(() => {
    api.get('/books').then((res) => {
      if (res.code !== 0) return;
      const list = res.data || [];
      setBooks(list);
      if (initialBookId) {
        localStorage.setItem('preferredBookId', initialBookId);
        return;
      }
      const preferred = localStorage.getItem('preferredBookId');
      const preferredBook = list.find((book: Book) => String(book.id) === preferred && book._count.questions > 0);
      const fallbackBook = list.find((book: Book) => book._count.questions > 0);
      const nextBook = preferredBook || fallbackBook;
      if (nextBook && !bookId) {
        setBookId(String(nextBook.id));
        setScope('book');
      }
    });
  }, [initialBookId, bookId]);

  useEffect(() => {
    if (!bookId) {
      setChapters([]);
      setChapter('');
      return;
    }
    api.get(`/books/${bookId}/chapters`).then((res) => {
      if (res.code !== 0) return;
      const list = res.data || [];
      setChapters(list);
      if (chapter && !list.some((item: Chapter) => item.name === chapter)) {
        setChapter('');
      }
    });
  }, [bookId, chapter]);

  const selectedBook = useMemo(
    () => books.find((book) => String(book.id) === bookId),
    [books, bookId],
  );
  const selectedChapter = chapters.find((item) => item.name === chapter);
  const selectedQuestionCount = selectedChapter?.count ?? selectedBook?._count.questions ?? 0;

  const rememberBook = (nextBookId: string) => {
    setBookId(nextBookId);
    setScope('book');
    setChapter('');
    localStorage.setItem('preferredBookId', nextBookId);
  };

  const startPractice = (mode: 'quiz' | 'study', scopeOverride = scope, options: { restart?: boolean } = {}) => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (scopeOverride === 'book' && bookId) {
      params.set('scope', 'book');
      params.set('bookId', bookId);
      if (chapter) params.set('chapter', chapter);
      localStorage.setItem('preferredBookId', bookId);
    } else {
      params.set('scope', scopeOverride);
    }
    if (type) params.set('type', type);
    params.set('order', mode === 'study' ? order || 'sequential' : order || 'random');
    if (options.restart) params.set('restart', '1');
    router.push(`/practice?${params.toString()}`);
  };

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10 text-center">加载中...</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">登录后开始学习</h1>
        <p className="mt-2 text-sm text-muted-foreground">系统会记录错题和待背题。</p>
        <Button className="mt-6" onClick={() => router.push('/login')}>去登录</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 overflow-x-hidden px-4 py-5 lg:py-7">
      <Card className="mb-4 min-w-0 border-blue-200 bg-blue-50/40">
        <CardContent className="min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge>学习范围</Badge>
                <Badge variant="outline">{order === 'random' ? '随机' : '顺序'}</Badge>
                {chapter && <Badge variant="outline">{chapter}</Badge>}
                <Badge variant="outline">{TYPE_OPTIONS.find((item) => item.value === type)?.label || '全部'}</Badge>
              </div>
              <h1 className="truncate text-xl font-semibold sm:text-2xl">
                {selectedBook ? selectedBook.name : '全部题库'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedBook
                  ? `${chapter || '全部章节'} · 约 ${selectedQuestionCount} 题`
                  : '未选择教材时进入全部题库'}
              </p>
            </div>
            <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button onClick={() => startPractice('study')} size="lg" className="w-full sm:w-auto">
                <Brain className="size-4" />
                开始背题
              </Button>
              <Button onClick={() => startPractice('study', scope, { restart: true })} size="lg" variant="outline" className="w-full sm:w-auto">
                <CheckCircle2 className="size-4" />
                从头背
              </Button>
              <Button onClick={() => startPractice('quiz')} size="lg" variant="outline" className="w-full sm:w-auto">
                <Play className="size-4" />
                开始答题
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0 space-y-4">
          <Card className="min-w-0">
            <CardContent className="min-w-0 p-4">
              <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="size-4" />
                  教材
                </h2>
                <Button variant="ghost" size="sm" onClick={() => { setScope('all'); setBookId(''); setChapter(''); }}>
                  全部题库
                </Button>
              </div>
              <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {books.map((book) => {
                  const active = scope === 'book' && String(book.id) === bookId;
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => rememberBook(String(book.id))}
                      className={`min-w-0 rounded-lg border px-3 py-2 text-left transition ${
                        active
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                          : 'border-border bg-card hover:border-blue-300 hover:bg-blue-50/60'
                      }`}
                    >
                      <div className="break-words text-sm font-medium">{book.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{book._count.questions} 题</div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {scope === 'book' && chapters.length > 0 && (
            <Card className="min-w-0">
              <CardContent className="min-w-0 p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="size-4" />
                  章节
                </h2>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setChapter('')}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      !chapter
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                        : 'border-border hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    全部章节
                  </button>
                  {chapters.map((item) => {
                    const active = chapter === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setChapter(item.name)}
                        className={`min-w-0 rounded-lg border px-3 py-2 text-sm transition ${
                          active
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                            : 'border-border hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        {item.name}
                        <span className="ml-2 text-xs text-muted-foreground">{item.count}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {scope === 'book' && selectedBook && chapters.length === 0 && (
            <Card className="min-w-0">
              <CardContent className="p-4 text-sm leading-relaxed text-muted-foreground">
                当前教材还没有章节数据。可以先刷全部题；如果要按章节学习，请在管理端重新上传带“知识点/章节”的新版 Excel，重复题会自动补齐章节，不会重复新增。
              </CardContent>
            </Card>
          )}

          <Card className="min-w-0">
            <CardContent className="min-w-0 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <ListFilter className="size-4" />
                题型
              </h2>
              <div className="flex min-w-0 flex-wrap gap-2">
                {TYPE_OPTIONS.map((item) => {
                  const active = type === item.value;
                  return (
                    <button
                      key={item.value || 'all'}
                      type="button"
                      onClick={() => setType(item.value)}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        active
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                          : 'border-border hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="min-w-0 space-y-3">
          <Card className="min-w-0">
            <CardContent className="min-w-0 space-y-2 p-4">
              <Button variant="outline" className="w-full justify-start" onClick={() => startPractice('quiz', 'wrong')}>
                <Target className="size-4" />
                刷错题
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => startPractice('study', 'review')}>
                <Clock3 className="size-4" />
                背待背题
              </Button>
            </CardContent>
          </Card>

          <details className="min-w-0 rounded-xl border bg-card p-4 text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
              高级设置
              <ChevronDown className="size-4" />
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-2 text-xs text-muted-foreground">排序方式</div>
                <div className="grid grid-cols-2 gap-2">
                  {ORDER_OPTIONS.map((item) => {
                    const active = order === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setOrder(item.value)}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          active
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-border hover:border-blue-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => { setScope('all'); setBookId(''); setChapter(''); }}>
                不限教材
              </Button>
            </div>
          </details>
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

function normalizeTypeParam(value: string | null) {
  if (!value || value === '_all' || value === 'all') return '';
  return TYPE_OPTIONS.some((item) => item.value === value) ? value : '';
}
