import { CheckCircle2 } from 'lucide-react';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';
import { questions } from '@/lib/mistake-atlas-data';

export default function CorrectPage() {
  const correct = questions.filter((question) => question.streak > 0);
  return <><PageHeader eyebrow="Recently correct" title="已做对" description="最近一次重做为独立做对或提示后做对，但尚不一定达到掌握标准。" /><div className="atlas-card divide-y divide-slate-100">{correct.map((question) => <div key={question.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-5" /></div><div className="flex-1"><h3 className="font-semibold text-slate-900">{question.title}</h3><p className="mt-1 text-xs text-slate-400">{question.chapter} · 下次复习 {question.nextReview}</p></div><StatusPill tone={question.streak >= 3 ? 'green' : 'blue'}>连续独立正确 {question.streak}/3</StatusPill></div>)}</div></>;
}
