'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TYPE_LABEL: Record<string, string> = { SINGLE: '单选', MULTIPLE: '多选', JUDGE: '判断', SHORT: '简答' };

export default function HistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    api.get('/practice/history').then((res) => {
      if (res.code === 0) setItems(res.data.items);
    });
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <CheckCircle2 className="size-6 text-green-500" />
        做对的题
      </h1>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">还没有做对的题目记录</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0">{TYPE_LABEL[item.question?.type]}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{item.question?.stem}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.question?.book?.name} · {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/practice?ids=${item.questionId}&mode=quiz`}>
                    <Button variant="ghost" size="sm">重温</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 space-x-2">
        <Link href="/questions"><Button variant="outline" size="sm">浏览题库</Button></Link>
        <Link href="/wrong"><Button variant="outline" size="sm">错题本</Button></Link>
      </div>
    </div>
  );
}
