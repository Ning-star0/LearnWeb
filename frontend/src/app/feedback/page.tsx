'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const TYPE_LABELS: Record<string, string> = {
  QUESTION_ERROR: '题目错误',
  ANSWER_ERROR: '答案错误',
  AI_EXPLANATION_ERROR: 'AI 解析错误',
  BUG: '系统问题',
  ACCOUNT: '账号问题',
  SUPPORTER: '订阅问题',
  SUGGESTION: '功能建议',
  REPORT_ABUSE: '举报异常',
  OTHER: '其他',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已解决',
  REJECTED: '已驳回',
  CLOSED: '已关闭',
};

interface FeedbackItem {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  adminReply?: string | null;
  createdAt: string;
  question?: { id: number; stem: string; type: string } | null;
}

function FeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const questionId = searchParams.get('questionId') || '';
  const [type, setType] = useState(questionId ? 'QUESTION_ERROR' : 'SUGGESTION');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  const loadFeedbacks = async () => {
    const res = await api.get('/feedback/my');
    if (res.code === 0) setItems(res.data || []);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadFeedbacks();
  }, [loading, user, router]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = window.setInterval(() => {
      setRetryAfter((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAfter]);

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('请填写标题和反馈内容');
      return;
    }
    setSubmitting(true);
    const res = await api.post('/feedback', {
      type,
      title: title.trim(),
      content: content.trim(),
      questionId: questionId ? Number(questionId) : undefined,
    });
    setSubmitting(false);
    if (res.code === 0) {
      toast.success(res.data?.message || '反馈已提交');
      setTitle('');
      setContent('');
      loadFeedbacks();
    } else {
      if (res.retryAfter) {
        setRetryAfter(Number(res.retryAfter));
        toast.error(`提交太频繁，请 ${res.retryAfter} 秒后再试`);
        return;
      }
      toast.error(res.message || '提交失败');
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-5 text-blue-500" />
            提交反馈
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questionId && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              本次反馈将关联题目 #{questionId}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <div className="space-y-2">
              <Label>反馈类型</Label>
              <Select value={type} onValueChange={(value) => setType(value || 'OTHER')}>
                <SelectTrigger>
                  <span data-slot="select-value" className="flex flex-1 text-left">
                    {TYPE_LABELS[type] || '其他'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-title">标题</Label>
              <Input
                id="feedback-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
                placeholder="简单说明问题"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-content">内容</Label>
            <Textarea
              id="feedback-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={2000}
              rows={8}
              placeholder="请描述你遇到的问题、建议，或需要管理员处理的内容。"
            />
            <div className="text-right text-xs text-muted-foreground">{content.length} / 2000</div>
          </div>
          <Button onClick={submit} disabled={submitting || retryAfter > 0} className="w-full sm:w-auto">
            <Send className="size-4" />
            {submitting ? '提交中...' : retryAfter > 0 ? `${retryAfter} 秒后可再反馈` : '提交反馈'}
          </Button>
        </CardContent>
      </Card>

      <aside className="space-y-3">
        <h2 className="text-lg font-semibold">我的反馈</h2>
        {items.length === 0 && (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">暂无反馈记录。</div>
        )}
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{TYPE_LABELS[item.type] || item.type}</Badge>
                <Badge variant="secondary">{STATUS_LABELS[item.status] || item.status}</Badge>
              </div>
              <div className="font-medium">{item.title}</div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
              {item.question && (
                <p className="text-xs text-muted-foreground">关联题目 #{item.question.id}</p>
              )}
              {item.adminReply && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <div className="mb-1 font-medium">管理员回复</div>
                  <p className="whitespace-pre-wrap text-muted-foreground">{item.adminReply}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </aside>
    </div>
  );
}

export default function FeedbackPageWrapper() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-8 text-center">加载中...</div>}>
      <FeedbackPage />
    </Suspense>
  );
}
