'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface Announcement {
  id: string;
  enabled: boolean;
  title: string;
  content: string;
  pinned?: boolean;
  createdAt?: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    api.get('/settings/announcements').then((res) => {
      if (res.code === 0 && Array.isArray(res.data)) {
        setAnnouncements(res.data.filter((item: Announcement) => item.enabled));
      }
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:py-8">
      <div className="mb-5">
        <Badge variant="secondary" className="mb-2">公告</Badge>
        <h1 className="text-2xl font-semibold">公告中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">查看管理员发布过的公告。</p>
      </div>

      <div className="space-y-3">
        {announcements.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5 text-blue-500" />
                当前没有公告
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">管理员暂未发布公告。</p>
            </CardContent>
          </Card>
        )}
        {announcements.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5 text-blue-500" />
                <span>{item.title}</span>
                {item.pinned && <Badge variant="outline">置顶</Badge>}
              </CardTitle>
              {item.createdAt && (
                <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
              )}
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {item.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
