'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Book {
  id: number;
  name: string;
  course: { id: number; name: string };
  _count: { questions: number };
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [preferredBookId, setPreferredBookId] = useState('');

  useEffect(() => {
    setPreferredBookId(localStorage.getItem('preferredBookId') || '');
    api.get('/books').then((res) => {
      if (res.code === 0) setBooks(res.data);
    });
  }, []);

  const selectBook = (bookId: number) => {
    localStorage.setItem('preferredBookId', String(bookId));
    setPreferredBookId(String(bookId));
  };

  const totalQuestions = useMemo(
    () => books.reduce((sum, book) => sum + (book._count?.questions || 0), 0),
    [books],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">教材题库</Badge>
          <h1 className="text-2xl font-semibold tracking-normal">选择教材</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            点击教材卡片即可选择，之后首页和学习入口会一直使用这本教材。当前 {books.length} 本教材，共 {totalQuestions} 题。
          </p>
        </div>
        <Link href={preferredBookId ? `/practice/select?scope=book&bookId=${preferredBookId}` : '/practice/select?scope=all'}>
          <Button disabled={books.length > 0 && !preferredBookId}>
            <CheckCircle2 className="size-4" />
            使用当前教材
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => {
          const preferred = preferredBookId === String(book.id);
          return (
          <Card
            key={book.id}
            role="button"
            tabIndex={0}
            onClick={() => selectBook(book.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectBook(book.id);
              }
            }}
            className={`h-full cursor-pointer transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 ${
              preferred ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-100' : ''
            }`}
          >
            <CardHeader className="border-b">
              <div className="mb-3 flex items-start justify-between gap-3">
                <BookOpen className={`mt-1 size-4 ${preferred ? 'text-blue-600' : 'text-muted-foreground'}`} />
                <div className="flex items-center gap-2">
                  {preferred && <Badge className="bg-blue-600">已选择</Badge>}
                  <Badge variant="outline">{book._count.questions} 题</Badge>
                </div>
              </div>
              <CardTitle className="text-base leading-relaxed">{book.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`rounded-lg border px-3 py-2 text-sm ${
                preferred
                  ? 'border-blue-200 bg-white text-blue-700'
                  : 'border-border bg-muted/30 text-muted-foreground'
              }`}>
                {preferred ? '当前选择教材' : '点击选择这本教材'}
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>
    </div>
  );
}
