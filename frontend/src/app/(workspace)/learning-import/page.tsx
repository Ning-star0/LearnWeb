import Link from 'next/link';
import { ArrowRight, BookOpen, FileText, Lightbulb, Sigma } from 'lucide-react';
import { ImportTypeNav } from '@/components/mistake-atlas/import-type-nav';
import { StructuredImportPanel } from '@/components/mistake-atlas/structured-import-panel';
import { PageHeader } from '@/components/mistake-atlas/ui';

const destinations = [
  { label: '教材', note: '建立或更新书名', href: '/textbooks', icon: BookOpen },
  { label: '章节', note: '按 chapter_path 建立多级目录', href: '/textbooks', icon: FileText },
  { label: '知识点', note: '挂到对应教材章节', href: '/knowledge-points', icon: Sigma },
  { label: '公式与技巧', note: '生成可检索的记忆卡片', href: '/memory', icon: Lightbulb },
];

export default function LearningImportPage() {
  return <>
    <PageHeader
      eyebrow="Mathematics · Learning material import"
      title="学习资料导入"
      description="把教材照片交给 AI 生成一份结构化 Markdown；上传一次，教材、章节、知识点、公式与技巧会自动进入对应板块。"
      action={<Link href="/questions/import" className="atlas-button-secondary">需要导入错题<ArrowRight className="size-4" /></Link>}
    />
    <ImportTypeNav active="learning" />

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      {[
        ['01', '复制总提示词', '提示词只在本页维护'],
        ['02', '发送照片与出处', '书名或章节不清楚时可注明'],
        ['03', '上传 AI 返回的 .md', '系统自动分析并分类写入'],
      ].map(([number, title, note]) => <div key={number} className="rounded-2xl border border-blue-100 bg-blue-50/45 px-4 py-3">
        <div className="text-[10px] font-bold tracking-[0.16em] text-blue-400">{number}</div>
        <div className="mt-1 text-sm font-semibold text-slate-800">{title}</div>
        <div className="mt-1 text-[11px] text-slate-400">{note}</div>
      </div>)}
    </div>

    <StructuredImportPanel />

    <section className="mt-5 atlas-card p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">一份文件会写入这些位置</h2><p className="mt-1 text-xs text-slate-400">不需要提前手动创建章节；系统会根据书名和完整章节路径自动建立或复用目录。</p></div><span className="text-[10px] text-slate-400">重复名称自动更新或复用</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{destinations.map((item) => { const Icon = item.icon; return <Link key={item.label} href={item.href} className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-blue-100 hover:bg-blue-50/50"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-blue-600 shadow-sm"><Icon className="size-4" /></div><div><div className="text-xs font-semibold text-slate-700 group-hover:text-blue-700">{item.label}</div><div className="mt-0.5 text-[10px] text-slate-400">{item.note}</div></div></Link>; })}</div>
    </section>
  </>;
}
