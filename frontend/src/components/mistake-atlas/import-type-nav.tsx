import Link from 'next/link';
import { DatabaseBackup, FileText, ListChecks } from 'lucide-react';

const importTypes = [
  {
    id: 'learning',
    href: '/learning-import',
    label: '学习资料',
    description: '教材、章节、知识点、公式',
    icon: FileText,
  },
  {
    id: 'questions',
    href: '/questions/import',
    label: '错题',
    description: '题目、出处和错因',
    icon: ListChecks,
  },
  {
    id: 'backup',
    href: '/imports',
    label: '系统备份',
    description: '完整 JSON 恢复',
    icon: DatabaseBackup,
  },
] as const;

export function ImportTypeNav({ active }: { active: (typeof importTypes)[number]['id'] }) {
  return <div className="mb-5 flex flex-wrap items-center gap-3">
    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">导入类型</span>
    <nav aria-label="选择导入类型" className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {importTypes.map((item) => {
        const Icon = item.icon;
        const selected = item.id === active;
        return <Link
          key={item.id}
          href={item.href}
          aria-current={selected ? 'page' : undefined}
          title={item.description}
          className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${selected ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
        >
          <Icon className="size-3.5" />{item.label}
        </Link>;
      })}
    </nav>
  </div>;
}
