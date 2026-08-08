import Link from 'next/link';
import { FileUp, Merge, Pencil, Plus, Sigma } from 'lucide-react';
import { createKnowledgePointAction, mergeKnowledgePointAction, updateKnowledgePointAction } from '@/app/actions/math-actions';
import { DangerSubmit } from '@/components/mistake-atlas/danger-submit';
import { PageHeader, ProgressBar, SectionTitle, StatusPill } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

export default async function KnowledgePointsPage() {
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const [points, chapters] = await Promise.all([
    prisma.knowledgePoint.findMany({ where: { chapter: { textbook: { subjectId: math.id } } }, include: { chapter: { include: { textbook: true } }, questions: { include: { question: { select: { status: true, attemptCount: true } } } } }, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    prisma.chapter.findMany({ where: { textbook: { subjectId: math.id }, active: true }, include: { textbook: true }, orderBy: { sortOrder: 'asc' } }),
  ]);
  const activePoints = points.filter((point) => point.active);
  return <>
    <PageHeader eyebrow="Mathematics · Knowledge map" title="数学知识点" description="知识点可随学习资料 Markdown 自动建立并挂到对应章节，也可以在本页手动维护和合并。" action={<Link href="/learning-import" className="atlas-button-primary"><FileUp className="size-4" />学习资料导入</Link>} />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3">{points.map((point) => {
        const effective = point.questions.filter((link) => link.question.status !== 'DELETED');
        const mastered = effective.filter((link) => link.question.status === 'MASTERED').length;
        const attempts = effective.reduce((sum, link) => sum + link.question.attemptCount, 0);
        const rate = effective.length ? mastered / effective.length * 100 : 0;
        return <details key={point.id} className="atlas-card p-5"><summary className="flex cursor-pointer list-none items-center gap-4"><div className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Sigma className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2 font-semibold text-slate-800">{point.name}<StatusPill tone={point.active ? 'green' : 'slate'}>{point.active ? '启用' : '已停用'}</StatusPill></div><div className="mt-1 truncate text-xs text-slate-400">{point.chapter.textbook.name} / {point.chapter.name} · {effective.length} 题 · {attempts} 次重做</div></div><StatusPill tone="blue">掌握 {Math.round(rate)}%</StatusPill></summary><ProgressBar value={rate} tone="blue" /><div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2"><form action={updateKnowledgePointAction.bind(null, point.id)} className="space-y-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Pencil className="size-3.5" />编辑知识点</div><input name="name" required defaultValue={point.name} className="atlas-input" /><textarea name="description" defaultValue={point.description || ''} className="min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" /><label className="flex items-center gap-2 text-xs text-slate-600"><input name="active" type="checkbox" defaultChecked={point.active} />允许后续选择</label><button className="atlas-button-secondary w-full">保存修改</button></form><form action={mergeKnowledgePointAction.bind(null, point.id)} className="space-y-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Merge className="size-3.5" />合并到另一个知识点</div><select name="targetId" required defaultValue="" className="atlas-input"><option value="">选择目标知识点</option>{activePoints.filter((item) => item.id !== point.id).map((item) => <option key={item.id} value={item.id}>{item.chapter.name} / {item.name}</option>)}</select><p className="text-[11px] leading-5 text-slate-400">全部题目关联会迁移到目标知识点，当前知识点会停用，但不会删除历史题目。</p><DangerSubmit label="确认合并" confirmText={`确定将“${point.name}”合并到所选目标吗？题目关联会被批量迁移。`} /></form></div></details>;
      })}{!points.length ? <div className="atlas-card p-8 text-center text-sm text-slate-400">还没有知识点。</div> : null}</div>
      <form action={createKnowledgePointAction} className="atlas-card h-fit p-5"><SectionTitle title="添加知识点" /><div className="space-y-4"><label><span className="atlas-label">所属章节 *</span><select name="chapterId" required className="atlas-input"><option value="">选择章节</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.textbook.name} / {chapter.name}</option>)}</select></label><label><span className="atlas-label">知识点名称 *</span><input name="name" required className="atlas-input" /></label><label><span className="atlas-label">说明</span><textarea name="description" className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm" /></label><button className="atlas-button-primary w-full"><Plus className="size-4" />添加知识点</button></div></form>
    </div>
  </>;
}
