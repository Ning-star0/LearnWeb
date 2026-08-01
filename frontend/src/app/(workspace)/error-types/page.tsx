import { Plus, Tags } from 'lucide-react';
import { createErrorTypeAction } from '@/app/actions/math-actions';
import { PageHeader, ProgressBar, SectionTitle, StatusPill } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

export default async function ErrorTypesPage() {
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const [types, total] = await Promise.all([
    prisma.errorType.findMany({ where: { subjectId: math.id }, include: { _count: { select: { questions: true } } }, orderBy: { questions: { _count: 'desc' } } }),
    prisma.question.count({ where: { subjectId: math.id, status: { not: 'DELETED' } } }),
  ]);
  return <><PageHeader eyebrow="Mathematics · Error taxonomy" title="数学错误类型" description="错误类型独立于知识点，用来描述为什么会错；可在一题上关联多个原因。" /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]"><div className="atlas-card p-6"><div className="space-y-5">{types.map((type, index) => <div key={type.id}><div className="mb-2 flex items-center gap-3"><div className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-500"><Tags className="size-4" /></div><div className="flex-1 text-sm font-semibold text-slate-800">{type.name}</div><StatusPill tone={index < 3 ? 'amber' : 'slate'}>{type._count.questions} 题</StatusPill></div><ProgressBar value={total ? type._count.questions / total * 100 : 0} tone={index < 3 ? 'amber' : 'blue'} />{type.description ? <p className="ml-11 mt-2 text-xs text-slate-400">{type.description}</p> : null}</div>)}</div></div><form action={createErrorTypeAction} className="atlas-card h-fit p-5"><SectionTitle title="添加错误类型" /><div className="space-y-4"><label><span className="atlas-label">名称 *</span><input name="name" required className="atlas-input" placeholder="例如：边界条件遗漏" /></label><label><span className="atlas-label">判定说明</span><textarea name="description" className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm" /></label><button className="atlas-button-primary w-full"><Plus className="size-4" />添加类型</button></div></form></div></>;
}
