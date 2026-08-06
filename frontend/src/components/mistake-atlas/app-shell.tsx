'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ArchiveRestore, BarChart3, BookMarked, BookOpenCheck, BrainCircuit, CalendarCheck2,
  CheckCircle2, ChevronDown, CircleAlert, Cpu, FileUp, Languages,
  Landmark, LayoutDashboard, LibraryBig, ListChecks, LogOut, Menu, Plus,
  PanelLeftClose, PanelLeftOpen, Search, Settings2, Sigma, Tags, X,
} from 'lucide-react';
import { useState } from 'react';
import { logoutAction } from '@/app/actions/auth-actions';

type SubjectItem = { id: string; slug: string; name: string; shortName: string; enabled: boolean; color: string };

const mainNavigation = [
  { label: '首页', href: '/', icon: LayoutDashboard },
  { label: '错题库', href: '/questions', icon: ListChecks },
  { label: '今日复习', href: '/reviews', icon: CalendarCheck2, countKey: 'review' as const },
  { label: '最近做对', href: '/status/correct', icon: CheckCircle2 },
  { label: '已掌握', href: '/status/mastered', icon: BookMarked },
  { label: '反复错误', href: '/status/repeated-errors', icon: CircleAlert, countKey: 'repeated' as const },
];
const manageNavigation = [
  { label: '教材与章节', href: '/textbooks', icon: LibraryBig },
  { label: '知识点', href: '/knowledge-points', icon: Sigma },
  { label: '公式与技巧', href: '/memory', icon: BookOpenCheck },
  { label: '错误类型', href: '/error-types', icon: Tags },
];
const systemNavigation = [
  { label: '周报与预报', href: '/reports/weekly', icon: BarChart3 },
  { label: 'AI 分析', href: '/ai', icon: BrainCircuit },
  { label: '系统数据', href: '/imports', icon: FileUp },
  { label: '设置', href: '/settings', icon: Settings2 },
  { label: '回收站', href: '/trash', icon: ArchiveRestore },
];

const subjectIcons = { mathematics: Sigma, 'cs-408': Cpu, english: Languages, politics: Landmark };

function NavItem({ item, pathname, onNavigate, count, collapsed = false }: {
  item: { label: string; href: string; icon: typeof LayoutDashboard };
  pathname: string; onNavigate: () => void; count?: number; collapsed?: boolean;
}) {
  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined} className={`group flex h-10 items-center rounded-lg text-sm transition-colors ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${active ? 'bg-[var(--atlas-blue-soft)] font-semibold text-[var(--atlas-blue)]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}>
      <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
      {!collapsed ? <span className="flex-1">{item.label}</span> : null}
      {!collapsed && count ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-white text-[var(--atlas-blue)]' : 'bg-slate-100 text-slate-500'}`}>{count}</span> : null}
    </Link>
  );
}

