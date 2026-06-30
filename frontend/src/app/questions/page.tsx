'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, Circle, ListFilter, Play, RotateCcw, Search, Shuffle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface Book { id: number; name: string; }
interface Chapter { name: string; count: number; }
interface Question {
  id: number;
  type: string;
  stem: string;
  chapter?: string | null;
  difficulty?: string | null;
  courseObjective?: string | null;
  score?: number | null;
  book: Book;
  bank?: { id: number; name: string; sourceFile?: string | null };
  options: { label: string; content: string }[];
  userStatus?: 'correct' | 'wrong' | 'unanswered';
}

const TYPE_LABEL: Record<string, string> = { SINGLE: '单选', MULTIPLE: '多选', JUDGE: '判断', SHORT: '简答' };
const STATUS_LABEL: Record<string, string> = { _all: '全部状态', correct: '已做对', wrong: '做错过', unanswered: '未作答' };
const QUESTION_PAGE_SIZE = 20;

function QuestionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [bookId, setBookId] = useState(searchParams.get('bookId') || '');
  const [chapter, setChapter] = useState(searchParams.get('chapter') || '');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('_all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (bookId) params.set('bookId', bookId);
    if (chapter) params.set('chapter', chapter);
    if (type) params.set('type', type);
    if (status !== '_all') params.set('status', status);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('pageSize', String(QUESTION_PAGE_SIZE));

    setLoading(true);
    api.get(`/questions?${params}`).then((res) => {
      if (res.code === 0) {
        setQuestions(res.data.items);
        setTotal(res.data.total);
      }
    }).finally(() => setLoading(false));

    api.get('/books').then((res) => {
      if (res.code === 0) setBooks(res.data);
    });
  }, [bookId, chapter, type, status, search, page]);

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

  const displayedQuestions = questions;

  const pageCorrect = questions.filter((question) => question.userStatus === 'correct').length;
  const pageWrong = questions.filter((question) => question.userStatus === 'wrong').length;
  const pageUnanswered = questions.filter((question) => !question.userStatus || question.userStatus === 'unanswered').length;
  const totalPages = Math.max(1, Math.ceil(total / QUESTION_PAGE_SIZE));
  const selectedBookLabel = books.find((book) => String(book.id) === bookId)?.name || '全部教材';
  const selectedChapterLabel = chapter || '全部章节';
  const selectedTypeLabel = type ? `${TYPE_LABEL[type] || type}题` : '全部题型';
  const selectedStatusLabel = STATUS_LABEL[status] || '全部状态';

  const startPracticeWithIds = (ids: number[], orderMode: 'sequential' | 'random' = 'sequential') => {
    if (ids.length === 0) return;
    router.push(`/practice?ids=${ids.join(',')}&mode=quiz&order=${orderMode}&restart=1`);
  };

  const previewQuestion = (questionId: number) => {
    router.push(`/practice?ids=${questionId}&mode=study&restart=1`);
  };

  const resetFilters = () => {
    setBookId('');
    setChapter('');
    setType('');
    setStatus('_all');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">统一题库</Badge>
          <h1 className="text-2xl font-semibold tracking-normal">题库浏览</h1>
          <p className="mt-1 text-sm text-muted-foreground">按教材、章节、题型、作答状态和题干关键词定位题目。</p>
        </div>
        {user && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => startPracticeWithIds(displayedQuestions.map((q) => q.id), 'random')} disabled={displayedQuestions.length === 0}>
              <Shuffle className="size-4" />随机刷当前页
            </Button>
            <Button onClick={() => startPracticeWithIds(displayedQuestions.map((q) => q.id))} disabled={displayedQuestions.length === 0}>
              <Play className="size-4" />顺序刷当前页
            </Button>
          </div>
        )}
      </div>

      <Card className="mb-4 min-w-0">
        <CardContent className="min-w-0 space-y-3 p-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1.4fr_auto]">
            <Select value={bookId || '_all'} onValueChange={(value) => { const next = value || '_all'; setBookId(next !== '_all' ? next : ''); setChapter(''); setPage(1); }}>
              <SelectTrigger className="w-full">
                <span className="truncate">{selectedBookLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">全部教材</SelectItem>
                {books.map((book) => (
                  <SelectItem key={book.id} value={String(book.id)}>{book.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={chapter || '_all'} onValueChange={(value) => { const next = value || '_all'; setChapter(next !== '_all' ? next : ''); setPage(1); }} disabled={!bookId || chapters.length === 0}>
              <SelectTrigger className="w-full">
                <span className="truncate">{selectedChapterLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">全部章节</SelectItem>
                {chapters.map((item) => (
                  <SelectItem key={item.name} value={item.name}>{item.name}（{item.count}）</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type || '_all'} onValueChange={(value) => { const next = value || '_all'; setType(next !== '_all' ? next : ''); setPage(1); }}>
              <SelectTrigger className="w-full">
                <span className="truncate">{selectedTypeLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">全部题型</SelectItem>
                <SelectItem value="SINGLE">单选题</SelectItem>
                <SelectItem value="MULTIPLE">多选题</SelectItem>
                <SelectItem value="JUDGE">判断题</SelectItem>
                <SelectItem value="SHORT">简答题</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setStatus(value || '_all'); setPage(1); }}>
              <SelectTrigger className="w-full">
                <span className="truncate">{selectedStatusLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">全部状态</SelectItem>
                <SelectItem value="correct">已做对</SelectItem>
                <SelectItem value="wrong">做错过</SelectItem>
                <SelectItem value="unanswered">未作答</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索题干..."
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={resetFilters}>
              <RotateCcw className="size-4" />清空
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <ListFilter className="size-4" />
            <span>共 {total} 题</span>
            <span>当前页 {questions.length} 题</span>
            <span>当前显示 {displayedQuestions.length} 题</span>
            {user && (
              <>
                <span className="text-emerald-600">已做对 {pageCorrect}</span>
                <span className="text-red-600">做错过 {pageWrong}</span>
                <span>未作答 {pageUnanswered}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {displayedQuestions.map((question) => (
          <Card key={question.id} className="min-w-0 transition-shadow hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={question.userStatus || 'unanswered'} />
                    <Badge variant="outline">#{question.id}</Badge>
                    <Badge>{TYPE_LABEL[question.type] || question.type}</Badge>
                    {question.chapter && <Badge variant="outline">{question.chapter}</Badge>}
                    {question.difficulty && <Badge variant="outline">{question.difficulty}</Badge>}
                    {question.score ? <Badge variant="outline">{question.score} 分</Badge> : null}
                    <Badge variant="secondary" className="max-w-72 truncate">{question.book.name}</Badge>
                  </div>
                  <p className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm font-medium leading-7">{question.stem}</p>
                  {question.options?.length > 0 && (
                    <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                      {question.options.map((option) => (
                        <div key={option.label} className="rounded-lg border bg-muted/25 px-3 py-2 text-sm">
                          <span className="font-medium">{option.label}. </span>
                          <span className="break-words text-muted-foreground">{option.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 break-words text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><BookOpen className="size-3" />题库：{question.bank?.name || '未标记'}</span>
                    {question.bank?.sourceFile && <span>来源文件：{question.bank.sourceFile}</span>}
                    {question.courseObjective && <span>课程目标：{question.courseObjective}</span>}
                  </div>
                </div>
                {user && (
                  <div className="flex shrink-0 flex-row gap-2 lg:flex-col">
                    <Button size="sm" variant="outline" onClick={() => startPracticeWithIds([question.id])}>
                      <Play className="size-3" />刷这题
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => previewQuestion(question.id)}>
                      <ArrowRight className="size-3" />看答案
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && displayedQuestions.length === 0 && (
          <div className="rounded-lg border bg-muted/40 p-8 text-center">
            <p className="font-medium">暂无题目</p>
            <p className="mt-1 text-sm text-muted-foreground">调整筛选条件后再查看。</p>
          </div>
        )}
        {loading && <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</Button>
        <span className="text-center text-sm text-muted-foreground">
          第 {page} 页 / 共 {totalPages} 页，服务器结果 {total} 题，每页 {QUESTION_PAGE_SIZE} 题
        </span>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'correct' | 'wrong' | 'unanswered' }) {
  if (status === 'correct') {
    return <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-3" />已做对</Badge>;
  }
  if (status === 'wrong') {
    return <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700"><XCircle className="size-3" />做错过</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground"><Circle className="size-3" />未作答</Badge>;
}

export default function QuestionsWrapper() {
  return <Suspense fallback={<div className="py-8 text-center">加载中...</div>}><QuestionsPage /></Suspense>;
}
