import { CalendarDays, Check, Clock3, RotateCcw, X } from 'lucide-react';
import { PageHeader, StatCard, StatusPill } from '@/components/mistake-atlas/ui';
import { questions } from '@/lib/mistake-atlas-data';

const queue = questions.filter((question) => question.status !== '已掌握');

export default function ReviewsPage() {
  return (
    <>
      <PageHeader eyebrow="Review queue" title="今日复习" description="在纸上完成重做后，只记录结果、耗时和下一次计划。系统不会要求在线作答。" />
      <div className="grid gap-4 sm:grid-cols-3"><StatCard label="今天到期" value="6" note="建议先完成紧急项" icon={CalendarDays} /><StatCard label="已经逾期" value="2" note="最长逾期 2 天" icon={Clock3} tone="amber" /><StatCard label="今日已完成" value="3" note="独立做对 2 次" icon={Check} tone="green" /></div>
      <div className="mt-5 atlas-card overflow-hidden">
        <div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">待处理队列</h2><p className="mt-1 text-xs text-slate-400">记录后将立即重新计算连续正确次数和掌握状态</p></div>
        <div className="divide-y divide-slate-100">
          {queue.map((question, index) => (
            <div key={question.id} className="grid gap-4 p-5 lg:grid-cols-[48px_minmax(0,1fr)_140px_auto] lg:items-center">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">{index + 1}</div>
              <div><div className="flex flex-wrap gap-2"><h3 className="font-semibold text-slate-900">{question.title}</h3>{question.priority === '紧急' ? <StatusPill tone="red">紧急</StatusPill> : null}</div><p className="mt-1 text-xs text-slate-400">{question.chapter} · 连续正确 {question.streak}/3 · {question.nextReview}</p></div>
              <div className="text-sm"><div className="text-xs text-slate-400">主要错因</div><div className="mt-1 font-medium text-slate-700">{question.errorType}</div></div>
              <div className="flex flex-wrap gap-2"><button className="atlas-button-secondary px-3"><X className="size-4 text-rose-500" />未独立做对</button><button className="atlas-button-primary px-3"><Check className="size-4" />独立做对</button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start gap-3"><RotateCcw className="mt-0.5 size-5 text-[var(--atlas-blue)]" /><div><h3 className="text-sm font-semibold text-slate-900">掌握规则</h3><p className="mt-1 text-xs leading-5 text-slate-500">只有“独立做对”会增加连续次数；使用提示、看答案、做错或不会都会清零。连续 3 次独立做对后自动进入已掌握。</p></div></div></div>
    </>
  );
}
