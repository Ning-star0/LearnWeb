'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookmarkCheck, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TYPE_LABEL: Record<string, string> = {
  SINGLE: '单选',
  MULTIPLE: '多选',
  JUDGE: '判断',
  SHORT: '简答',
};

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get('/bookmarks').then((res) => {
      if (res.code === 0) setItems(res.data || []);
    });
  }, [user]);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-sm text-muted-foreground">加载中...</div>;

  const ids = items.map((item) => item.questionId).join(',');

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:py-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">收藏</Badge>
          <h1 className="text-2xl font-semibold">已收藏题目</h1>
          <p className="mt-1 text-sm text-muted-foreground">集中查看自己收藏过的题目。</p>
        </div>
        {items.length > 0 && (
          <Link href={`/practice?mode=quiz&scope=all&ids=${ids}&order=sequential&restart=1`}>
            <Button><Play className="size-4" />练习收藏</Button>
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              暂无收藏题目。练习页题号右侧的收藏按钮可以加入这里。
            </CardContent>
          </Card>
        )}
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <BookmarkCheck className="size-4 text-blue-500" />
                <Badge variant="outline">{TYPE_LABEL[item.question?.type] || item.question?.type}</Badge>
                <Badge variant="secondary">{item.question?.book?.name || '未分类'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-3 text-sm leading-relaxed">{item.question?.stem}</p>
              <div className="mt-3 flex justify-end">
                <Link href={`/practice?mode=quiz&scope=all&ids=${item.questionId}&order=sequential&restart=1`}>
                  <Button variant="outline" size="sm">练习此题</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
