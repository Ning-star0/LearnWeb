'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any>({ items: [], total: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadUsers = async () => {
    const res = await api.get(`/admin/users?search=${search}&page=${page}`);
    if (res.code === 0) setUsers(res.data);
  };

  useEffect(() => { loadUsers(); }, [page]);

  const handleRole = async (userId: number, role: string) => {
    await api.patch(`/admin/users/${userId}/role`, { role });
    toast.success('角色已更新');
    loadUsers();
  };

  const handleStatus = async (userId: number, status: string) => {
    await api.patch(`/admin/users/${userId}/status`, { status });
    toast.success('状态已更新');
    loadUsers();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">用户管理</h1>
      <div className="flex gap-2 mb-4">
        <Input placeholder="搜索邮箱或用户名..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button onClick={loadUsers}>搜索</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left p-3">ID</th><th className="text-left p-3">用户名</th><th className="text-left p-3">邮箱</th><th className="text-left p-3">角色</th><th className="text-left p-3">状态</th><th className="text-left p-3">操作</th></tr></thead>
          <tbody>
            {users.items?.map((u: any) => (
              <tr key={u.id} className="border-b">
                <td className="p-3">{u.id}</td>
                <td className="p-3">{u.username}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3"><Badge variant={u.role === 'SUPER_ADMIN' ? 'destructive' : 'secondary'}>{u.role}</Badge></td>
                <td className="p-3"><Badge variant={u.status === 'ACTIVE' ? 'default' : 'outline'}>{u.status}</Badge></td>
                <td className="p-3 space-x-1">
                  <Button size="sm" variant="outline" onClick={() => handleRole(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}>切换角色</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatus(u.id, u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE')}>
                    {u.status === 'ACTIVE' ? '禁用' : '启用'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
        <Button variant="outline" onClick={() => setPage(page + 1)}>下一页</Button>
      </div>
    </div>
  );
}
