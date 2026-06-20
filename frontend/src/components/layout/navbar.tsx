'use client';

import Link from 'next/link';
import { BookOpen, ClipboardList, History, Home, Search, Target } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Home className="size-4" />
          思政刷题系统
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/books" className="hidden items-center gap-1 text-sm hover:underline sm:flex">
            <BookOpen className="size-4" /><span>教材</span>
          </Link>
          <Link href="/questions" className="hidden items-center gap-1 text-sm hover:underline sm:flex">
            <Search className="size-4" /><span>题库</span>
          </Link>

          {user ? (
            <>
              <Link href="/practice/select">
                <Button size="sm">
                  <ClipboardList className="size-4" />
                  刷题
                </Button>
              </Link>
              <Link href="/wrong" className="hidden items-center gap-1 text-sm hover:underline md:flex">
                <Target className="size-4" />
                <span>错题本</span>
              </Link>
              <Link href="/review" className="hidden text-sm hover:underline md:inline">
                待背题
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Link href="/profile">个人中心</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/history"><History className="inline size-4 mr-1" />做对的题</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem>
                      <Link href="/admin">管理后台</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout}>退出登录</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">登录</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">注册</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
