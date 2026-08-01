import Link from 'next/link';
import { ChevronDown, Filter, MoreHorizontal, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';
import { questions } from '@/lib/mistake-atlas-data';

function toneForStatus(status: string) {
  if (status === '已掌握') return 'green' as const;
  if (status === '反复错误') return 'red' as const;
  if (status === '待复习') return 'amber' as const;
  return 'blue' as const;
}

export default function QuestionsPage() {
  return (
    <>
      <PageHeader eyebrow="Mistake library" title="错题库" description="按教材、章节、知识点和错误类型组织所有记录。重做历史是掌握状态的唯一事实来源。" action={<Link href="/questions/new" className="atlas-button-primary"><Plus className="size-4" />录入错题</Link>} />

      <div className="atlas-card overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input className="atlas-input pl-9" placeholder="搜索题目、错因、标签、页码…" />
            </div>
            <div className="flex flex-wrap gap-2">
              {['数学', '全部教材', '全部章节', '全部状态'].map((label) => <button key={label} className="atlas-button-secondary"><span>{label}</span><ChevronDown className="size-3.5" /></button>)}
              <button className="atlas-button-secondary"><SlidersHorizontal className="size-4" />更多筛选</button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>共 34 道错题 · 当前展示 5 道演示记录</span>
            <button className="flex items-center gap-1.5 font-medium text-slate-600"><Filter className="size-3.5" />排序：风险优先 <ChevronDown className="size-3.5" /></button>
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(260px,1.5fr)_minmax(200px,1fr)_150px_120px_130px_44px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 xl:grid">
          <div>题目</div><div>分类</div><div>错误类型</div><div>掌握进度</div><div>下次复习</div><div />
        </div>
        <div className="divide-y divide-slate-100">
          {questions.map((question) => (
            <div key={question.id} className="grid gap-4 p-5 transition hover:bg-slate-50/60 xl:grid-cols-[minmax(260px,1.5fr)_minmax(200px,1fr)_150px_120px_130px_44px] xl:items-center">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2"><StatusPill tone={toneForStatus(question.status)}>{question.status}</StatusPill><span className="text-[11px] font-medium text-slate-400">{question.id}</span></div>
                <Link href={`/questions/${question.id}`} className="font-semibold text-slate-900 hover:text-[var(--atlas-blue)]">{question.title}</Link>
                <div className="mt-1 text-xs text-slate-400">重做 {question.attempts} 次 · 优先级 {question.priority}</div>
              </div>
              <div className="min-w-0"><div className="truncate text-sm text-slate-700">{question.chapter}</div><div className="mt-1 truncate text-xs text-slate-400">{question.knowledge}</div></div>
              <div><StatusPill>{question.errorType}</StatusPill></div>
              <div><div className="mb-2 text-xs font-semibold text-slate-700">{question.streak} / 3</div><div className="flex gap-1">{[0, 1, 2].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${step < question.streak ? 'bg-[var(--atlas-blue)]' : 'bg-slate-100'}`} />)}</div></div>
              <div className={`text-sm font-medium ${question.nextReview.includes('逾期') ? 'text-rose-600' : 'text-slate-600'}`}>{question.nextReview}</div>
              <button className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><MoreHorizontal className="size-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-400"><span>第 1 页，共 7 页</span><div className="flex gap-2"><button className="atlas-button-secondary h-8 px-3">上一页</button><button className="atlas-button-secondary h-8 px-3">下一页</button></div></div>
      </div>
    </>
  );
}
