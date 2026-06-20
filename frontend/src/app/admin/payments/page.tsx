'use client';

import { useEffect, useState } from 'react';
import { Check, Eye, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function AdminPaymentsPage() {
  const [proofs, setProofs] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const load = async () => {
    const res = await api.get('/admin/payments');
    if (res.code === 0) setProofs(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    if (!confirm('确定通过此付款？用户将获得 30 天 AI 解析权限。')) return;
    await api.patch(`/admin/payments/${id}/approve`, {});
    toast.success('已通过');
    load();
  };

  const handleReject = async (id: string) => {
    if (!confirm('确定拒绝此付款？')) return;
    await api.patch(`/admin/payments/${id}/reject`, {});
    toast.success('已拒绝');
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">付款审核</h1>

      <div className="space-y-2">
        {proofs.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{p.user?.username}</span>
                  <span className="text-sm text-muted-foreground">{p.user?.email}</span>
                  <Badge variant={
                    p.status === 'APPROVED' ? 'default' :
                    p.status === 'REJECTED' ? 'destructive' : 'outline'
                  }>
                    {p.status === 'APPROVED' ? '已通过' :
                     p.status === 'REJECTED' ? '已拒绝' : '待审核'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString()}
                  {p.note && ` · 备注：${p.note}`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setPreviewImage(p.imageUrl)}>
                  <Eye className="size-3 mr-1" />查看截图
                </Button>
                {p.status === 'PENDING' && (
                  <>
                    <Button size="sm" variant="default" onClick={() => handleApprove(p.id)}>
                      <Check className="size-3 mr-1" />通过
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(p.id)}>
                      <X className="size-3 mr-1" />拒绝
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
        {proofs.length === 0 && (
          <p className="text-center text-muted-foreground py-8">暂无付款记录</p>
        )}
      </div>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>付款截图</DialogTitle></DialogHeader>
          {previewImage && (
            <img
              src={`http://localhost:3000${previewImage}`}
              alt="付款截图"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
