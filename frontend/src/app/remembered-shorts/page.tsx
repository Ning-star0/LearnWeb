'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookMarked, Brain, CheckCircle2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface RememberedShortItem {
  id: number;
  questionId: number;
  createdAt: string;
  question: {
    id: number;
    stem: string;
    answerRaw?: string | null;
    answerJson?: unknown;
    chapter?: string | null;
    book?: { id?: number; name?: string };
    bank?: { id?: number; name?: string; sourceFile?: string | null };
  };
}

function formatAnswer(answerRaw: string | null | undefined, answerJson: unknown) {
  if (answerRaw) return answerRaw;
  if (Array.isArray(answerJson)) return answerJson.join(', ');
  if (typeof answerJson === 'boolean') return answerJson ? '正确' : '错误';
  return String(answerJson ?? '暂无答案');
}

function formatDate(value?: string) {
  if (!value) return '暂无时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无时间';
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}

function matchesKeyword(item: RememberedShortItem, keyword: string) {
  const text = [
    item.question.stem,
    item.question.answerRaw,
    item.question.book?.name,
    item.question.bank?.name,
    item.question.bank?.sourceFile,
    item.question.chapter,
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes(keyword.toLowerCase());
}

export default function RememberedShortsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<RememberedShortItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get('/study/remembered-shorts').then((res) => {
      if (res.code === 0) setItems(res.data?.items || []);
    });
  }, [user]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim();
    if (!keyword) return items;
    return items.filter((item) => matchesKeyword(item, keyword));
  }, [items, search]);

  const practiceIds = filteredItems.map((item) => item.questionId).join(',');

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>;
  }
  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 lg:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Badge variant="secondary" className="mb-2">背题回看</Badge>
          <h1 className="text-2xl font-semibold tracking-normal">已背过大题</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            这里只显示最新背题状态仍为“已背过”的大题，方便之后集中重新背。
          </p>
        </div>
        {practiceIds ? (
          <Link href={`/practice?ids=${practiceIds}&mode=study&restart=1`}>
            <Button className="w-full sm:w-auto">
              <Brain className="size-4" />
              重新背当前列表
            </Button>
          </Link>
        ) : (
          <Button disabled className="w-full sm:w-auto">
            <Brain className="size-4" />
            重新背当前列表
          </Button>
        )}
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索题干、答案、教材或来源文件"
              className="pl-9"
            />
          </div>
          <div className="shrink-0 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{filteredItems.length}</span> 道
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/40 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">还没有已背过的大题</p>
          <p className="mt-1 text-sm text-muted-foreground">在背题模式中把大题标为“已背过”后，会出现在这里。</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border bg-muted/40 p-8 text-center">
          <p className="font-medium">没有符合搜索条件的大题</p>
          <p className="mt-1 text-sm text-muted-foreground">换个关键词再试。</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredItems.map((item) => {
            const answer = formatAnswer(item.question.answerRaw, item.question.answerJson);
            return (
              <Card key={item.id} className="h-full">
                <CardHeader className="border-b p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      <BookMarked className="size-3" />
                      已背过
                    </Badge>
                    <Badge variant="secondary">{item.question.book?.name || '未标记教材'}</Badge>
                    {item.question.chapter && <Badge variant="outline">{item.question.chapter}</Badge>}
                    <span className="text-xs text-muted-foreground">最近标记 {formatDate(item.createdAt)}</span>
                  </div>
                  <CardTitle className="text-base leading-7 font-medium">
                    <span className="line-clamp-4 whitespace-pre-wrap break-words sm:line-clamp-5">
                      {item.question.stem}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <details className="group rounded-lg border bg-muted/30">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                      查看答案
                    </summary>
                    <div className="max-h-48 overflow-y-auto border-t px-3 py-2 text-sm leading-7 text-muted-foreground sm:max-h-64">
                      <p className="whitespace-pre-wrap break-words">{answer}</p>
                    </div>
                  </details>
                  <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>题库：{item.question.bank?.name || '未标记'}</span>
                    <span>来源文件：{item.question.bank?.sourceFile || '未记录'}</span>
                  </div>
                  <Link href={`/practice?ids=${item.questionId}&mode=study&restart=1`}>
                    <Button variant="outline" size="sm" className="w-full">
                      单独重背
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
