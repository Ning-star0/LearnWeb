'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/settings').then((res) => {
      if (res.code === 0) setSettings(res.data);
    });
  }, []);

  const updateSetting = async (key: string) => {
    const item = settings.find((s) => s.key === key);
    if (!item) return;
    const res = await api.put(`/admin/settings/${key}`, { value: item.value });
    if (res.code === 0) toast.success('已保存');
  };

  const setValue = (key: string, value: string) => {
    setSettings(settings.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">系统设置</h1>
      <div className="space-y-4 max-w-lg">
        {settings.map((s) => (
          <Card key={s.key}>
            <CardHeader><CardTitle className="text-sm">{s.key}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input value={s.value} onChange={(e) => setValue(s.key, e.target.value)} />
                <Button onClick={() => updateSetting(s.key)}>保存</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
