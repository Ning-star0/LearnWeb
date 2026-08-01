'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArchiveRestore,
  BarChart3,
  BookMarked,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileUp,
  LayoutDashboard,
  LibraryBig,
  ListChecks,
  Menu,
  Plus,
  Search,
  Settings2,
  Sigma,
  Tags,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { label: '首页', href: '/', icon: LayoutDashboard },
  { label: '错题库', href: '/questions', icon: ListChecks },
  { label: '今日复习', href: '/reviews', icon: CalendarCheck2, count: 6 },
  { label: '已做对', href: '/status/correct', icon: CheckCircle2 },
  { label: '已掌握', href: '/status/mastered', icon: BookMarked },
  { label: '反复错误', href: '/status/repeated-errors', icon: CircleAlert, count: 4 },
];

const manageNavigation = [
  { label: '教材与章节', href: '/textbooks', icon: LibraryBig },
  { label: '知识点', href: '/knowledge-points', icon: Sigma },
  { label: '错误类型', href: '/error-types', icon: Tags },
];

const systemNavigation = [
  { label: '周报与预报', href: '/reports/weekly', icon: BarChart3 },
  { label: 'AI 分析', href: '/ai', icon: BrainCircuit },
  { label: '导入与导出', href: '/imports', icon: FileUp },
  { label: '设置', href: '/settings', icon: Settings2 },
  { label: '回收站', href: '/trash', icon: ArchiveRestore },
];

function NavItem({ item, pathname, onNavigate }: {
  item: (typeof navigation)[number];
  pathname: string;
  onNavigate: () => void;
}) {
  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
        active
          ? 'bg-[var(--atlas-blue-soft)] font-semibold text-[var(--atlas-blue)]'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
      <span className="flex-1">{item.label}</span>
      {'count' in item && item.count ? (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-white text-[var(--atlas-blue)]' : 'bg-slate-100 text-slate-500'}`}>
          {item.count}
        </span>
      ) : null}
    </Link>
  );
}

function Sidebar({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
        <div className="grid size-10 place-items-center rounded-xl bg-[var(--atlas-blue)] text-white shadow-sm">
          <Sigma className="size-5" strokeWidth={2.4} />
        </div>
        <div>
          <div className="font-serif text-lg font-semibold tracking-tight text-slate-950">Mistake Atlas</div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">数学错题管理</div>
        </div>
      </div>

      <nav className="atlas-scroll flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <div className="space-y-1">
          {navigation.map((item) => <NavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />)}
        </div>
        <div>
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">知识体系</div>
          <div className="space-y-1">
            {manageNavigation.map((item) => <NavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />)}
          </div>
        </div>
        <div>
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">分析与系统</div>
          <div className="space-y-1">
            {systemNavigation.map((item) => <NavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />)}
          </div>
        </div>
      </nav>

      <div className="border-t border-slate-100 p-4">
        <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50">
          <div className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">白</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">baixing</div>
            <div className="text-xs text-slate-400">私人空间</div>
          </div>
          <ChevronDown className="size-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--atlas-canvas)] lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 lg:sticky lg:top-0 lg:block lg:h-screen">
        <Sidebar pathname={pathname} onNavigate={() => setOpen(false)} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="关闭导航" className="absolute inset-0 bg-slate-950/30" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-[286px] shadow-2xl">
            <button aria-label="关闭导航" className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
            <Sidebar pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur lg:px-8">
          <button aria-label="打开导航" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--atlas-blue)] focus:bg-white focus:ring-2 focus:ring-blue-100" placeholder="搜索题目、知识点、错因…" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs font-medium text-slate-400 xl:inline">2026 年 8 月 1 日 · 星期六</span>
            <Link href="/questions/new" className="atlas-button-primary">
              <Plus className="size-4" />
              新建错题
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        <footer className="px-6 pb-6 text-center text-xs text-slate-400">
          Mistake Atlas · 私人数学学习档案 · <a className="hover:text-slate-600" href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">冀ICP备2026007268号-1</a>
        </footer>
      </div>
    </div>
  );
}
