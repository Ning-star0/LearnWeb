'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Image } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementPinned, setAnnouncementPinned] = useState(false);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const qrFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/admin/settings').then((res) => {
      if (res.code === 0) setSettings(res.data);
    });
    api.get('/settings/announcements', { cache: 'no-store' }).then((res) => {
      if (res.code === 0) setAnnouncements(res.data || []);
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
  const qrCodeKeys = ['paymentQrCode'];
  const generalSettings = settings.filter(
    (item) => !announcementKeys.includes(item.key) && !qrCodeKeys.includes(item.key),
  );
  const qrCodeUrl = getValue('paymentQrCode');

  const handleQrUpload = async () => {
    const file = qrFileRef.current?.files?.[0];
    if (!file) { toast.error('请选择图片'); return; }
    setQrUploading(true);
    const form = new FormData();
    form.append('file', file);
    const res = await api.upload('/admin/settings/qrcode', form);
    if (res.code === 0) {
      toast.success('收款码已更新');
      setSettings(settings.map((s) => (s.key === 'paymentQrCode' ? { ...s, value: res.data.url } : s)));
      if (qrFileRef.current) qrFileRef.current.value = '';
    } else {
      toast.error(res.message || '上传失败');
    }
    setQrUploading(false);
  };

  const saveAnnouncement = async () => {
    if (announcementSaving) return;
    setAnnouncementSaving(true);
    const res = await api.post('/admin/settings/announcement', {
      title: getValue('announcementTitle'),
      content: getValue('announcementContent'),
      enabled: getValue('announcementEnabled') !== 'false',
      pinned: announcementPinned,
    });
    if (res.code === 0) {
      toast.success('公告已发布');
      api.clearCache('/settings/announcement');
      api.clearCache('/settings/announcements');
      api.get('/settings/announcements', { cache: 'no-store' }).then((listRes) => {
        if (listRes.code === 0) setAnnouncements(listRes.data || []);
      });
    } else {
      toast.error(res.message || '保存失败');
    }
    setAnnouncementSaving(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">系统设置</h1>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>首页公告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
            每次保存会发布成一条历史公告。首页优先展示未读公告；全部已读时只展示置顶公告或最新公告。
          </p>
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
            <Label>首页优先级</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={announcementPinned ? 'default' : 'outline'}
                onClick={() => setAnnouncementPinned(true)}
              >
                置顶
              </Button>
              <Button
                type="button"
                variant={!announcementPinned ? 'default' : 'outline'}
                onClick={() => setAnnouncementPinned(false)}
              >
                普通
              </Button>
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
              rows={9}
            />
          </div>
          <Button onClick={saveAnnouncement} disabled={announcementSaving} className="w-fit">
            {announcementSaving ? '发布中...' : '发布公告'}
          </Button>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium">历史公告</h3>
            <div className="space-y-2">
              {announcements.length === 0 && (
                <p className="text-sm text-muted-foreground">暂无历史公告。</p>
              )}
              {announcements.slice(0, 20).map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{item.title}</div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {item.pinned && <span className="rounded border px-2 py-0.5">置顶</span>}
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 收款二维码上传 */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="size-5" />
            收款二维码
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {qrCodeUrl && (
            <div className="flex justify-center">
              <img
                src={qrCodeUrl}
                alt="收款码"
                className="w-48 h-48 object-contain border rounded-lg"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Input ref={qrFileRef} type="file" accept="image/*" className="cursor-pointer" />
            <Button onClick={handleQrUpload} disabled={qrUploading}>
              <Upload className="size-4 mr-1" />
              {qrUploading ? '上传中...' : '上传'}
            </Button>
          </div>
          {!qrCodeUrl && (
            <p className="text-sm text-muted-foreground">尚未设置收款二维码，用户支付页面将不显示收款码</p>
          )}
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
