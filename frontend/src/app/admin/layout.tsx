'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const MENU = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: '用户管理' },
  { href: '/admin/banks', label: '题库管理' },
  { href: '/admin/feedback', label: '反馈管理' },
  { href: '/admin/payments', label: '付款审核' },
  { href: '/admin/security', label: '安全风控' },
  { href: '/admin/settings', label: '系统设置' },
  { href: '/admin/logs', label: '操作日志' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isAdmin) {
    return <div className="max-w-lg mx-auto px-4 py-12 text-center">无权访问</div>;
  }

  const Sidebar = () => (
    <nav className="space-y-1">
      {MENU.map((item) => (
        <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
          <Button
            variant={pathname === item.href ? 'secondary' : 'ghost'}
            className="w-full justify-start text-sm"
          >
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* 桌面端侧边栏 */}
      <aside className="w-56 border-r p-4 hidden md:block">
        <h2 className="font-bold mb-4">管理后台</h2>
        <Sidebar />
        <div className="mt-4">
          <Link href="/"><Button variant="outline" size="sm" className="w-full">← 返回前台</Button></Link>
        </div>
      </aside>

      {/* 移动端汉堡菜单 */}
      <div className="md:hidden p-4 border-b w-full flex items-center justify-between">
        <h2 className="font-bold">管理后台</h2>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm"><Menu className="size-4" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 pt-10">
            <Sidebar />
            <div className="mt-4">
              <Link href="/" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">← 返回前台</Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 p-4 md:p-6 overflow-x-auto">{children}</main>
    </div>
  );
}
