'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any>({ items: [], total: 0 });

  useEffect(() => {
    api.get('/admin/logs?pageSize=100').then((res) => {
      if (res.code === 0) setLogs(res.data);
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">操作日志</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left p-3">时间</th><th className="text-left p-3">管理员</th><th className="text-left p-3">操作</th><th className="text-left p-3">目标</th><th className="text-left p-3">详情</th></tr></thead>
          <tbody>
            {logs.items?.map((log: any) => (
              <tr key={log.id} className="border-b">
                <td className="p-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="p-3">{log.admin?.username}</td>
                <td className="p-3"><Badge variant="outline">{log.action}</Badge></td>
                <td className="p-3">{log.target}</td>
                <td className="p-3 text-muted-foreground">{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
