'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const MENU = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: '用户管理' },
  { href: '/admin/banks', label: '题库管理' },
  { href: '/admin/feedback', label: '反馈管理' },
  { href: '/admin/payments', label: '付款审核' },
  { href: '/admin/security', label: '安全风控' },
  { href: '/admin/supporters', label: '支持者管理' },
  { href: '/admin/settings', label: '系统设置' },
  { href: '/admin/logs', label: '操作日志' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <div className="max-w-lg mx-auto px-4 py-12 text-center">无权访问</div>;
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-56 border-r p-4 hidden md:block">
        <h2 className="font-bold mb-4">管理后台</h2>
        <nav className="space-y-1">
          {MENU.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className="w-full justify-start text-sm"
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
        <div className="mt-4">
          <Link href="/"><Button variant="outline" size="sm" className="w-full">← 返回前台</Button></Link>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-x-auto">{children}</main>
    </div>
  );
}
