'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/admin/dashboard').then((res) => {
      if (res.code === 0) setStats(res.data);
    });
  }, []);

  if (!stats) return <p>加载中...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          ['用户总数', stats.userCount],
          ['教材数量', stats.bookCount],
          ['题库数量', stats.bankCount],
          ['题目数量', stats.questionCount],
          ['今日答题', stats.todayAnswerCount],
          ['错题总数', stats.wrongCount],
          ['AI 解析', stats.aiCount],
          ['支持者', stats.supporterCount],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">最近上传题库</CardTitle></CardHeader>
          <CardContent>
            {stats.recentBanks?.map((bank: any) => (
              <div key={bank.id} className="text-sm py-1">
                {bank.name} - {bank.book?.name}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">最近注册用户</CardTitle></CardHeader>
          <CardContent>
            {stats.recentUsers?.map((u: any) => (
              <div key={u.id} className="text-sm py-1">{u.username} ({u.email})</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
