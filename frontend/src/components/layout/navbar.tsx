'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BookOpen, History, Home, Search, Target } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const booksActive = pathname.startsWith('/books');
  const questionsActive = pathname.startsWith('/questions');
  const practiceActive = pathname.startsWith('/practice');
  const wrongActive = pathname.startsWith('/wrong');

  const navItemClass = (active: boolean, hiddenClass = '') =>
    `h-8 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm font-medium transition ${hiddenClass} ${
      active
        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-100'
        : 'border-transparent hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* 左侧品牌 - 固定宽度避免偏移 */}
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold whitespace-nowrap">
          <Home className="size-4" />
          思政刷题系统
        </Link>

        {/* 右侧导航 - 保持最小宽度 */}
        <nav className="flex items-center gap-1 sm:gap-3 min-w-0 shrink-0">
          <Link href="/#announcement" className={navItemClass(false, 'hidden md:flex')}>
            <Bell className="size-4" /><span className="hidden lg:inline">公告</span>
          </Link>
          <Link href="/books" className={navItemClass(booksActive, 'hidden sm:flex')}>
            <BookOpen className="size-4" /><span className="hidden md:inline">教材</span>
          </Link>
          <Link href="/questions" className={navItemClass(questionsActive, 'hidden sm:flex')}>
            <Search className="size-4" /><span className="hidden md:inline">题库</span>
          </Link>

          {user ? (
            <>
              <Link
                href="/practice/select"
                className={navItemClass(practiceActive, 'inline-flex')}
              >
                刷题
              </Link>
              <Link href="/wrong" className={navItemClass(wrongActive, 'hidden lg:flex')}>
                <Target className="size-4" /><span>错题本</span>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger className="shrink-0">
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem>
                    <Link href="/profile" className="w-full">个人中心</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/history" className="w-full"><History className="inline size-4 mr-1" />做对的题</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/review" className="w-full">待背题</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem>
                      <Link href="/admin" className="w-full">管理后台</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout}>退出登录</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login" className="shrink-0">
                <Button variant="outline" size="sm">登录</Button>
              </Link>
              <Link href="/register" className="shrink-0">
                <Button size="sm">注册</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
