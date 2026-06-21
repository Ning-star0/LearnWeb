'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Edit3, Save, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const TYPE_LABEL: Record<string, string> = { SINGLE: '单选', MULTIPLE: '多选', JUDGE: '判断', SHORT: '简答' };

function AdminQuestionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [books, setBooks] = useState<any[]>([]);
  const [bookId, setBookId] = useState(searchParams.get('bookId') || '');
  const [type, setType] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(null);
  const [editStem, setEditStem] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editOptions, setEditOptions] = useState<{ label: string; content: string }[]>([]);

  useEffect(() => {
    api.get('/books').then((res) => { if (res.code === 0) setBooks(res.data); });
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (bookId) p.set('bookId', bookId);
    if (type) p.set('type', type);
    if (search) p.set('search', search);
    p.set('page', String(page));
    p.set('pageSize', '15');
    api.get(`/questions?${p}`).then((res) => {
      if (res.code === 0) { setQuestions(res.data.items); setTotal(res.data.total); }
    });
  }, [bookId, type, search, page]);

  const openEditor = async (q: any) => {
    const detail = await api.get(`/questions/${q.id}`);
    if (detail.code === 0) {
      setEditing(detail.data);
      setEditStem(detail.data.stem);
      setEditAnswer(detail.data.answerRaw || '');
      setEditOptions(detail.data.options?.map((o: any) => ({ label: o.label, content: o.content })) || []);
    }
  };

  const saveQuestion = async () => {
    if (!editing) return;
    const res = await api.put(`/questions/${editing.id}`, {
      stem: editStem,
      answerRaw: editAnswer,
      options: editing.type !== 'SHORT' ? editOptions : undefined,
    });
    if (res.code === 0) {
      toast.success('已保存');
      setEditing(null);
      setQuestions((prev) => prev.map((q) => (q.id === editing.id ? { ...q, stem: editStem } : q)));
    } else {
      toast.error(res.message || '保存失败');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">题目管理</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Select value={bookId || '_all'} onValueChange={(v) => { setBookId(v === '_all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="全部教材" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部教材</SelectItem>
            {books.map((b) => (<SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={type || '_all'} onValueChange={(v) => { setType(v === '_all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="全部题型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部题型</SelectItem>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
          </SelectContent>
        </Select>
        <Input placeholder="搜索题干..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
      </div>

      <div className="space-y-2">
        {questions.map((q) => (
          <Card key={q.id} className="p-3">
            <div className="flex items-start gap-2">
              <div className="flex gap-1 shrink-0">
                <Badge variant="outline">{TYPE_LABEL[q.type]}</Badge>
                <Badge variant="secondary">{q.book?.name}</Badge>
              </div>
              <p className="text-sm flex-1 line-clamp-2">{q.stem}</p>
              <Button size="sm" variant="ghost" onClick={() => openEditor(q)}>
                <Edit3 className="size-3 mr-1" />编辑
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
        <span className="text-sm self-center">共 {total} 题</span>
        <Button variant="outline" onClick={() => setPage(page + 1)}>下一页</Button>
      </div>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>编辑题目 #{editing?.id}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Badge>{TYPE_LABEL[editing.type]}</Badge> <Badge variant="secondary">{editing.book?.name}</Badge></div>
              <div className="space-y-2">
                <Label>题干</Label>
                <Input value={editStem} onChange={(e) => setEditStem(e.target.value)} />
              </div>
              {editing.type !== 'SHORT' && (
                <div className="space-y-2">
                  <Label>选项</Label>
                  {editOptions.map((o, i) => (
                    <div key={o.label} className="flex gap-2">
                      <span className="w-8 text-center font-bold pt-2">{o.label}</span>
                      <Input value={o.content} onChange={(e) => {
                        const next = [...editOptions];
                        next[i] = { ...next[i], content: e.target.value };
                        setEditOptions(next);
                      }} />
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Label>正确答案 {editing.type === 'JUDGE' ? '(True/False)' : editing.type === 'SHORT' ? '(参考答案文本)' : `(如: ${editing.type === 'MULTIPLE' ? 'A,B' : 'A'})`}</Label>
                <Input value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} />
              </div>
              <Button onClick={saveQuestion} className="w-full"><Save className="size-4 mr-1" />保存修改</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminQuestionsWrapper() {
  return <Suspense fallback={<div className="text-center py-8">加载中...</div>}><AdminQuestionsPage /></Suspense>;
}
