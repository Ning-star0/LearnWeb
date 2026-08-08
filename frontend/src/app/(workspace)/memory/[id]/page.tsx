import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpenCheck, ChevronLeft, ChevronRight, Lightbulb, Sigma } from 'lucide-react';
import { notFound } from 'next/navigation';
import { MemoryStudyCard } from '@/components/mistake-atlas/memory-study-card';
import { StatusPill } from '@/components/mistake-atlas/ui';
import { isViewedToday, memoryDateKey } from '@/lib/memory-schedule';
import { prisma } from '@/lib/prisma';

const kindMeta = {
  FORMULA: { label: '公式', icon: Sigma, tone: 'blue' as const },
  TECHNIQUE: { label: '技巧', icon: Lightbulb, tone: 'amber' as const },
  MEMORY: { label: '记忆', icon: BookOpenCheck, tone: 'green' as const },
};

export default async function MemoryStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const cards = await prisma.memoryCard.findMany({ where: { subjectId: subject.id }, orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }] });
  const index = cards.findIndex((card) => card.id === id);
  if (index < 0) notFound();
  const card = cards[index];
  const previous = cards[index - 1];
  const next = cards[index + 1];
  const meta = kindMeta[card.kind];
  const Icon = meta.icon;
  const todayReview = await prisma.memoryReview.findUnique({
    where: { memoryCardId_dateKey: { memoryCardId: card.id, dateKey: memoryDateKey() } },
    select: { memorizedAt: true },
  });

  return <div className="mx-auto max-w-6xl pb-4">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Link href="/memory" className="atlas-button-secondary"><ArrowLeft className="size-4" />返回手册目录</Link><div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tabular-nums text-slate-400"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">公式编号 {card.code}</span><span>手册位置 {index + 1} / {cards.length}</span></div></div>
    <header className="mb-4 text-center">
      <div className="mx-auto grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="size-4" /></div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2"><StatusPill tone={meta.tone}>{meta.label}</StatusPill><span className="text-xs text-slate-400">{card.category}</span></div>
      <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{card.title}</h1>
      {card.tags.length ? <div className="mt-3 flex flex-wrap justify-center gap-2">{card.tags.map((tag) => <span key={tag} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500">{tag}</span>)}</div> : null}
      {(card.viewCount || card.memorizedCount) ? <div className="mt-3 text-[11px] text-slate-400">累计已读 {card.viewCount} 次 · 累计已背 {card.memorizedCount} 次{card.nextReviewAt ? ` · 下次推荐 ${card.nextReviewAt.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}` : ''}</div> : null}
    </header>

    <MemoryStudyCard cardId={card.id} content={card.contentMarkdown} summary={card.summary} reviewedToday={isViewedToday(card.lastViewedAt)} memorizedToday={Boolean(todayReview?.memorizedAt)} />

    <nav aria-label="背诵手册翻页" className="mt-5 grid gap-3 sm:grid-cols-2">
      {previous ? <Link href={`/memory/${previous.id}`} className="atlas-card group flex items-center gap-3 p-4 transition hover:border-blue-200"><ChevronLeft className="size-5 text-slate-300 group-hover:text-blue-500" /><div className="min-w-0"><div className="text-[10px] text-slate-400">上一条 · {previous.code}</div><div className="mt-1 truncate text-sm font-semibold text-slate-700">{previous.title}</div></div></Link> : <div className="atlas-card flex items-center p-4 text-xs text-slate-300"><ChevronLeft className="mr-2 size-5" />已经是第一条</div>}
      {next ? <Link href={`/memory/${next.id}`} className="atlas-card group flex items-center justify-end gap-3 p-4 text-right transition hover:border-blue-200"><div className="min-w-0"><div className="text-[10px] text-slate-400">下一条 · {next.code}</div><div className="mt-1 truncate text-sm font-semibold text-slate-700">{next.title}</div></div><ChevronRight className="size-5 text-slate-300 group-hover:text-blue-500" /></Link> : <Link href={`/memory/${cards[0].id}`} className="atlas-card group flex items-center justify-end gap-3 p-4 text-right transition hover:border-blue-200"><div><div className="text-[10px] text-slate-400">完成一轮</div><div className="mt-1 text-sm font-semibold text-slate-700">从第一条重新开始</div></div><ArrowRight className="size-5 text-blue-500" /></Link>}
    </nav>
  </div>;
}
