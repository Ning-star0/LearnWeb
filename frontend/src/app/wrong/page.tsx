'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Eye, Filter, Play, Search, Target, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

interface WrongItem {
  id: string | number;
  questionId: number;
  wrongCount: number;
  createdAt?: string;
  updatedAt?: string;
  question: {
    id?: number;
    type?: string;
    stem: string;
    chapter?: string | null;
    difficulty?: string | null;
    answerJson?: unknown;
    book?: { id?: number; name?: string };
    bank?: { id?: number; name?: string; sourceFile?: string | null };
    options?: { label: string; content: string }[];
  };
}

const TYPE_LABEL: Record<string, string> = { SINGLE: '单选', MULTIPLE: '多选', JUDGE: '判断', SHORT: '简答' };
const WRONG_PAGE_SIZE = 12;

function formatAnswer(answer: unknown) {
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'boolean') return answer ? '正确' : '错误';
  return String(answer ?? '未设置');
}

function formatDate(value?: string) {
  if (!value) return '暂无记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无记录';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function matchesSearch(item: WrongItem, keyword: string) {
  const text = [
    item.question.stem,
    item.question.book?.name,
    item.question.bank?.name,
    item.question.bank?.sourceFile,
    item.question.chapter,
    ...(item.question.options || []).map((option) => `${option.label} ${option.content}`),
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes(keyword.toLowerCase());
}

export default function WrongPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<WrongItem[]>([]);
  const [search, setSearch] = useState('');
  const [bookId, setBookId] = useState('_all');
  const [sortBy, setSortBy] = useState('recent');
  const [focusOnly, setFocusOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;
    api.get('/wrong').then((res) => {
      if (res.code === 0) setItems(res.data);
    });
  }, [user]);

  const books = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      const id = item.question.book?.id;
      const name = item.question.book?.name;
      if (id && name) map.set(String(id), name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [items]);

  const filteredItems = useMemo(() => {
    const list = items
      .filter((item) => bookId === '_all' || String(item.question.book?.id) === bookId)
      .filter((item) => !focusOnly || item.wrongCount >= 2)
      .filter((item) => !search.trim() || matchesSearch(item, search.trim()));

    return [...list].sort((a, b) => {
      if (sortBy === 'count') return b.wrongCount - a.wrongCount;
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [bookId, focusOnly, items, search, sortBy]);

  const highRiskItems = items.filter((item) => item.wrongCount >= 2);
  const totalWrongAttempts = items.reduce((sum, item) => sum + item.wrongCount, 0);
  const selectedBookLabel = bookId === '_all' ? '全部教材' : books.find((book) => book.id === bookId)?.name || '全部教材';
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / WRONG_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((currentPage - 1) * WRONG_PAGE_SIZE, currentPage * WRONG_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [bookId, focusOnly, search, sortBy]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const removeWrong = async (questionId: number) => {
    if (removingIds.has(questionId)) return;
    setRemovingIds((current) => new Set(current).add(questionId));
    try {
      const res = await api.delete(`/wrong/${questionId}`);
      if (res.code !== 0) {
        throw new Error(res.message || '移出错题本失败');
      }
      setItems((current) => current.filter((item) => item.questionId !== questionId));
      toast.success('已移出错题本');
    } catch {
      toast.error('移出错题本失败，请稍后重试');
    } finally {
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(questionId);
        return next;
      });
    }
  };

  const startPractice = (ids: number[]) => {
    if (ids.length === 0) return;
    router.push(`/practice?ids=${ids.join(',')}&mode=quiz&scope=wrong&order=sequential&restart=1`);
  };

  const startWrongPractice = () => {
    router.push('/practice?mode=quiz&scope=wrong&order=sequential&restart=1');
  };

  const previewOne = (questionId: number) => {
    router.push(`/practice?ids=${questionId}&mode=study&scope=wrong&order=sequential&restart=1`);
  };

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>;
  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">复习队列</Badge>
          <h1 className="text-2xl font-semibold tracking-normal">错题本</h1>
          <p className="mt-1 text-sm text-muted-foreground">按教材、关键词和错误次数筛选，优先处理反复出错的题。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => startPractice(highRiskItems.map((item) => item.questionId))} disabled={highRiskItems.length === 0}>
            <AlertTriangle className="size-4" />重点复习
          </Button>
          <Button variant="outline" onClick={() => startPractice(filteredItems.map((item) => item.questionId))} disabled={filteredItems.length === 0}>
            <Play className="size-4" />刷当前筛选
          </Button>
          <Button onClick={startWrongPractice} disabled={items.length === 0}>
            <Target className="size-4" />批量刷错题
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">错题数量</p>
            <p className="mt-2 text-3xl font-semibold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">累计错误</p>
            <p className="mt-2 text-3xl font-semibold">{totalWrongAttempts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">重点题</p>
            <p className="mt-2 text-3xl font-semibold">{highRiskItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">涉及教材</p>
            <p className="mt-2 text-3xl font-semibold">{books.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索题干、选项、教材或题库来源"
              className="pl-9"
            />
          </div>
          <Select value={bookId} onValueChange={(value) => setBookId(value || '_all')}>
            <SelectTrigger className="w-full lg:w-56">
              <span className="truncate">{selectedBookLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">全部教材</SelectItem>
              {books.map((book) => (
                <SelectItem key={book.id} value={book.id}>{book.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value || 'recent')}>
            <SelectTrigger className="w-full lg:w-40">
              <span>{sortBy === 'count' ? '错误次数优先' : '最近错误优先'}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">最近错误优先</SelectItem>
              <SelectItem value="count">错误次数优先</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={focusOnly ? 'default' : 'outline'} onClick={() => setFocusOnly((value) => !value)} className="w-full lg:w-auto">
            <Filter className="size-4" />只看重点
          </Button>
        </CardContent>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>当前筛选 {filteredItems.length} 题，每页 {WRONG_PAGE_SIZE} 题</span>
        {filteredItems.length > WRONG_PAGE_SIZE && (
          <span>第 {currentPage} / {totalPages} 页</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/40 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">暂无错题</p>
          <p className="mt-1 text-sm text-muted-foreground">继续答题后，系统会把错误题目放到这里。</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border bg-muted/40 p-8 text-center">
          <p className="font-medium">没有符合筛选条件的错题</p>
          <p className="mt-1 text-sm text-muted-foreground">调整关键词、教材或重点筛选后再查看。</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visibleItems.map((item) => (
            <Card key={item.id} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive">错 {item.wrongCount} 次</Badge>
                  {item.question.type && <Badge variant="outline">{TYPE_LABEL[item.question.type] || item.question.type}</Badge>}
                  {item.question.chapter && <Badge variant="outline">{item.question.chapter}</Badge>}
                  {item.question.difficulty && <Badge variant="outline">{item.question.difficulty}</Badge>}
                  {item.question.book?.name && <Badge variant="secondary">{item.question.book.name}</Badge>}
                </div>
                <CardTitle className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-base leading-relaxed font-medium">
                  {item.question.stem}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.question.options && item.question.options.length > 0 && (
                  <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {item.question.options.map((option) => (
                      <div key={option.label} className="rounded-lg border bg-muted/25 px-3 py-2 text-sm">
                        <span className="font-medium">{option.label}. </span>
                        <span className="break-words text-muted-foreground">{option.content}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  正确答案：<span className="font-semibold">{formatAnswer(item.question.answerJson)}</span>
                </div>
                <div className="grid gap-2 break-words text-xs text-muted-foreground sm:grid-cols-2">
                  <span>题库：{item.question.bank?.name || '未标记'}</span>
                  <span>来源文件：{item.question.bank?.sourceFile || '未记录'}</span>
                  <span>最近错误：{formatDate(item.updatedAt || item.createdAt)}</span>
                  <span>题目编号：{item.questionId}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => startPractice([item.questionId])}>
                    <Play className="size-3" />刷这题
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => previewOne(item.questionId)}>
                    <Eye className="size-3" />看答案
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500"
                    onClick={() => removeWrong(item.questionId)}
                    disabled={removingIds.has(item.questionId)}
                  >
                    <Trash2 className="size-3" />{removingIds.has(item.questionId) ? '移出中...' : '移出错题本'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredItems.length > WRONG_PAGE_SIZE && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            上一页
          </Button>
          <span className="text-center text-sm text-muted-foreground">
            第 {currentPage} 页 / 共 {totalPages} 页，当前显示 {visibleItems.length} 题
          </span>
          <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
