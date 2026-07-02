'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, CheckCircle2, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ReviewQuestion {
  stem: string;
  answerJson?: unknown;
  book?: { name?: string };
}

interface ReviewItem {
  id: string | number;
  questionId: number;
  question: ReviewQuestion;
}

function formatAnswer(answer: unknown) {
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'boolean') return answer ? '正确' : '错误';
  return String(answer ?? '');
}

export default function ReviewPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;
    api.get('/review').then((res) => {
      if (res.code === 0) setItems(res.data);
    });
  }, [user]);

  const removeReview = async (questionId: number) => {
    if (removingIds.has(questionId)) return;
    setRemovingIds((current) => new Set(current).add(questionId));
    try {
      const res = await api.post('/practice/study-action', {
        questionId,
        action: 'remembered',
      });
      if (res.code !== 0) {
        throw new Error(res.message || '移出待背题失败');
      }
      setItems((current) => current.filter((item) => item.questionId !== questionId));
      toast.success('已标记为背熟');
    } catch {
      toast.error('标记失败，请稍后重试');
    } finally {
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(questionId);
        return next;
      });
    }
  };

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>;
  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-3 py-5 sm:px-4 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">复习队列</Badge>
          <h1 className="text-2xl font-semibold tracking-normal">待背题</h1>
          <p className="mt-1 text-sm text-muted-foreground">背题模式中点“没记住”的题会进入这里。</p>
        </div>
        <Link href="/practice?mode=study&scope=review&order=sequential&restart=1">
          <Button disabled={items.length === 0}>
            <Brain className="size-4" />
            背待背题
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/40 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">暂无待背题</p>
          <p className="mt-1 text-sm text-muted-foreground">学习时遇到不熟的题，点“没记住”后会出现在这里。</p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="h-full min-w-0">
              <CardHeader className="min-w-0 border-b p-4">
                <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      <Clock3 className="size-3" />
                      待背
                    </Badge>
                    <Badge variant="secondary" className="max-w-full truncate">{item.question.book?.name || '未标记教材'}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReview(item.questionId)}
                    disabled={removingIds.has(item.questionId)}
                  >
                    {removingIds.has(item.questionId) ? '移出中...' : '已背熟'}
                  </Button>
                </div>
                <CardTitle className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-base leading-relaxed font-medium">
                  {item.question.stem}
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 p-4">
                <div className="max-h-44 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">答案：</span>
                  <span className="whitespace-pre-wrap break-words">{formatAnswer(item.question.answerJson)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
