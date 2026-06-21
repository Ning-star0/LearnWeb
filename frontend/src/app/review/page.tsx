'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, CheckCircle2, Clock3 } from 'lucide-react';
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

  useEffect(() => {
    if (!user) return;
    api.get('/review').then((res) => {
      if (res.code === 0) setItems(res.data);
    });
  }, [user]);

  const removeReview = async (questionId: number) => {
    await api.delete(`/review/${questionId}`);
    setItems(items.filter((item) => item.questionId !== questionId));
  };

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">复习队列</Badge>
          <h1 className="text-2xl font-semibold tracking-normal">待背题</h1>
          <p className="mt-1 text-sm text-muted-foreground">背题模式中点“没记住”的题会进入这里。</p>
        </div>
        <Link href="/practice/select?scope=review&mode=study">
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
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="h-full">
              <CardHeader className="border-b">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      <Clock3 className="size-3" />
                      待背
                    </Badge>
                    <Badge variant="secondary">{item.question.book?.name}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeReview(item.questionId)}>已背熟</Button>
                </div>
                <CardTitle className="text-base leading-relaxed font-medium">{item.question.stem}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  答案：{formatAnswer(item.question.answerJson)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
