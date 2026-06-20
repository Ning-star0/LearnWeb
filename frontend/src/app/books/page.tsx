'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Brain, CheckCircle2 } from 'lucide-react';
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

  const rememberBook = (bookId: number) => {
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
          <h1 className="text-2xl font-semibold tracking-normal">选择教材刷题</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            当前 {books.length} 本教材，共 {totalQuestions} 题。
          </p>
        </div>
        <Link href="/practice/select?scope=all">
          <Button>
            <CheckCircle2 className="size-4" />
            全部题库
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => {
          const preferred = preferredBookId === String(book.id);
          return (
          <Card key={book.id} className={`h-full ${preferred ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-100' : ''}`}>
            <CardHeader className="border-b">
              <div className="mb-3 flex items-start justify-between gap-3">
                <BookOpen className="mt-1 size-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  {preferred && <Badge>默认</Badge>}
                  <Badge variant="outline">{book._count.questions} 题</Badge>
                </div>
              </div>
              <CardTitle className="text-base leading-relaxed">{book.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href={`/practice?scope=book&bookId=${book.id}&mode=quiz&order=random`} onClick={() => rememberBook(book.id)}>
                <Button size="sm">答题</Button>
              </Link>
              <Link href={`/practice?scope=book&bookId=${book.id}&mode=study&order=random`} onClick={() => rememberBook(book.id)}>
                <Button size="sm" variant="outline">
                  <Brain className="size-4" />
                  背题
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => rememberBook(book.id)}>
                设为默认
              </Button>
            </CardContent>
          </Card>
        );
        })}
      </div>
    </div>
  );
}
