import Link from 'next/link';
import { CalendarClock, CheckCircle2, Plus, RotateCcw, Target, TrendingUp } from 'lucide-react';
import { subDays, startOfDay } from 'date-fns';
import { PageHeader, ProgressBar, SectionTitle, StatCard, StatusPill } from '@/components/mistake-atlas/ui';
import { QuestionList } from '@/components/mistake-atlas/question-list';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/site-settings';

export default async function DashboardPage() {
  const [math, site, settings] = await Promise.all([
    prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } }),
    getSiteSettings(),
    prisma.learningSettings.upsert({ where: { id: 'learning' }, update: {}, create: {} }),
  ]);
  const now = new Date();
  const weekStart = subDays(startOfDay(now), 6);
  const [total, mastered, reviewDue, attemptsThisWeek, questions, errorStats, recentAttempts] = await Promise.all([
    prisma.question.count({ where: { subjectId: math.id, status: { not: 'DELETED' } } }),
    prisma.question.count({ where: { subjectId: math.id, status: 'MASTERED' } }),
    prisma.question.count({ where: { subjectId: math.id, status: 'ACTIVE', nextReviewAt: { lte: now } } }),
    prisma.attempt.count({ where: { question: { subjectId: math.id }, attemptedAt: { gte: weekStart } } }),
    prisma.question.findMany({ where: { subjectId: math.id, status: 'ACTIVE', nextReviewAt: { lte: now } }, include: { textbook: true, chapter: true, knowledgePoints: { include: { knowledgePoint: true } }, errorTypes: { include: { errorType: true } } }, orderBy: [{ priority: 'desc' }, { nextReviewAt: 'asc' }], take: 4 }),
    prisma.errorType.findMany({ where: { subjectId: math.id }, include: { _count: { select: { questions: true } } }, orderBy: { questions: { _count: 'desc' } }, take: 5 }),
    prisma.attempt.findMany({ where: { question: { subjectId: math.id }, attemptedAt: { gte: weekStart } }, select: { result: true, attemptedAt: true } }),
  ]);
  const independent = recentAttempts.filter((item) => item.result === 'INDEPENDENT_CORRECT').length;
  const graded = recentAttempts.filter((item) => item.result !== 'SKIPPED').length;
  const accuracy = graded ? Math.round(independent / graded * 100) : 0;
  const masteryRate = total ? Math.round(mastered / total * 1000) / 10 : 0;
  const daily = Array.from({ length: 7 }, (_, index) => {
    const day = subDays(startOfDay(now), 6 - index);
    return recentAttempts.filter((item) => item.attemptedAt >= day && item.attemptedAt < new Date(day.getTime() + 86400000)).length;
  });
  const maxDaily = Math.max(1, ...daily);

  return <>
    <PageHeader eyebrow="Personal learning archive · Mathematics" title={site.homeGreeting} description="数学模块已连接真实数据库。先处理到期复习，再根据错因和知识点回看薄弱处。" action={<div className="flex gap-2"><Link href="/reviews" className="atlas-button-secondary"><RotateCcw className="size-4" />开始复习</Link><Link href="/questions/new" className="atlas-button-primary"><Plus className="size-4" />录入错题</Link></div>} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard href="/reviews" label="今日到期复习" value={String(reviewDue)} note={reviewDue ? '按优先级和到期时间排序' : '今天没有到期任务'} icon={CalendarClock} tone="blue" /><StatCard href="/questions?status=ACTIVE" label="当前未掌握" value={String(total - mastered)} note={`数学错题总数 ${total}`} icon={Target} tone="amber" /><StatCard href="/questions?sort=LAST_ATTEMPT" label="最近 7 天重做" value={String(attemptsThisWeek)} note={`独立正确率 ${accuracy}%`} icon={RotateCcw} tone="slate" /><StatCard href="/status/mastered" label="总体掌握率" value={`${masteryRate}%`} note={`${mastered} / ${total || 0} 道已掌握`} icon={CheckCircle2} tone="green" /></section>
    <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]"><div><SectionTitle title="到期复习队列" description="只显示数学模块中已经到期的未掌握错题" action={<Link href="/reviews" className="text-xs font-semibold text-[var(--atlas-blue)]">查看全部</Link>} /><QuestionList questions={questions} emptyText="今天没有到期复习，可以录入新错题或回看知识点。" /></div><div className="atlas-card p-6"><SectionTitle title="掌握规则" description={`连续独立做对 ${settings.masteryThreshold} 次后自动掌握`} /><div className="flex items-center gap-6 py-3"><div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--atlas-blue) 0 ${masteryRate}%, #e9eef6 ${masteryRate}% 100%)` }}><div className="grid size-20 place-items-center rounded-full bg-white text-center"><div><div className="font-serif text-2xl font-semibold">{masteryRate}%</div><div className="text-[10px] text-slate-400">总体掌握</div></div></div></div><div className="flex-1 space-y-3 text-sm"><div><div className="mb-1.5 flex justify-between"><span className="text-slate-500">已掌握</span><strong>{mastered}</strong></div><ProgressBar value={masteryRate} tone="green" /></div><div><div className="mb-1.5 flex justify-between"><span className="text-slate-500">学习中</span><strong>{total - mastered}</strong></div><ProgressBar value={100 - masteryRate} /></div></div></div><p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">提示后做对、看答案后理解、做错或完全不会都会打断连续记录；已掌握后再次做错会自动退回学习中。</p></div></section>
    <section className="mt-5 grid gap-5 xl:grid-cols-3"><div className="atlas-card p-6 xl:col-span-2"><SectionTitle title="最近 7 天重做节奏" action={<StatusPill tone="blue">{attemptsThisWeek} 次重做</StatusPill>} /><div className="mt-7 flex h-48 items-end gap-3 border-b border-slate-200 px-1">{daily.map((count, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="mx-auto w-full max-w-12 rounded-t-lg bg-blue-200 transition hover:bg-[var(--atlas-blue)]" style={{ height: `${Math.max(count ? 12 : 2, count / maxDaily * 90)}%` }} title={`${count} 次`} /><div className="pb-2 text-center text-[11px] text-slate-400">{['一', '二', '三', '四', '五', '六', '日'][index]}</div></div>)}</div><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><TrendingUp className="size-4 text-emerald-600" />最近 7 天独立正确率 {accuracy}%</div></div><div className="atlas-card p-6"><SectionTitle title="常见错误类型" description="按关联错题数排序" /><div className="space-y-4">{errorStats.map((item, index) => <div key={item.id}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-700"><span className="mr-2 text-xs text-slate-300">0{index + 1}</span>{item.name}</span><span className="text-xs text-slate-400">{item._count.questions} 题</span></div><ProgressBar value={total ? item._count.questions / total * 100 : 0} tone={index < 2 ? 'amber' : 'blue'} /></div>)}</div></div></section>
  </>;
}
