'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

  const getValue = (key: string) => settings.find((s) => s.key === key)?.value || '';
  const announcementKeys = ['announcementEnabled', 'announcementTitle', 'announcementContent'];
  const generalSettings = settings.filter((item) => !announcementKeys.includes(item.key));

  const saveAnnouncement = async () => {
    const results = await Promise.all(
      announcementKeys.map((key) => {
        const item = settings.find((s) => s.key === key);
        return api.put(`/admin/settings/${key}`, { value: item?.value || '' });
      }),
    );
    if (results.every((res) => res.code === 0)) toast.success('公告已保存');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">系统设置</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>首页公告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>是否显示</Label>
            <div className="flex gap-2">
              {[
                { value: 'true', label: '显示' },
                { value: 'false', label: '隐藏' },
              ].map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant={getValue('announcementEnabled') === item.value ? 'default' : 'outline'}
                  onClick={() => setValue('announcementEnabled', item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="announcementTitle">公告标题</Label>
            <Input
              id="announcementTitle"
              value={getValue('announcementTitle')}
              onChange={(e) => setValue('announcementTitle', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="announcementContent">公告内容</Label>
            <Textarea
              id="announcementContent"
              value={getValue('announcementContent')}
              onChange={(e) => setValue('announcementContent', e.target.value)}
              rows={6}
            />
          </div>
          <Button onClick={saveAnnouncement} className="w-fit">保存公告</Button>
        </CardContent>
      </Card>

      <div className="space-y-4 max-w-lg">
        {generalSettings.map((s) => (
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
