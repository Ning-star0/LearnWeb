import { Plus, Sigma } from 'lucide-react';
import { createKnowledgePointAction } from '@/app/actions/math-actions';
import { PageHeader, SectionTitle, StatusPill } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

export default async function KnowledgePointsPage() {
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const [points, chapters] = await Promise.all([
    prisma.knowledgePoint.findMany({ where: { chapter: { textbook: { subjectId: math.id } } }, include: { chapter: { include: { textbook: true } }, _count: { select: { questions: true } } }, orderBy: { name: 'asc' } }),
    prisma.chapter.findMany({ where: { textbook: { subjectId: math.id } }, include: { textbook: true }, orderBy: { sortOrder: 'asc' } }),
  ]);
  return <><PageHeader eyebrow="Mathematics · Knowledge map" title="数学知识点" description="每个知识点必须挂在教材章节下，一道错题可以关联多个知识点。" /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]"><div className="atlas-card overflow-hidden"><div className="divide-y divide-slate-100">{points.map((point) => <div key={point.id} className="flex items-center gap-4 p-5"><div className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Sigma className="size-4" /></div><div className="min-w-0 flex-1"><div className="font-semibold text-slate-800">{point.name}</div><div className="mt-1 truncate text-xs text-slate-400">{point.chapter.textbook.name} / {point.chapter.name}</div></div><StatusPill tone="blue">{point._count.questions} 题</StatusPill></div>)}{!points.length ? <div className="p-8 text-center text-sm text-slate-400">还没有知识点。</div> : null}</div></div><form action={createKnowledgePointAction} className="atlas-card h-fit p-5"><SectionTitle title="添加知识点" /><div className="space-y-4"><label><span className="atlas-label">所属章节 *</span><select name="chapterId" required className="atlas-input"><option value="">选择章节</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.textbook.name} / {chapter.name}</option>)}</select></label><label><span className="atlas-label">知识点名称 *</span><input name="name" required className="atlas-input" /></label><label><span className="atlas-label">说明</span><textarea name="description" className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm" /></label><button className="atlas-button-primary w-full"><Plus className="size-4" />添加知识点</button></div></form></div></>;
}
