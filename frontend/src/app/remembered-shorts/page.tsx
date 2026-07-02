'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!user) return;
    api.get('/study/remembered-shorts', { cache: 'no-store' }).then((res) => {
      if (res.code === 0) setItems(res.data?.items || []);
    });
  }, [user]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim();
    if (!keyword) return items;
    return items.filter((item) => matchesKeyword(item, keyword));
  }, [items, search]);

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(0, filteredItems.length - 1)));
  }, [filteredItems.length]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  const currentItem = filteredItems[currentIndex] || null;
  const answer = currentItem ? formatAnswer(currentItem.question.answerRaw, currentItem.question.answerJson) : '';
  const practiceIds = filteredItems.map((item) => item.questionId).join(',');
  const canPrevious = currentIndex > 0;
  const canNext = currentIndex < filteredItems.length - 1;

  const goPrevious = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((index) => Math.min(filteredItems.length - 1, index + 1));
  }, [filteredItems.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable) return;

      if (event.key === 'ArrowLeft' && canPrevious) {
        event.preventDefault();
        goPrevious();
      }
      if (event.key === 'ArrowRight' && canNext) {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNext, canPrevious, goNext, goPrevious]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>;
  }
  if (!user) return null;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col overflow-x-hidden px-3 py-3 sm:px-4 sm:py-5">
      <header className="mb-3 flex shrink-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">已背过大题</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {filteredItems.length > 0 ? `${currentIndex + 1} / ${filteredItems.length}` : '0 / 0'}
            </p>
          </div>
          {practiceIds ? (
            <Link href={`/practice?ids=${practiceIds}&mode=study&order=sequential&restart=1`} className="shrink-0">
              <Button size="sm" variant="outline">
                <Brain className="size-4" />
                重背
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="outline" disabled className="shrink-0">
              <Brain className="size-4" />
              重背
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentIndex(0);
            }}
            placeholder="搜索题干、答案、教材"
            className="h-10 pl-9"
          />
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState title="还没有已背过的大题" description="在背题模式中把大题标为已背过后，会出现在这里。" />
      ) : filteredItems.length === 0 || !currentItem ? (
        <EmptyState title="没有符合搜索条件的大题" description="换个关键词再试。" />
      ) : (
        <>
          <main ref={contentRef} className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-background">
            <section className="border-b p-3 sm:p-4">
              <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{currentItem.question.book?.name || '未标记教材'}</span>
                {currentItem.question.chapter && <span>{currentItem.question.chapter}</span>}
                <span>题号 {currentItem.questionId}</span>
              </div>
              <h2 className="whitespace-pre-wrap break-words text-base font-semibold leading-7 sm:text-lg sm:leading-8">
                {currentItem.question.stem}
              </h2>
            </section>

            <section className="p-3 sm:p-4">
              <div className="mb-2 text-sm font-medium">答案</div>
              <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground sm:text-base sm:leading-8">
                {answer}
              </div>
            </section>
          </main>

          <footer className="mt-3 grid shrink-0 grid-cols-2 gap-2">
            <Button variant="outline" onClick={goPrevious} disabled={!canPrevious}>
              <ArrowLeft className="size-4" />
              上一题
            </Button>
            <Button onClick={goNext} disabled={!canNext}>
              下一题
              <ArrowRight className="size-4" />
            </Button>
          </footer>
        </>
      )}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border bg-muted/30 p-6 text-center">
      <CheckCircle2 className="mb-3 size-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
