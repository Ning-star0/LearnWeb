import Link from 'next/link';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

export default async function ForecastPage() {
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const start = startOfDay(new Date()); const end = endOfDay(addDays(start, 6));
  const questions = await prisma.question.findMany({ where: { subjectId: math.id, status: 'ACTIVE', nextReviewAt: { gte: start, lte: end } }, include: { chapter: true }, orderBy: { nextReviewAt: 'asc' } });
  const days = Array.from({ length: 7 }, (_, index) => { const date = addDays(start, index); return { date, questions: questions.filter((item) => item.nextReviewAt && item.nextReviewAt >= startOfDay(date) && item.nextReviewAt <= endOfDay(date)) }; });
  return <><PageHeader eyebrow="Mathematics · Forecast" title="未来 7 天复习预报" description="根据每道数学错题的下次复习时间生成，不强制使用固定间隔。" action={<Link href="/reports/weekly" className="atlas-button-secondary"><ArrowLeft className="size-4" />返回周报</Link>} /><div className="grid gap-4 lg:grid-cols-7">{days.map((day, index) => <section key={day.date.toISOString()} className={`atlas-card min-h-48 p-4 ${index === 0 ? 'ring-2 ring-blue-100' : ''}`}><div className="flex items-center justify-between"><div><div className="text-xs text-slate-400">{['今天', '明天', '后天'][index] || day.date.toLocaleDateString('zh-CN', { weekday: 'short' })}</div><div className="mt-1 font-serif text-lg font-semibold">{day.date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</div></div><StatusPill tone={day.questions.length > 5 ? 'amber' : 'blue'}>{day.questions.length}</StatusPill></div><div className="mt-4 space-y-2">{day.questions.slice(0, 4).map((question) => <Link key={question.id} href={`/questions/${question.id}`} className="block rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-600 hover:bg-blue-50 hover:text-blue-700">{question.title}</Link>)}{!day.questions.length ? <div className="grid h-24 place-items-center text-slate-300"><CalendarClock className="size-5" /></div> : null}{day.questions.length > 4 ? <div className="text-center text-[11px] text-slate-400">另有 {day.questions.length - 4} 道</div> : null}</div></section>)}</div></>;
}
