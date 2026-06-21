'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Database, FileSpreadsheet, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Bank {
  id: number;
  name: string;
  isPublic: boolean;
  book?: { name?: string };
  _count?: { questions?: number };
}

interface Book {
  id: number;
  name: string;
  _count?: { questions?: number };
}

export default function AdminBanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [books, setBooks] = useState<Book[]>([]);

  const loadBanks = async () => {
    const [bankRes, bookRes] = await Promise.all([
      api.get('/admin/banks'),
      api.get('/books'),
    ]);
    if (bankRes.code === 0) setBanks(bankRes.data);
    if (bookRes.code === 0) setBooks(bookRes.data);
  };

  useEffect(() => { loadBanks(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此题库？')) return;
    await api.delete(`/admin/banks/${id}`);
    toast.success('已删除');
    loadBanks();
  };

  const totalQuestions = books.reduce((sum, book) => sum + (book._count?.questions || 0), 0);
  const batchQuestions = banks.reduce((sum, bank) => sum + (bank._count?.questions || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">题库管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            学生学习使用的是按教材汇总后的统一题库池；下方列表是每次导入形成的批次。
          </p>
        </div>
        <Link href="/admin/banks/upload">
          <Button>
            <Upload className="size-4" />
            上传题库
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg border bg-muted p-2"><Database className="size-4" /></div>
            <div>
              <p className="text-sm text-muted-foreground">统一题库池</p>
              <p className="text-2xl font-semibold">{totalQuestions}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg border bg-muted p-2"><BookOpen className="size-4" /></div>
            <div>
              <p className="text-sm text-muted-foreground">教材数量</p>
              <p className="text-2xl font-semibold">{books.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg border bg-muted p-2"><FileSpreadsheet className="size-4" /></div>
            <div>
              <p className="text-sm text-muted-foreground">导入批次题量</p>
              <p className="text-2xl font-semibold">{batchQuestions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">按教材汇总</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {books.map((book) => (
            <div key={book.id} className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">{book.name}</span>
              <Badge variant="secondary">{book._count?.questions || 0} 题</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">导入批次</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
        {banks.map((bank) => (
          <div key={bank.id} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{bank.name}</p>
              <p className="text-sm text-muted-foreground">
                {bank.book?.name} · {bank._count?.questions || 0} 题
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{bank.isPublic ? '公开' : '私有'}</Badge>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(bank.id)}>删除</Button>
            </div>
          </div>
        ))}
        </CardContent>
      </Card>
    </div>
  );
}
