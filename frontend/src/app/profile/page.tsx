'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username || '');

  const handleUpdate = async () => {
    const res = await api.patch('/users/me', { username });
    if (res.code === 0) {
      toast.success('修改成功');
    } else {
      toast.error(res.message);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">个人中心</h1>
      <Card>
        <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>邮箱</Label>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div>
            <Label>角色</Label>
            <p className="text-sm text-muted-foreground">
              {user.role === 'SUPER_ADMIN' ? '超级管理员' : user.role === 'ADMIN' ? '管理员' : '普通用户'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <Button onClick={handleUpdate}>保存修改</Button>
        </CardContent>
      </Card>
    </div>
  );
}
