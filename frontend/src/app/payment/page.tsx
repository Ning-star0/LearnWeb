'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, CheckCircle, Clock, CreditCard, Sparkles, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function PaymentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [proofs, setProofs] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    api.get('/payment/status').then((res) => {
      if (res.code === 0) setStatus(res.data);
    });
    api.get('/payment/proofs').then((res) => {
      if (res.code === 0) setProofs(res.data);
    });
    api.get('/admin/settings').then((res) => {
      if (res.code === 0) {
        const qr = res.data.find((s: any) => s.key === 'paymentQrCode');
        if (qr) setQrCodeUrl(qr.value);
      }
    }).catch(() => {});
  }, [user, router]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error('请选择付款截图'); return; }
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('note', note);
    const res = await api.upload('/payment/proof', form);
    if (res.code === 0) {
      toast.success('付款截图已提交');
      setProofs([res.data, ...proofs]);
      setNote('');
      if (fileRef.current) fileRef.current.value = '';
    } else {
      toast.error(res.message || '上传失败');
    }
    setUploading(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <CreditCard className="size-6" />
        AI 解析订阅
      </h1>

      {/* 当前状态 */}
      {status && (
        <Card>
          <CardHeader><CardTitle>当前状态</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {status.isAdmin ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="size-5" /> 管理员，AI 解析无限制
              </div>
            ) : status.subscribed ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="size-5" /> 已订阅，到期：{new Date(status.expiresAt).toLocaleDateString()}
              </div>
            ) : status.trial ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <Clock className="size-5" /> 试用中
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${(status.used / 5) * 100}%` }} />
                </div>
                <p className="text-sm text-muted-foreground">已用 {status.used}/5 次，剩余 {status.remaining} 次</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                试用次数已用完，请订阅后继续使用 AI 解析
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 价格信息 */}
      <Card>
        <CardHeader><CardTitle>订阅方案</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-bold text-lg flex items-center gap-1">
                <Sparkles className="size-5 text-blue-500" />
                AI 解析包月
              </p>
              <p className="text-sm text-muted-foreground">解锁全部 AI 解析功能</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">2.9<span className="text-sm font-normal text-muted-foreground">元/月</span></p>
            </div>
          </div>

          <Separator />

          {/* 付款说明 */}
          <div className="text-sm text-muted-foreground space-y-3">
            {qrCodeUrl && (
              <div className="flex justify-center mb-2">
                <img src={`http://localhost:3000${qrCodeUrl}`} alt="收款码" className="w-48 h-48 object-contain border rounded-lg" />
              </div>
            )}
            <p className="font-medium text-foreground">付款步骤：</p>
            <p>1. 扫描上方收款二维码完成付款（2.9 元）</p>
            <p>2. 截图保存付款记录</p>
            <p>3. 在下方上传截图</p>
            <p>4. 等待管理员审核通过（24 小时内）</p>
          </div>
        </CardContent>
      </Card>

      {/* 上传付款截图 */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="size-5" />上传付款截图</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="cursor-pointer"
          />
          <Input
            placeholder="备注（选填）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            <Upload className="size-4 mr-1" />
            {uploading ? '上传中...' : '提交审核'}
          </Button>
        </CardContent>
      </Card>

      {/* 付款历史 */}
      {proofs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>付款记录</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {proofs.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm p-2 border rounded">
                <div>
                  <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</span>
                  {p.note && <span className="ml-2 text-muted-foreground">- {p.note}</span>}
                </div>
                <Badge variant={p.status === 'APPROVED' ? 'default' : p.status === 'REJECTED' ? 'destructive' : 'outline'}>
                  {p.status === 'APPROVED' ? '已通过' : p.status === 'REJECTED' ? '已拒绝' : '审核中'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
