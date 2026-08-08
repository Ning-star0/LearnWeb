import { format, startOfDay, subDays } from 'date-fns';
import {
  ArrowRight, BookOpenCheck, CalendarClock, CheckCircle2, CircleAlert,
  FileUp, Lightbulb, ListChecks, Plus, RotateCcw, Sigma, Sparkles,
  Target, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { MarkdownContent } from '@/components/mistake-atlas/markdown-content';
import { ProgressBar, StatusPill } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/site-settings';

const resultMeta = {
  INDEPENDENT_CORRECT: { label: '独立做对', className: 'bg-emerald-50 text-emerald-700' },
  HINTED_CORRECT: { label: '提示后做对', className: 'bg-blue-50 text-blue-700' },
  UNDERSTOOD_AFTER_REVIEW: { label: '看解析后理解', className: 'bg-violet-50 text-violet-700' },
  WRONG: { label: '做错', className: 'bg-rose-50 text-rose-700' },
  UNABLE: { label: '不会', className: 'bg-amber-50 text-amber-700' },
  SKIPPED: { label: '跳过', className: 'bg-slate-100 text-slate-600' },
} as const;

function PanelHeading({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4">
    <div><h2 className="text-base font-semibold text-slate-900">{title}</h2>{description ? <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p> : null}</div>
    {action}
  </div>;
}

function Metric({ label, value, note, icon: Icon, tone }: {
  label: string; value: string; note: string; icon: typeof Target; tone: 'blue' | 'violet' | 'amber' | 'mint';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-orange-50 text-orange-600',
    mint: 'bg-emerald-50 text-emerald-600',
  };
  return <div className="min-w-0 p-4 lg:p-5">
    <div className="flex items-center gap-3"><div className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon className="size-4.5" /></div><span className="truncate text-xs font-medium text-slate-500">{label}</span></div>
    <div className="mt-4 font-serif text-3xl font-semibold tabular-nums text-slate-950">{value}</div>
    <div className="mt-1 text-[11px] text-slate-400">{note}</div>
  </div>;
}

export default async function DashboardPage() {
  const [math, site, settings] = await Promise.all([
    prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } }),
    getSiteSettings(),
    prisma.learningSettings.upsert({ where: { id: 'learning' }, update: {}, create: {} }),
  ]);
  const now = new Date();
  const weekStart = subDays(startOfDay(now), 6);
  const [total, mastered, reviewDue, attemptsThisWeek, dueQuestions, errorStats, recentAttempts, memoryCards, recentActivity] = await Promise.all([
    prisma.question.count({ where: { subjectId: math.id, status: { not: 'DELETED' } } }),
    prisma.question.count({ where: { subjectId: math.id, status: 'MASTERED' } }),
    prisma.question.count({ where: { subjectId: math.id, status: 'ACTIVE', nextReviewAt: { lte: now } } }),
    prisma.attempt.count({ where: { question: { subjectId: math.id }, attemptedAt: { gte: weekStart } } }),
    prisma.question.findMany({
      where: { subjectId: math.id, status: 'ACTIVE', nextReviewAt: { lte: now } },
      include: { textbook: true }, orderBy: [{ priority: 'desc' }, { nextReviewAt: 'asc' }], take: 3,
    }),
    prisma.errorType.findMany({ where: { subjectId: math.id }, include: { _count: { select: { questions: true } } }, orderBy: { questions: { _count: 'desc' } }, take: 5 }),
    prisma.attempt.findMany({ where: { question: { subjectId: math.id }, attemptedAt: { gte: weekStart } }, select: { result: true, attemptedAt: true } }),
    prisma.memoryCard.findMany({ where: { subjectId: math.id, showOnHome: true }, orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }], take: 1 }),
    prisma.attempt.findMany({
      where: { question: { subjectId: math.id } }, orderBy: { attemptedAt: 'desc' }, take: 3,
      select: { id: true, result: true, attemptedAt: true, question: { select: { id: true, title: true, materialType: true, sourceQuestionNumber: true, textbook: { select: { name: true } } } } },
    }),
  ]);

  const active = total - mastered;
  const independent = recentAttempts.filter((item) => item.result === 'INDEPENDENT_CORRECT').length;
  const graded = recentAttempts.filter((item) => item.result !== 'SKIPPED').length;
  const accuracy = graded ? Math.round(independent / graded * 100) : 0;
  const masteryRate = total ? Math.round(mastered / total * 1000) / 10 : 0;
  const daily = Array.from({ length: 7 }, (_, index) => {
    const day = subDays(startOfDay(now), 6 - index);
    return recentAttempts.filter((item) => item.attemptedAt >= day && item.attemptedAt < new Date(day.getTime() + 86400000)).length;
  });
  const maxDaily = Math.max(1, ...daily);
  const memory = memoryCards[0];
  const MemoryIcon = memory?.kind === 'TECHNIQUE' ? Lightbulb : memory?.kind === 'MEMORY' ? BookOpenCheck : Sigma;

  return <div className="space-y-5 pb-2">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Today · Mathematics</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">{site.homeGreeting}</h1>
        <p className="mt-2 text-sm text-slate-500">先处理到期复习，再回顾一条公式。保持节奏，不堆积任务。</p>
      </div>
      <div className="flex flex-wrap gap-2"><Link href="/learning-import" className="atlas-button-secondary"><FileUp className="size-4" />学习资料导入</Link><Link href="/questions/new" className="atlas-button-primary"><Plus className="size-4" />录入错题</Link></div>
    </header>

    <section className="grid gap-4 2xl:grid-cols-[minmax(420px,0.9fr)_minmax(0,1.3fr)]">
      <div className="atlas-card overflow-hidden border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-white to-violet-50/50 p-5 sm:p-6">
        <div className="flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100"><CalendarClock className="size-7" /></div><div><div className="text-xs font-semibold text-blue-600">今日学习</div><div className="mt-1 flex items-baseline gap-2"><span className="font-serif text-4xl font-semibold tabular-nums text-slate-950">{reviewDue}</span><span className="text-sm text-slate-500">道待复习</span></div><p className="mt-1 text-xs text-slate-400">{reviewDue ? '按优先级与到期时间安排' : '今天没有到期任务'}</p></div></div>
          <div className="grid shrink-0 gap-2 sm:w-40"><Link href="/reviews" className="atlas-button-primary h-10">开始复习<ArrowRight className="size-4" /></Link><Link href="/questions" className="atlas-button-secondary h-10">查看错题库</Link></div>
        </div>
      </div>
      <div className="atlas-card grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden lg:grid-cols-4 lg:divide-y-0">
        <Metric label="待复习" value={String(reviewDue)} note="到期题目" icon={CalendarClock} tone="violet" />
        <Metric label="学习中" value={String(active)} note={`共 ${total} 道错题`} icon={BookOpenCheck} tone="blue" />
        <Metric label="本周重做" value={String(attemptsThisWeek)} note={`正确率 ${accuracy}%`} icon={Target} tone="amber" />
        <Metric label="总体掌握" value={`${masteryRate}%`} note={`${mastered} / ${total || 0} 道`} icon={CheckCircle2} tone="mint" />
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
      <div className="atlas-card p-5 sm:p-6">
        <PanelHeading title="今日公式" description="每天快速回顾一条公式、技巧或记忆卡片" action={<Link href="/memory" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">查看全部<ArrowRight className="size-3.5" /></Link>} />
        {memory ? <Link href={`/memory#memory-${memory.id}`} className="mt-4 block rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-blue-50/40 p-4 transition hover:border-violet-200 sm:p-5"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"><MemoryIcon className="size-4.5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{memory.title}</h3><StatusPill tone={memory.kind === 'TECHNIQUE' ? 'amber' : memory.kind === 'MEMORY' ? 'green' : 'blue'}>{memory.kind === 'TECHNIQUE' ? '技巧' : memory.kind === 'MEMORY' ? '记忆' : '公式'}</StatusPill></div><p className="mt-1 text-xs text-slate-400">{memory.category}</p></div></div><div className="atlas-dashboard-formula mt-3 max-h-52 overflow-auto"><MarkdownContent>{memory.contentMarkdown}</MarkdownContent></div></Link> : <Link href="/memory#new-memory" className="mt-4 flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/35 p-6 text-center transition hover:bg-violet-50/70"><div><Sparkles className="mx-auto size-7 text-violet-300" /><div className="mt-3 text-sm font-semibold text-slate-700">添加第一条公式或技巧</div><p className="mt-1 text-xs text-slate-400">录入后，首页每天都可以快速回顾。</p></div></Link>}
      </div>

      <Link href="/settings" className="atlas-card block p-5 transition hover:border-blue-200 hover:shadow-md sm:p-6">
        <PanelHeading title="学习进度" description={`连续独立做对 ${settings.masteryThreshold} 次后自动掌握`} action={<span className="text-xs font-semibold text-blue-600">设置规则</span>} />
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#9fe2cf 0 ${masteryRate}%, #e9eef6 ${masteryRate}% 100%)` }}><div className="grid size-20 place-items-center rounded-full bg-white text-center shadow-inner"><div><div className="font-serif text-2xl font-semibold text-slate-900">{masteryRate}%</div><div className="text-[10px] text-slate-400">总体掌握</div></div></div></div>
          <div className="w-full flex-1 space-y-4 text-xs"><div><div className="mb-2 flex justify-between"><span className="text-slate-500">已掌握</span><strong className="text-slate-800">{mastered}</strong></div><ProgressBar value={masteryRate} tone="green" /></div><div><div className="mb-2 flex justify-between"><span className="text-slate-500">学习中</span><strong className="text-slate-800">{active}</strong></div><ProgressBar value={total ? active / total * 100 : 0} /></div><div><div className="mb-2 flex justify-between"><span className="text-slate-500">待复习</span><strong className="text-slate-800">{reviewDue}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-400" style={{ width: `${total ? Math.min(100, reviewDue / total * 100) : 0}%` }} /></div></div></div>
        </div>
      </Link>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="atlas-card p-5 sm:p-6">
        <PanelHeading title="到期复习" description="优先展示今天需要处理的题目" action={<Link href="/reviews" className="text-xs font-semibold text-blue-600">查看全部</Link>} />
        {dueQuestions.length ? <div className="mt-4 divide-y divide-slate-100">{dueQuestions.map((question) => <Link key={question.id} href={`/questions/${question.id}`} className="group flex items-center gap-3 py-3"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><ListChecks className="size-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-700 group-hover:text-blue-700">{question.sourceQuestionNumber ? `${question.materialType === 'EXAMPLE' ? '例' : '练习'} ${question.sourceQuestionNumber}` : question.title}</div><div className="mt-0.5 truncate text-[11px] text-slate-400">{question.textbook.name}{question.sourceQuestionNumber ? ` · ${question.title}` : ''}</div></div><ArrowRight className="size-4 text-slate-300 group-hover:text-blue-500" /></Link>)}</div> : <div className="mt-4 flex min-h-32 items-center justify-center rounded-2xl bg-blue-50/35 p-5 text-center"><div><CheckCircle2 className="mx-auto size-7 text-blue-200" /><div className="mt-2 text-sm font-semibold text-slate-700">今天没有到期任务</div><p className="mt-1 text-xs text-slate-400">可以录入新错题，或回顾公式与知识点。</p></div></div>}
      </div>

      <div className="atlas-card p-5 sm:p-6">
        <PanelHeading title="最近学习" description="最近三次重做记录" action={<Link href="/questions?sort=LAST_ATTEMPT" className="text-xs font-semibold text-blue-600">查看全部</Link>} />
        {recentActivity.length ? <div className="mt-4 divide-y divide-slate-100">{recentActivity.map((attempt) => { const meta = resultMeta[attempt.result]; return <Link key={attempt.id} href={`/questions/${attempt.question.id}`} className="group flex items-center gap-3 py-3"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><RotateCcw className="size-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-700 group-hover:text-blue-700">{attempt.question.sourceQuestionNumber ? `${attempt.question.materialType === 'EXAMPLE' ? '例' : '练习'} ${attempt.question.sourceQuestionNumber}` : attempt.question.title}</div><div className="mt-0.5 truncate text-[11px] text-slate-400">{attempt.question.textbook.name} · {attempt.question.title}</div></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${meta.className}`}>{meta.label}</span><time className="hidden shrink-0 text-[11px] text-slate-400 sm:block">{format(attempt.attemptedAt, 'MM-dd HH:mm')}</time></Link>; })}</div> : <div className="mt-4 grid min-h-32 place-items-center rounded-2xl bg-slate-50 text-center text-sm text-slate-400">还没有重做记录</div>}
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
      <Link href="/questions?sort=LAST_ATTEMPT" className="atlas-card block p-5 transition hover:border-blue-200 hover:shadow-md sm:p-6">
        <PanelHeading title="最近 7 天重做节奏" description="用轻量趋势观察学习是否连续" action={<StatusPill tone="blue">{attemptsThisWeek} 次重做</StatusPill>} />
        <div className="mt-5 flex h-36 items-end gap-3 border-b border-slate-100 px-1">{daily.map((count, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2"><div className={`mx-auto w-full max-w-12 rounded-t-xl transition ${count === maxDaily && count > 0 ? 'bg-blue-300' : 'bg-blue-100'}`} style={{ height: `${Math.max(count ? 14 : 3, count / maxDaily * 86)}%` }} title={`${count} 次`} /><div className="pb-2 text-center text-[10px] text-slate-400">{['一', '二', '三', '四', '五', '六', '日'][index]}</div></div>)}</div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><TrendingUp className="size-4 text-emerald-500" />最近 7 天独立正确率 {accuracy}%</div>
      </Link>

      <div className="atlas-card p-5 sm:p-6">
        <PanelHeading title="常见错误类型" description="按关联错题数量排序" />
        <div className="mt-4 space-y-3">{errorStats.map((item, index) => <Link href={`/questions?errorTypeId=${item.id}`} key={item.id} className="block rounded-xl p-1.5 transition hover:bg-slate-50"><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-600"><span className="mr-2 text-[10px] text-slate-300">0{index + 1}</span>{item.name}</span><span className="text-slate-400">{item._count.questions} 题</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${index < 2 ? 'bg-orange-300' : 'bg-blue-400'}`} style={{ width: `${total ? item._count.questions / total * 100 : 0}%` }} /></div></Link>)}</div>
        {!errorStats.length ? <div className="mt-5 flex min-h-28 items-center justify-center rounded-xl bg-slate-50 text-center"><div><CircleAlert className="mx-auto size-6 text-slate-300" /><p className="mt-2 text-xs text-slate-400">还没有错误类型统计</p></div></div> : null}
      </div>
    </section>
  </div>;
}
