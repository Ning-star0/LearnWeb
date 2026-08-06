import Link from 'next/link';
import { BookOpenCheck, CalendarClock, CheckCircle2, FileUp, Lightbulb, Plus, RotateCcw, Sigma, Target, TrendingUp } from 'lucide-react';
import { subDays, startOfDay } from 'date-fns';
import { PageHeader, ProgressBar, SectionTitle, StatCard, StatusPill } from '@/components/mistake-atlas/ui';
import { QuestionList } from '@/components/mistake-atlas/question-list';
import { MarkdownContent } from '@/components/mistake-atlas/markdown-content';
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
  const [total, mastered, reviewDue, attemptsThisWeek, questions, errorStats, recentAttempts, memoryCards] = await Promise.all([
    prisma.question.count({ where: { subjectId: math.id, status: { not: 'DELETED' } } }),
    prisma.question.count({ where: { subjectId: math.id, status: 'MASTERED' } }),
    prisma.question.count({ where: { subjectId: math.id, status: 'ACTIVE', nextReviewAt: { lte: now } } }),
    prisma.attempt.count({ where: { question: { subjectId: math.id }, attemptedAt: { gte: weekStart } } }),
    prisma.question.findMany({ where: { subjectId: math.id, status: 'ACTIVE', nextReviewAt: { lte: now } }, include: { textbook: true, chapter: true, knowledgePoints: { include: { knowledgePoint: true } }, errorTypes: { include: { errorType: true } } }, orderBy: [{ priority: 'desc' }, { nextReviewAt: 'asc' }], take: 4 }),
    prisma.errorType.findMany({ where: { subjectId: math.id }, include: { _count: { select: { questions: true } } }, orderBy: { questions: { _count: 'desc' } }, take: 5 }),
    prisma.attempt.findMany({ where: { question: { subjectId: math.id }, attemptedAt: { gte: weekStart } }, select: { result: true, attemptedAt: true } }),
    prisma.memoryCard.findMany({ where: { subjectId: math.id, showOnHome: true }, orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }], take: 4 }),
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
    <PageHeader eyebrow="Today · Mathematics" title={site.homeGreeting} description="从这里查看今日任务、掌握进度和最近学习节奏；所有统计卡片都可以直接进入对应页面。" action={<div className="flex flex-wrap gap-2"><Link href="/reviews" className="atlas-button-secondary"><RotateCcw className="size-4" />开始复习</Link><Link href="/questions/import" className="atlas-button-secondary"><FileUp className="size-4" />批量导入</Link><Link href="/questions/new" className="atlas-button-primary"><Plus className="size-4" />录入单题</Link></div>} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard href="/reviews" label="今日到期复习" value={String(reviewDue)} note={reviewDue ? '按优先级和到期时间排序' : '今天没有到期任务'} icon={CalendarClock} tone="blue" /><StatCard href="/questions?status=ACTIVE" label="当前未掌握" value={String(total - mastered)} note={`数学错题总数 ${total}`} icon={Target} tone="amber" /><StatCard href="/questions?sort=LAST_ATTEMPT" label="最近 7 天重做" value={String(attemptsThisWeek)} note={`独立正确率 ${accuracy}%`} icon={RotateCcw} tone="slate" /><StatCard href="/status/mastered" label="总体掌握率" value={`${masteryRate}%`} note={`${mastered} / ${total || 0} 道已掌握`} icon={CheckCircle2} tone="green" /></section>
    <section className="mt-5">
      <SectionTitle title="公式与技巧" description="打开首页就快速回忆常用公式、解题方法和需要记住的结论" action={<Link href="/memory" className="text-xs font-semibold text-[var(--atlas-blue)]">管理全部</Link>} />
      {memoryCards.length ? <div className="grid gap-4 xl:grid-cols-2">{memoryCards.map((card) => {
        const Icon = card.kind === 'FORMULA' ? Sigma : card.kind === 'TECHNIQUE' ? Lightbulb : BookOpenCheck;
        const kindLabel = card.kind === 'FORMULA' ? '公式' : card.kind === 'TECHNIQUE' ? '技巧' : '记忆';
        return <Link key={card.id} href={`/memory#memory-${card.id}`} className="atlas-card group block overflow-hidden transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{card.title}</h3><StatusPill tone={card.kind === 'TECHNIQUE' ? 'amber' : card.kind === 'MEMORY' ? 'green' : 'blue'}>{kindLabel}</StatusPill></div><div className="mt-1 text-xs text-slate-400">{card.category}</div>{card.summary ? <p className="mt-2 text-xs leading-5 text-slate-500">{card.summary}</p> : null}</div></div><div className="max-h-64 overflow-auto px-5 py-5"><MarkdownContent>{card.contentMarkdown}</MarkdownContent></div></Link>;
      })}</div> : <Link href="/memory#new-memory" className="atlas-card group grid min-h-44 place-items-center border-dashed p-7 text-center transition hover:border-blue-200 hover:bg-blue-50/30"><div><BookOpenCheck className="mx-auto size-8 text-blue-300 transition group-hover:scale-105" /><h3 className="mt-3 font-semibold text-slate-800">建立你的公式与技巧卡片</h3><p className="mt-2 text-sm text-slate-400">把求积公式、泰勒公式、欧拉公式和常用技巧放在这里，之后打开首页就能看到。</p></div></Link>}
    </section>
    <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]"><div><SectionTitle title="到期复习队列" description="只显示数学模块中已经到期的未掌握错题" action={<Link href="/reviews" className="text-xs font-semibold text-[var(--atlas-blue)]">查看全部</Link>} /><QuestionList questions={questions} emptyText="今天没有到期复习，可以录入新错题或回看知识点。" /></div><Link href="/settings" className="atlas-card block p-6 transition hover:border-blue-200 hover:shadow-md"><SectionTitle title="掌握规则" description={`连续独立做对 ${settings.masteryThreshold} 次后自动掌握`} /><div className="flex items-center gap-6 py-3"><div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--atlas-blue) 0 ${masteryRate}%, #e9eef6 ${masteryRate}% 100%)` }}><div className="grid size-20 place-items-center rounded-full bg-white text-center"><div><div className="font-serif text-2xl font-semibold">{masteryRate}%</div><div className="text-[10px] text-slate-400">总体掌握</div></div></div></div><div className="flex-1 space-y-3 text-sm"><div><div className="mb-1.5 flex justify-between"><span className="text-slate-500">已掌握</span><strong>{mastered}</strong></div><ProgressBar value={masteryRate} tone="green" /></div><div><div className="mb-1.5 flex justify-between"><span className="text-slate-500">学习中</span><strong>{total - mastered}</strong></div><ProgressBar value={100 - masteryRate} /></div></div></div><p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">做对一次就增加连续正确次数；做错一次就清零。点击这里可以调整掌握次数与复习间隔。</p></Link></section>
    <section className="mt-5 grid gap-5 xl:grid-cols-3"><Link href="/questions?sort=LAST_ATTEMPT" className="atlas-card block p-6 transition hover:border-blue-200 hover:shadow-md xl:col-span-2"><SectionTitle title="最近 7 天重做节奏" action={<StatusPill tone="blue">{attemptsThisWeek} 次重做</StatusPill>} /><div className="mt-7 flex h-48 items-end gap-3 border-b border-slate-200 px-1">{daily.map((count, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="mx-auto w-full max-w-12 rounded-t-lg bg-blue-200 transition hover:bg-[var(--atlas-blue)]" style={{ height: `${Math.max(count ? 12 : 2, count / maxDaily * 90)}%` }} title={`${count} 次`} /><div className="pb-2 text-center text-[11px] text-slate-400">{['一', '二', '三', '四', '五', '六', '日'][index]}</div></div>)}</div><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><TrendingUp className="size-4 text-emerald-600" />最近 7 天独立正确率 {accuracy}%</div></Link><div className="atlas-card p-6"><SectionTitle title="常见错误类型" description="点击直接查看对应错题" /><div className="space-y-2">{errorStats.map((item, index) => <Link href={`/questions?errorTypeId=${item.id}`} key={item.id} className="block rounded-lg p-2 transition hover:bg-slate-50"><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-700"><span className="mr-2 text-xs text-slate-300">0{index + 1}</span>{item.name}</span><span className="text-xs text-slate-400">{item._count.questions} 题</span></div><ProgressBar value={total ? item._count.questions / total * 100 : 0} tone={index < 2 ? 'amber' : 'blue'} /></Link>)}</div></div></section>
  </>;
}
