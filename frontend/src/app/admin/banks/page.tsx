'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminBanksPage() {
  const [banks, setBanks] = useState<any[]>([]);

  const loadBanks = async () => {
    const res = await api.get('/admin/banks');
    if (res.code === 0) setBanks(res.data);
  };

  useEffect(() => { loadBanks(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此题库？')) return;
    await api.delete(`/admin/banks/${id}`);
    toast.success('已删除');
    loadBanks();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">题库管理</h1>
        <Link href="/admin/banks/upload"><Button>上传题库</Button></Link>
      </div>
      <div className="space-y-2">
        {banks.map((bank: any) => (
          <Card key={bank.id} className="p-4 flex items-center justify-between">
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
          </Card>
        ))}
      </div>
    </div>
  );
}
