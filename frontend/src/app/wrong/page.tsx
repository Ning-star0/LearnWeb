'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Target } from 'lucide-react';
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

interface WrongItem {
  id: string | number;
  questionId: number;
  wrongCount: number;
  question: ReviewQuestion;
}

function formatAnswer(answer: unknown) {
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'boolean') return answer ? '正确' : '错误';
  return String(answer ?? '');
}

export default function WrongPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<WrongItem[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get('/wrong').then((res) => {
      if (res.code === 0) setItems(res.data);
    });
  }, [user]);

  const removeWrong = async (questionId: number) => {
    await api.delete(`/wrong/${questionId}`);
    setItems(items.filter((item) => item.questionId !== questionId));
  };

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">复习队列</Badge>
          <h1 className="text-2xl font-semibold tracking-normal">错题本</h1>
          <p className="mt-1 text-sm text-muted-foreground">答题模式中答错的题会自动加入这里。</p>
        </div>
        <Link href="/practice/select?scope=wrong&mode=quiz">
          <Button disabled={items.length === 0}>
            <Target className="size-4" />
            刷错题
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/40 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">暂无错题</p>
          <p className="mt-1 text-sm text-muted-foreground">继续答题后，系统会把错误题目放到这里。</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="h-full">
              <CardHeader className="border-b">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">错 {item.wrongCount} 次</Badge>
                    <Badge variant="secondary">{item.question.book?.name}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeWrong(item.questionId)}>已掌握</Button>
                </div>
                <CardTitle className="text-base leading-relaxed font-medium">{item.question.stem}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  正确答案：{formatAnswer(item.question.answerJson)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
