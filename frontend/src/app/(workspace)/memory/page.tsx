import { MemoryCardKind } from '@prisma/client';
import { ArrowRight, BookOpenCheck, ChevronDown, FileUp, Lightbulb, Pin, Search, Sigma, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { createMemoryCardAction, deleteMemoryCardAction, updateMemoryCardAction } from '@/app/actions/memory-actions';
import { DangerSubmit } from '@/components/mistake-atlas/danger-submit';
import { MarkdownContent } from '@/components/mistake-atlas/markdown-content';
import { QuestionFilterSelect } from '@/components/mistake-atlas/question-filter-select';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';
import { isViewedThisWeek, isViewedToday } from '@/lib/memory-schedule';
import { prisma } from '@/lib/prisma';

const kindMeta = {
  FORMULA: { label: '公式', icon: Sigma, tone: 'blue' as const },
  TECHNIQUE: { label: '技巧', icon: Lightbulb, tone: 'amber' as const },
  MEMORY: { label: '记忆', icon: BookOpenCheck, tone: 'green' as const },
};

function memoryPreview(markdown: string) {
  const displayFormula = markdown.match(/\$\$[\s\S]*?\$\$/)?.[0];
  if (displayFormula) return displayFormula;
  return markdown.split(/\n\s*\n/).find((block) => block.trim())?.slice(0, 1200) || markdown.slice(0, 1200);
}

function MemoryForm({ card }: { card?: {
  id: string; title: string; category: string; contentMarkdown: string; summary: string | null;
  kind: MemoryCardKind; tags: string[]; pinned: boolean; showOnHome: boolean; sortOrder: number;
} }) {
  const action = card ? updateMemoryCardAction.bind(null, card.id) : createMemoryCardAction;
  return <form action={action} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold text-slate-600">标题<input name="title" required defaultValue={card?.title || ''} placeholder="例如：泰勒公式" className="atlas-input mt-1.5" /></label>
      <label className="text-xs font-semibold text-slate-600">分类<input name="category" required defaultValue={card?.category || ''} placeholder="例如：高等数学 / 级数" className="atlas-input mt-1.5" /></label>
      <label className="text-xs font-semibold text-slate-600">内容类型<select name="kind" defaultValue={card?.kind || MemoryCardKind.FORMULA} className="atlas-input mt-1.5"><option value="FORMULA">公式</option><option value="TECHNIQUE">解题技巧</option><option value="MEMORY">需要记忆</option></select></label>
      <label className="text-xs font-semibold text-slate-600">显示顺序<input name="sortOrder" type="number" defaultValue={card?.sortOrder || 0} className="atlas-input mt-1.5" /></label>
    </div>
    <label className="block text-xs font-semibold text-slate-600">一句话提示<input name="summary" defaultValue={card?.summary || ''} placeholder="帮助快速回忆使用条件或易错点" className="atlas-input mt-1.5" /></label>
    <label className="block text-xs font-semibold text-slate-600">公式或技巧正文（支持 Markdown 与 LaTeX）
      <textarea name="contentMarkdown" required defaultValue={card?.contentMarkdown || ''} placeholder={'行内公式用 $...$，独立公式用：\n\n$$\n\\frac{1}{1-x}=\\sum_{n=0}^{\\infty}x^n\n$$\n\n可以继续写适用条件、记忆口诀和易错点。'} className="mt-1.5 min-h-52 w-full rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm leading-7 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
    </label>
    <label className="block text-xs font-semibold text-slate-600">标签<input name="tags" defaultValue={card?.tags.join('，') || ''} placeholder="极限，展开，常用" className="atlas-input mt-1.5" /></label>
    <div className="flex flex-wrap gap-5 text-xs text-slate-600">
      <label className="flex items-center gap-2"><input name="pinned" type="checkbox" defaultChecked={card?.pinned} />置顶显示</label>
      <label className="flex items-center gap-2"><input name="showOnHome" type="checkbox" defaultChecked={card ? card.showOnHome : true} />在首页展示</label>
    </div>
    <button className="atlas-button-primary w-full"><Sparkles className="size-4" />{card ? '保存修改' : '添加到公式与技巧'}</button>
  </form>;
}

export default async function MemoryPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const params = await searchParams;
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const q = (params.q || '').trim();
  const kind = Object.values(MemoryCardKind).includes(params.kind as MemoryCardKind) ? params.kind as MemoryCardKind : undefined;
  const cards = await prisma.memoryCard.findMany({
    where: {
      subjectId: subject.id,
      ...(kind ? { kind } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { category: { contains: q, mode: 'insensitive' } }, { contentMarkdown: { contains: q, mode: 'insensitive' } }, { tags: { has: q } }] } : {}),
    },
    orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });
  const now = new Date();

  return <>
    <PageHeader eyebrow="Mathematics · Memory handbook" title="公式与技巧手册" description="按编号整理每天需要背诵的公式、方法与记忆要点；先回忆，再进入背诵模式核对。" action={<div className="flex flex-wrap gap-2"><Link href="/learning-import" className="atlas-button-secondary"><FileUp className="size-4" />导入内容</Link>{cards[0] ? <Link href={`/memory/${cards[0].id}`} className="atlas-button-primary">从第 01 条开始<ArrowRight className="size-4" /></Link> : null}</div>} />
    <details id="new-memory" className="group atlas-card mb-5 scroll-mt-24 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
        <span>手动添加（备用）</span>
        <span className="flex items-center gap-2 font-normal text-slate-400">只在不使用 AI 时展开<ChevronDown className="size-3.5 transition group-open:rotate-180" /></span>
      </summary>
      <div className="border-t border-slate-100 p-5"><MemoryForm /></div>
    </details>
    <form className="atlas-card mb-5 flex flex-col gap-3 p-3 md:flex-row">
      <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={q} placeholder="搜索公式、技巧、分类或标签" className="atlas-input pl-9" /></label>
      <div className="md:w-56"><QuestionFilterSelect name="kind" label="内容类型" value={kind || ''} icon="type" options={[{ value: '', label: '全部内容', description: '显示公式、技巧和记忆内容' }, { value: 'FORMULA', label: '公式', description: '常用定理与公式' }, { value: 'TECHNIQUE', label: '技巧', description: '解题方法与识别信号' }, { value: 'MEMORY', label: '记忆', description: '需要反复记住的结论' }]} /></div>
      <button className="atlas-button-secondary">筛选</button>
      {(q || kind) ? <Link href="/memory" className="atlas-button-secondary">清除</Link> : null}
    </form>

    <div className="mb-4 flex items-center justify-between text-xs text-slate-400"><span>手册共 <strong className="text-slate-700">{cards.length}</strong> 条</span><span>大公式使用独立展示，正文公式保持正常字号</span></div>
    <section className="grid gap-4 xl:grid-cols-2">
        {cards.map((card, index) => {
          const meta = kindMeta[card.kind];
          const Icon = meta.icon;
          const viewedToday = isViewedToday(card.lastViewedAt, now);
          const viewedThisWeek = isViewedThisWeek(card.lastViewedAt, now);
          const reviewDue = Boolean(card.nextReviewAt && card.nextReviewAt <= now && !viewedToday);
          return <article id={`memory-${card.id}`} key={card.id} className="atlas-card flex scroll-mt-24 flex-col overflow-hidden">
            <div className="flex items-start gap-3 px-5 pt-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-5" /></div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold tracking-[0.14em] text-blue-500">第 {String(index + 1).padStart(2, '0')} 条</span><StatusPill tone={meta.tone}>{meta.label}</StatusPill>{viewedToday ? <StatusPill tone="green">今天已看</StatusPill> : viewedThisWeek ? <StatusPill tone="blue">本周已看</StatusPill> : reviewDue ? <StatusPill tone="amber">待复习</StatusPill> : null}{card.pinned ? <Pin className="size-3.5 fill-blue-500 text-blue-500" /> : null}</div><h2 className="mt-2 text-lg font-semibold text-slate-950">{card.title}</h2><div className="mt-1 truncate text-[11px] text-slate-400">{card.category}{card.viewCount ? ` · 已看 ${card.viewCount} 次` : ''}</div></div>
            </div>
            {card.summary ? <div className="mx-5 mt-4 rounded-xl bg-amber-50/60 px-3 py-2.5 text-xs leading-6 text-amber-900"><span className="mr-2 font-semibold text-amber-600">记忆提示</span>{card.summary}</div> : null}
            <div className="atlas-memory-preview mx-5 mt-4 flex min-h-32 flex-1 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-blue-50/35 p-4"><MarkdownContent>{memoryPreview(card.contentMarkdown)}</MarkdownContent></div>
            <div className="flex items-center justify-between gap-3 px-5 py-4"><div className="flex min-w-0 gap-1.5 overflow-hidden">{card.tags.slice(0, 3).map((tag) => <span key={tag} className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-500">{tag}</span>)}</div><Link href={`/memory/${card.id}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">打开背诵<ArrowRight className="size-3.5" /></Link></div>
            <details className="border-t border-slate-100 bg-slate-50/60 px-5 py-3"><summary className="cursor-pointer list-none text-xs font-semibold text-slate-500 hover:text-slate-800">编辑这条内容</summary><div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_150px]"><MemoryForm card={card} /><form action={deleteMemoryCardAction.bind(null, card.id)}><DangerSubmit label="删除内容" confirmText={`确定删除“${card.title}”吗？删除后无法恢复。`} /></form></div></details>
          </article>;
        })}
      {!cards.length ? <div className="atlas-card grid min-h-48 place-items-center border-dashed p-8 text-center xl:col-span-2"><div><Sigma className="mx-auto size-9 text-blue-300" /><h2 className="mt-4 font-semibold text-slate-800">手册还是空的</h2><p className="mt-2 text-sm text-slate-400">到学习资料导入页，让 AI 整理公式和知识点后上传 .md。</p><Link href="/learning-import" className="atlas-button-secondary mt-4"><FileUp className="size-4" />前往学习资料导入</Link></div></div> : null}
    </section>
  </>;
}
