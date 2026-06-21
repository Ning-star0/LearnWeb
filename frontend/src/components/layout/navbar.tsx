'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Bell, BookMarked, BookOpen, History, Home, LogOut, MessageSquare, Search, ShieldCheck, Target, UserCircle } from 'lucide-react';
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
  const router = useRouter();
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

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

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
          <Link href="/announcements" className={navItemClass(pathname.startsWith('/announcements'), 'hidden md:flex')}>
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
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem>
                    <Link href="/profile" className="flex w-full items-center gap-2">
                      <UserCircle className="size-4" />
                      个人中心
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/history" className="flex w-full items-center gap-2">
                      <History className="size-4" />
                      做对的题
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/review" className="flex w-full items-center gap-2">
                      <BookMarked className="size-4" />
                      待背题
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/feedback" className="flex w-full items-center gap-2">
                      <MessageSquare className="size-4" />
                      反馈
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem>
                      <Link href="/admin" className="flex w-full items-center gap-2">
                        <ShieldCheck className="size-4" />
                        管理后台
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                    <LogOut className="size-4" />
                    退出登录
                  </DropdownMenuItem>
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
