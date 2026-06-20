'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100', MEDIUM: 'bg-yellow-100', HIGH: 'bg-orange-100', CRITICAL: 'bg-red-100',
};

export default function AdminSecurityPage() {
  const [stats, setStats] = useState<any>(null);
  const [flags, setFlags] = useState<any>({ items: [], total: 0 });

  useEffect(() => {
    api.get('/admin/security/stats').then((res) => {
      if (res.code === 0) setStats(res.data);
    });
    api.get('/admin/risk-flags?pageSize=50').then((res) => {
      if (res.code === 0) setFlags(res.data);
    });
  }, []);

  const handleResolve = async (id: string) => {
    await api.patch(`/admin/risk-flags/${id}/resolve`);
    setFlags((prev: any) => ({
      ...prev,
      items: prev.items.map((f: any) =>
        f.id === id ? { ...f, status: 'RESOLVED' } : f
      ),
    }));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">安全风控</h1>

      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            ['AI 查看总数', stats.aiViewTotal],
            ['AI 生成数', stats.aiGenTotal],
            ['缓存命中率', stats.cacheHitRate],
            ['今日限流', stats.todayRateLimited],
            ['高风险用户', stats.highRiskUsers],
            ['待处理反馈', stats.pendingFeedback],
          ].map(([label, value]) => (
            <Card key={label} className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-lg font-bold mb-3">风险事件</h2>
      <div className="space-y-2">
        {flags.items?.map((f: any) => (
          <Card key={f.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <Badge className={RISK_COLORS[f.level]}>{f.level}</Badge>
                <Badge variant="outline">{f.type}</Badge>
                <span className="text-sm">{f.reason}</span>
              </div>
              <div className="flex gap-2 items-center">
                {f.user && <span className="text-xs text-muted-foreground">{f.user.username}</span>}
                <Badge variant={f.status === 'OPEN' ? 'destructive' : 'secondary'}>{f.status}</Badge>
                {f.status === 'OPEN' && (
                  <Button size="sm" variant="outline" onClick={() => handleResolve(f.id)}>已处理</Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              IP: {f.ip} · {new Date(f.createdAt).toLocaleString()}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
