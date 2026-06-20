'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface Book { id: number; name: string; }
interface Question { id: number; type: string; stem: string; book: Book; options: { label: string; content: string }[]; }

const TYPE_LABEL: Record<string, string> = { SINGLE: '单选', MULTIPLE: '多选', JUDGE: '判断', SHORT: '简答' };

function QuestionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState(searchParams.get('bookId') || '');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams();
    if (bookId) params.set('bookId', bookId);
    if (type) params.set('type', type);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('pageSize', '20');
    api.get(`/questions?${params}`).then((res) => {
      if (res.code === 0) { setQuestions(res.data.items); setTotal(res.data.total); }
    });
    api.get('/books').then((res) => {
      if (res.code === 0) setBooks(res.data);
    });
  }, [bookId, type, search, page]);

  const startPracticeWithIds = (ids: number[]) => {
    router.push(`/practice?ids=${ids.join(',')}&mode=quiz`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">题库浏览</h1>
        {user && (
          <Button onClick={() => startPracticeWithIds(questions.map((q) => q.id))} size="sm">
            刷当前列表<ArrowRight className="size-4 ml-1" />
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Select value={bookId || '_all'} onValueChange={(v) => { setBookId(v && v !== '_all' ? v : ''); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="全部教材" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部教材</SelectItem>
            {books.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type || '_all'} onValueChange={(v) => { setType(v && v !== '_all' ? v : ''); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="全部题型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部题型</SelectItem>
            <SelectItem value="SINGLE">单选题</SelectItem>
            <SelectItem value="MULTIPLE">多选题</SelectItem>
            <SelectItem value="JUDGE">判断题</SelectItem>
            <SelectItem value="SHORT">简答题</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="搜索题干..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q) => (
          <Card key={q.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex gap-2 shrink-0">
                  <Badge variant="outline">{TYPE_LABEL[q.type]}</Badge>
                  <Badge variant="secondary">{q.book.name}</Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{q.stem}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {q.options?.map((o) => (
                      <span key={o.label} className="text-xs text-muted-foreground">{o.label}. {o.content}</span>
                    ))}
                  </div>
                </div>
                {user && (
                  <Button variant="ghost" size="sm" className="shrink-0"
                    onClick={() => startPracticeWithIds([q.id])}>刷这题</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {questions.length === 0 && <p className="text-center text-muted-foreground py-8">暂无题目</p>}
      </div>

      <div className="flex justify-between mt-4">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
        <span className="text-sm text-muted-foreground self-center">共 {total} 题</span>
        <Button variant="outline" disabled={questions.length < 20} onClick={() => setPage(page + 1)}>下一页</Button>
      </div>
    </div>
  );
}

export default function QuestionsWrapper() {
  return <Suspense fallback={<div className="text-center py-8">加载中...</div>}><QuestionsPage /></Suspense>;
}
