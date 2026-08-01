import { CircleAlert, Flame, History } from 'lucide-react';
import { PageHeader, StatCard, StatusPill } from '@/components/mistake-atlas/ui';
import { questions } from '@/lib/mistake-atlas-data';

export default function RepeatedErrorsPage() {
  const repeated = questions.filter((question) => question.status === '反复错误' || question.attempts >= 3);
  return <><PageHeader eyebrow="Repeated errors" title="反复错误" description="汇总总错误不少于 3 次、最近反复失败或掌握后再次出错的高风险题。" /><div className="grid gap-4 sm:grid-cols-3"><StatCard label="高风险错题" value="4" note="需要优先重做" icon={CircleAlert} tone="amber" /><StatCard label="掌握后回退" value="1" note="最近 30 天" icon={History} tone="slate" /><StatCard label="最多错误次数" value="5" note="分段函数连续性" icon={Flame} tone="amber" /></div><div className="mt-5 space-y-3">{repeated.map((question) => <div key={question.id} className="atlas-card grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_160px_140px] md:items-center"><div><div className="flex flex-wrap gap-2"><h3 className="font-semibold text-slate-900">{question.title}</h3><StatusPill tone="red">{question.errorType}</StatusPill></div><p className="mt-1 text-xs text-slate-400">{question.chapter} · {question.knowledge}</p></div><div className="text-sm"><span className="text-xs text-slate-400">重做轨迹</span><div className="mt-2 flex gap-1">{Array.from({ length: question.attempts }).map((_, i) => <span key={i} className={`size-3 rounded-full ${i === question.attempts - 1 ? 'bg-rose-500' : i % 2 ? 'bg-emerald-500' : 'bg-amber-400'}`} />)}</div></div><button className="atlas-button-primary">安排重点复习</button></div>)}</div></>;
}