function Sidebar({ pathname, onNavigate, site, user, subjects, counts, collapsed = false, onToggle }: {
  pathname: string; onNavigate: () => void;
  site: { name: string; subtitle: string };
  user: { username: string; displayName: string };
  subjects: SubjectItem[]; counts: { review: number; repeated: number };
  collapsed?: boolean; onToggle?: () => void;
}) {
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  return (
    <div className="flex h-full flex-col bg-white">
      <div className={`flex h-20 items-center border-b border-slate-100 ${collapsed ? 'justify-center px-2' : 'gap-3 px-5'}`}>
        {!collapsed ? <><Image src="/api/site-icon" alt="" width={40} height={40} unoptimized className="size-10 rounded-xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className="truncate font-serif text-lg font-semibold tracking-tight text-slate-950">{site.name}</div><div className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{site.subtitle}</div></div></> : null}
        {onToggle ? <button type="button" onClick={onToggle} title={collapsed ? '展开侧栏' : '收起侧栏'} className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">{collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}</button> : null}
      </div>

      <div className={`border-b border-slate-100 py-3 ${collapsed ? 'px-2' : 'px-4'}`}>
        <button type="button" title={collapsed ? '数学模块' : undefined} onClick={() => setSubjectsOpen(!subjectsOpen)} className={`flex w-full items-center rounded-xl bg-slate-50 text-left hover:bg-slate-100 ${collapsed ? 'h-10 justify-center' : 'gap-3 px-3 py-2.5'}`}>
          <Sigma className="size-4 shrink-0 text-[var(--atlas-blue)]" />{!collapsed ? <><div className="flex-1"><div className="text-xs font-semibold text-slate-800">数学</div><div className="text-[10px] text-emerald-600">完整启用</div></div><ChevronDown className={`size-4 text-slate-400 transition ${subjectsOpen ? 'rotate-180' : ''}`} /></> : null}
        </button>
        {subjectsOpen && !collapsed ? <div className="mt-2 space-y-1 rounded-xl border border-slate-100 p-2">
          {subjects.map((subject) => { const Icon = subjectIcons[subject.slug as keyof typeof subjectIcons] || LibraryBig; return <div key={subject.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs"><Icon className="size-4" style={{ color: subject.color }} /><span className="flex-1 text-slate-600">{subject.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] ${subject.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{subject.enabled ? '已启用' : '框架预留'}</span></div>; })}
        </div> : null}
      </div>

      <nav className={`atlas-scroll flex-1 space-y-6 overflow-y-auto py-5 ${collapsed ? 'px-2' : 'px-4'}`}>
        <div className="space-y-1">{mainNavigation.map((item) => <NavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} count={'countKey' in item ? counts[item.countKey!] : undefined} />)}</div>
        <div>{!collapsed ? <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">数学知识体系</div> : null}<div className="space-y-1">{manageNavigation.map((item) => <NavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />)}</div></div>
        <div>{!collapsed ? <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">分析与系统</div> : null}<div className="space-y-1">{systemNavigation.map((item) => <NavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />)}</div></div>
      </nav>

      <div className={`border-t border-slate-100 ${collapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex w-full items-center rounded-xl p-2 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{user.displayName.slice(0, 1)}</div>
          {!collapsed ? <><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{user.username}</div><div className="text-xs text-slate-400">私人空间</div></div><form action={logoutAction}><button title="退出登录" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><LogOut className="size-4" /></button></form></> : null}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children, site, user, subjects, counts }: {
  children: React.ReactNode;
  site: { name: string; subtitle: string; brandColor: string };
  user: { username: string; displayName: string; mustChangePassword: boolean };
  subjects: SubjectItem[]; counts: { review: number; repeated: number };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = () => setCollapsed((value) => !value);
  const practiceMode = /^\/questions\/[^/]+$/.test(pathname) && pathname !== '/questions/new' && pathname !== '/questions/import';
  return (
    <div className="min-h-screen bg-[var(--atlas-canvas)] transition-[grid-template-columns] duration-200 lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]" style={{ '--atlas-blue': site.brandColor, '--sidebar-width': collapsed ? '76px' : '272px' } as React.CSSProperties}>
      <aside className="hidden border-r border-slate-200 lg:sticky lg:top-0 lg:block lg:h-screen"><Sidebar pathname={pathname} onNavigate={() => setOpen(false)} site={site} user={user} subjects={subjects} counts={counts} collapsed={collapsed} onToggle={toggleCollapsed} /></aside>
      {open ? <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="关闭导航" className="absolute inset-0 bg-slate-950/30" onClick={() => setOpen(false)} /><aside className="relative h-full w-[286px] shadow-2xl"><button aria-label="关闭导航" className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)}><X className="size-5" /></button><Sidebar pathname={pathname} onNavigate={() => setOpen(false)} site={site} user={user} subjects={subjects} counts={counts} /></aside></div> : null}
      <div className="min-w-0">
        <header className={practiceMode ? 'sticky top-0 z-30 flex h-12 items-center border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur lg:hidden' : 'sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur lg:px-8'}>
          <button aria-label="打开导航" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu className="size-5" /></button>
          {!practiceMode ? <><form action="/questions" className="relative hidden max-w-md flex-1 md:block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input name="q" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--atlas-blue)] focus:bg-white focus:ring-2 focus:ring-blue-100" placeholder="搜索题目、知识点、错因…" /></form>
          <div className="ml-auto flex items-center gap-3"><span className="hidden text-xs font-medium text-slate-400 xl:inline">数学模块 · 当前启用</span><Link href="/questions/new" className="atlas-button-primary"><Plus className="size-4" />新建错题</Link></div></> : <span className="ml-2 text-xs font-medium text-slate-500">专注做题</span>}
        </header>
        {user.mustChangePassword ? <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-center text-xs font-medium text-amber-800">首次登录必须先修改初始密码，修改后所有设备会重新验证。</div> : null}
        <main className={`mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-8 ${practiceMode ? 'py-2 lg:py-3' : 'py-6 lg:py-8'}`}>{children}</main>
        {!practiceMode ? <footer className="px-6 pb-6 text-center text-xs text-slate-400">{site.name} · 私人学习档案 · <a className="hover:text-slate-600" href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">冀ICP备2026007268号-1</a></footer> : null}
      </div>
    </div>
  );
}
