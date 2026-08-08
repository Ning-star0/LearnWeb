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
    <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="atlas-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">三步完成导入</h2><p className="mt-1 text-[11px] leading-5 text-slate-400">只整理一次，系统负责拆分和归档。</p></div>
        <ol className="space-y-1 p-3">
          {[
            ['1', '复制总提示词', '提示词只在这个页面维护'],
            ['2', '发送照片与出处', '告诉 AI 书名和已知章节'],
            ['3', '上传生成的 .md', '自动分析并写入对应板块'],
          ].map(([number, title, note]) => <li key={number} className="flex gap-3 rounded-xl p-3 hover:bg-slate-50">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">{number}</span>
            <div><div className="text-xs font-semibold text-slate-700">{title}</div><div className="mt-1 text-[10px] leading-4 text-slate-400">{note}</div></div>
          </li>)}
        </ol>
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="mb-3 flex items-center justify-between"><span className="text-[11px] font-semibold text-slate-600">自动写入</span><span className="text-[9px] text-slate-400">同名自动复用</span></div>
          <div className="grid grid-cols-2 gap-2">{destinations.map((item) => { const Icon = item.icon; return <Link key={item.label} href={item.href} title={item.note} className="group flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 transition hover:border-blue-100 hover:text-blue-700"><Icon className="size-3.5 text-blue-500" />{item.label}</Link>; })}</div>
          <p className="mt-3 text-[10px] leading-5 text-slate-400">无需预建章节，系统会按书名和完整章节路径自动建立目录。</p>
        </div>
      </aside>
      <div className="min-w-0"><StructuredImportPanel compact /></div>
    </div>
  </>;
}
