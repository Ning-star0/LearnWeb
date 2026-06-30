'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookmarkCheck, Play, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const TYPE_LABEL: Record<string, string> = {
  SINGLE: '单选',
  MULTIPLE: '多选',
  JUDGE: '判断',
  SHORT: '简答',
};

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get('/bookmarks').then((res) => {
      if (res.code === 0) setItems(res.data || []);
    });
  }, [user]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => {
      const text = [
        item.question?.stem,
        item.question?.book?.name,
        item.question?.type,
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(keyword);
    });
  }, [items, search]);

  const ids = filteredItems.map((item) => item.questionId).join(',');

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-sm text-muted-foreground">加载中...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:py-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">收藏</Badge>
          <h1 className="text-2xl font-semibold">已收藏题目</h1>
          <p className="mt-1 text-sm text-muted-foreground">集中查看自己收藏过的题目。</p>
        </div>
        {filteredItems.length > 0 && (
          <Link href={`/practice?mode=quiz&scope=all&ids=${ids}&order=sequential&restart=1`}>
            <Button className="w-full sm:w-auto"><Play className="size-4" />练习当前列表</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索题干、教材或题型"
              className="pl-9"
            />
          </div>
          <div className="shrink-0 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{filteredItems.length}</span> 道
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              暂无收藏题目。练习页题号右侧的收藏按钮可以加入这里。
            </CardContent>
          </Card>
        )}
        {items.length > 0 && filteredItems.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              没有符合搜索条件的收藏题目。
            </CardContent>
          </Card>
        )}
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <BookmarkCheck className="size-4 text-blue-500" />
                <Badge variant="outline">{TYPE_LABEL[item.question?.type] || item.question?.type}</Badge>
                <Badge variant="secondary">{item.question?.book?.name || '未分类'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.question?.stem}</p>
              <details className="rounded-lg border bg-muted/30">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium">查看完整题干</summary>
                <div className="max-h-56 overflow-y-auto border-t px-3 py-2 text-sm leading-7 text-muted-foreground sm:max-h-72">
                  <p className="whitespace-pre-wrap break-words">{item.question?.stem}</p>
                </div>
              </details>
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
