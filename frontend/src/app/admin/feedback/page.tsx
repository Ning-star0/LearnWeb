'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const TYPE_LABELS: Record<string, string> = {
  QUESTION_ERROR: '题目错误', ANSWER_ERROR: '答案错误',
  AI_EXPLANATION_ERROR: 'AI解析错误', BUG: '网站Bug',
  ACCOUNT: '账号问题', SUPPORTER: '支持者问题',
  SUGGESTION: '功能建议', REPORT_ABUSE: '举报异常', OTHER: '其他',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100', PROCESSING: 'bg-blue-100',
  RESOLVED: 'bg-green-100', REJECTED: 'bg-gray-100', CLOSED: 'bg-gray-100',
};

export default function AdminFeedbackPage() {
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState('');

  const load = async () => {
    const params = new URLSearchParams();
    if (type !== 'ALL') params.set('type', type);
    if (status !== 'ALL') params.set('status', status);
    if (search) params.set('search', search);
    params.set('page', String(page));
    const res = await api.get(`/admin/feedback?${params}`);
    if (res.code === 0) setData(res.data);
  };

  useEffect(() => { load(); }, [type, status, page]);

  const handleStatus = async (id: string, newStatus: string) => {
    await api.patch(`/admin/feedback/${id}/status`, { status: newStatus });
    toast.success('状态已更新');
    load();
  };

  const handleReply = async () => {
    if (!selected) return;
    await api.post(`/admin/feedback/${selected.id}/reply`, { reply });
    toast.success('已回复');
    setSelected(null);
    setReply('');
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">反馈管理</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Select value={type} onValueChange={(v) => setType(v || 'ALL')}>
          <SelectTrigger className="w-40"><SelectValue placeholder="类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部类型</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v || 'ALL')}>
          <SelectTrigger className="w-36"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部状态</SelectItem>
            <SelectItem value="PENDING">待处理</SelectItem>
            <SelectItem value="PROCESSING">处理中</SelectItem>
            <SelectItem value="RESOLVED">已解决</SelectItem>
            <SelectItem value="CLOSED">已关闭</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="搜索..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
        <Button onClick={load}>筛选</Button>
      </div>

      <div className="space-y-2">
        {data.items?.map((fb: any) => (
          <Card key={fb.id} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2 items-center">
                <Badge variant="outline">{TYPE_LABELS[fb.type] || fb.type}</Badge>
                <Badge className={STATUS_COLORS[fb.status]}>{fb.status}</Badge>
                <span className="font-medium">{fb.title}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setSelected(fb)}>查看</Button>
                <Button size="sm" variant="outline" onClick={() => handleStatus(fb.id, 'RESOLVED')}>解决</Button>
                <Button size="sm" variant="outline" onClick={() => handleStatus(fb.id, 'CLOSED')}>关闭</Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">{fb.content}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {fb.user?.username} · {new Date(fb.createdAt).toLocaleString()}
              {fb.question && ` · 题目#${fb.question.id}`}
            </p>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
        <Button variant="outline" onClick={() => setPage(page + 1)}>下一页</Button>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>反馈详情</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex gap-2"><Badge>{TYPE_LABELS[selected.type]}</Badge><Badge>{selected.status}</Badge></div>
              <h3 className="font-bold">{selected.title}</h3>
              <p className="text-sm">{selected.content}</p>
              {selected.question && (
                <p className="text-sm text-muted-foreground">关联题目: #{selected.question.id} - {selected.question.stem?.slice(0, 50)}</p>
              )}
              <p className="text-xs text-muted-foreground">用户: {selected.user?.username} ({selected.user?.email})</p>
              {selected.adminReply && (
                <div className="p-3 bg-muted rounded">
                  <p className="text-sm font-medium">管理员回复:</p>
                  <p className="text-sm">{selected.adminReply}</p>
                </div>
              )}
              {!selected.adminReply && (
                <div className="space-y-2">
                  <Input placeholder="输入回复..." value={reply} onChange={(e) => setReply(e.target.value)} />
                  <Button onClick={handleReply}>回复并解决</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
