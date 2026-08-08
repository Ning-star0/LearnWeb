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
  return <nav aria-label="选择导入类型" className="atlas-card mb-5 grid gap-2 p-2 sm:grid-cols-3">
    {importTypes.map((item) => {
      const Icon = item.icon;
      const selected = item.id === active;
      return <Link
        key={item.id}
        href={item.href}
        aria-current={selected ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${selected ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
      >
        <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${selected ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-500'}`}><Icon className="size-4" /></div>
        <div className="min-w-0"><div className="text-xs font-semibold">{item.label}</div><div className={`mt-0.5 truncate text-[10px] ${selected ? 'text-blue-500' : 'text-slate-400'}`}>{item.description}</div></div>
      </Link>;
    })}
  </nav>;
}
