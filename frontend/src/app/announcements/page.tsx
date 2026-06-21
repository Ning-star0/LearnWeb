'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface Announcement {
  enabled: boolean;
  title: string;
  content: string;
}

export default function AnnouncementsPage() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    api.get('/settings/announcement').then((res) => {
      if (res.code === 0 && res.data?.enabled) setAnnouncement(res.data);
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:py-8">
      <div className="mb-5">
        <Badge variant="secondary" className="mb-2">公告</Badge>
        <h1 className="text-2xl font-semibold">公告中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">查看当前公告和历史公告。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5 text-blue-500" />
            {announcement?.title || '当前没有公告'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {announcement ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {announcement.content}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">管理员暂未发布公告。</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        历史公告会在管理员发布多条公告后展示；当前系统使用后台公告设置作为最新公告来源。
      </div>
    </div>
  );
}
