import { Award, CalendarCheck2, RotateCcw } from 'lucide-react';
import { PageHeader, ProgressBar, StatCard, StatusPill } from '@/components/mistake-atlas/ui';
import { questions } from '@/lib/mistake-atlas-data';

export default function MasteredPage() {
  const mastered = questions.filter((question) => question.status === '已掌握');
  return <><PageHeader eyebrow="Mastered" title="已掌握" description="连续 3 次独立做对的题目会自动进入这里；再次做错时会回退到学习中。" /><div className="grid gap-4 sm:grid-cols-3"><StatCard label="已掌握题目" value="7" note="占有效错题 20.6%" icon={Award} tone="green" /><StatCard label="本周新掌握" value="2" note="较上周增加 1 道" icon={CalendarCheck2} /><StatCard label="长期复查" value="3" note="未来 30 天内到期" icon={RotateCcw} tone="slate" /></div><div className="mt-5 atlas-card p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">最近掌握</h2><p className="mt-1 text-xs text-slate-400">完整重做轨迹会永久保留</p></div><StatusPill tone="green">自动判定</StatusPill></div>{mastered.map((question) => <div key={question.id} className="rounded-xl border border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{question.title}</h3><p className="mt-1 text-xs text-slate-400">{question.chapter}</p></div><StatusPill tone="green">连续正确 3/3</StatusPill></div><div className="mt-4"><ProgressBar value={100} tone="green" /></div><div className="mt-3 text-xs text-slate-500">共重做 {question.attempts} 次 · 长期复查：{question.nextReview}</div></div>)}</div></>;
}
