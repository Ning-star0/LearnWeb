import Link from 'next/link';
import { ArrowLeft, CalendarClock, Check, Pencil, RotateCcw, X } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';
import { questions } from '@/lib/mistake-atlas-data';

const attempts = [
  { icon: Check, label: '独立做对', date: '7 月 30 日', tone: 'green' },
  { icon: X, label: '做错', date: '7 月 25 日', tone: 'red' },
  { icon: Check, label: '使用提示后做对', date: '7 月 20 日', tone: 'amber' },
];

export function generateStaticParams() {
  return questions.map((question) => ({ id: question.id }));
}

export default async function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const question = questions.find((item) => item.id === id);
  if (!question) notFound();
  return <><PageHeader eyebrow={question.id} title={question.title} description={`${question.chapter} · ${question.knowledge}`} action={<div className="flex gap-2"><Link href="/questions" className="atlas-button-secondary"><ArrowLeft className="size-4" />返回</Link><button className="atlas-button-secondary"><Pencil className="size-4" />编辑</button></div>} /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]"><article className="atlas-card p-6 sm:p-8"><div className="flex flex-wrap gap-2"><StatusPill tone={question.status === '已掌握' ? 'green' : question.status === '反复错误' ? 'red' : 'blue'}>{question.status}</StatusPill><StatusPill>{question.errorType}</StatusPill><StatusPill>{question.priority}优先级</StatusPill></div><div className="paper-grid mt-6 rounded-xl border border-slate-200 p-7"><div className="text-xs font-semibold uppercase tracking-widest text-slate-400">题目</div><p className="mt-4 text-lg leading-8 text-slate-800">计算下列极限，并说明换元后自变量的趋近方向：</p><div className="my-8 text-center font-serif text-2xl italic text-slate-950">lim<sub className="ml-1 text-xs">x→+∞</sub> x (a<sup>1/x</sup> − b<sup>1/x</sup>)</div></div><section className="mt-7"><h2 className="text-sm font-semibold text-slate-900">我的错因</h2><p className="mt-3 text-sm leading-7 text-slate-600">尝试把整个差式直接写成以 e 为底的指数形式，没有意识到减法不能直接拆入对数；同时没有想到令 t = 1/x。</p></section><section className="mt-6 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-5"><div className="text-xs font-semibold text-blue-700">一句话提醒</div><p className="mt-2 text-sm leading-6 text-blue-900">指数中出现 1/x，且 x → ∞ 时，可以优先考虑令 t = 1/x。</p></section></article><aside className="space-y-5"><div className="atlas-card p-6"><h2 className="font-semibold text-slate-900">掌握进度</h2><div className="mt-5 flex gap-2">{[0,1,2].map((step) => <div key={step} className={`h-2 flex-1 rounded-full ${step < question.streak ? 'bg-[var(--atlas-blue)]' : 'bg-slate-100'}`} />)}</div><div className="mt-3 flex justify-between text-xs"><span className="text-slate-400">连续独立做对</span><strong>{question.streak} / 3</strong></div><button className="atlas-button-primary mt-5 w-full"><RotateCcw className="size-4" />记录一次重做</button></div><div className="atlas-card p-6"><h2 className="font-semibold text-slate-900">最近重做轨迹</h2><div className="mt-5 space-y-5">{attempts.map(({ icon: Icon, label, date, tone }) => <div key={date} className="flex gap-3"><div className={`grid size-8 place-items-center rounded-full ${tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'red' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}><Icon className="size-4" /></div><div><div className="text-sm font-medium text-slate-700">{label}</div><div className="mt-1 text-xs text-slate-400">{date}</div></div></div>)}</div></div><div className="atlas-card p-6"><div className="flex gap-3"><CalendarClock className="size-5 text-slate-400" /><div><div className="text-xs text-slate-400">下次复习</div><div className="mt-1 font-semibold text-slate-800">{question.nextReview}</div></div></div></div></aside></div></>;
}
