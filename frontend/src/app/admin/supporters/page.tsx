'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminSupportersPage() {
  const [supporters, setSupporters] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  const [note, setNote] = useState('');

  const load = async () => {
    const res = await api.get('/admin/supporters');
    if (res.code === 0) setSupporters(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleGrant = async () => {
    const res = await api.post('/admin/supporters', {
      userId: parseInt(userId),
      note,
    });
    if (res.code === 0) {
      toast.success('已开通支持者权限');
      load();
    } else {
      toast.error(res.message);
    }
  };

  const handleRevoke = async (uid: number) => {
    await api.delete(`/admin/supporters/${uid}`);
    toast.success('已取消');
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">支持者管理</h1>
      <Card className="p-4 mb-4 max-w-md">
        <h3 className="font-medium mb-2">开通支持者权限</h3>
        <div className="flex gap-2 mb-2">
          <Input placeholder="用户 ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <Input placeholder="备注" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button onClick={handleGrant}>开通</Button>
        </div>
      </Card>
      <div className="space-y-2">
        {supporters.map((s: any) => (
          <Card key={s.id} className="p-4 flex items-center justify-between">
            <div>
              <span className="font-medium">{s.user?.username}</span>
              <span className="text-sm text-muted-foreground ml-2">{s.user?.email}</span>
            </div>
            <div className="flex gap-2 items-center">
              <Badge>{s.type}</Badge>
              <span className="text-sm">{new Date(s.createdAt).toLocaleDateString()}</span>
              <Button size="sm" variant="destructive" onClick={() => handleRevoke(s.userId)}>取消</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
