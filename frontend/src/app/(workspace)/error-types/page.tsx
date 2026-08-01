import { Merge, Pencil, Plus, Tags } from 'lucide-react';
import { createErrorTypeAction, mergeErrorTypeAction, updateErrorTypeAction } from '@/app/actions/math-actions';
import { DangerSubmit } from '@/components/mistake-atlas/danger-submit';
import { PageHeader, ProgressBar, SectionTitle, StatusPill } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

export default async function ErrorTypesPage() {
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const [types, total] = await Promise.all([
    prisma.errorType.findMany({ where: { subjectId: math.id }, include: { questions: { include: { question: { select: { status: true, attemptCount: true, wrongCount: true } } } } }, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    prisma.question.count({ where: { subjectId: math.id, status: { not: 'DELETED' } } }),
  ]);
  const activeTypes = types.filter((item) => item.active);
  return <>
    <PageHeader eyebrow="Mathematics · Error taxonomy" title="数学错误类型" description="错误类型可编辑、停用和合并；统计只计算当前有效错题。" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3">{types.map((type, index) => {
        const effective = type.questions.filter((link) => link.question.status !== 'DELETED');
        const attempts = effective.reduce((sum, link) => sum + link.question.attemptCount, 0);
        const repeated = effective.filter((link) => link.question.wrongCount >= 3).length;
        const percentage = total ? effective.length / total * 100 : 0;
        return <details key={type.id} className="atlas-card p-5"><summary className="flex cursor-pointer list-none items-center gap-3"><div className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-500"><Tags className="size-4" /></div><div className="flex-1"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800">{type.name}<StatusPill tone={type.active ? 'green' : 'slate'}>{type.active ? '启用' : '已停用'}</StatusPill></div><div className="mt-1 text-xs text-slate-400">{effective.length} 题 · {attempts} 次重做 · {repeated} 道反复错误</div></div><StatusPill tone={index < 3 ? 'amber' : 'slate'}>{Math.round(percentage)}%</StatusPill></summary><ProgressBar value={percentage} tone={index < 3 ? 'amber' : 'blue'} />{type.description ? <p className="mt-2 text-xs text-slate-400">{type.description}</p> : null}<div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2"><form action={updateErrorTypeAction.bind(null, type.id)} className="space-y-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Pencil className="size-3.5" />编辑错误类型</div><input name="name" required defaultValue={type.name} className="atlas-input" /><textarea name="description" defaultValue={type.description || ''} className="min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" /><label className="flex items-center gap-2 text-xs text-slate-600"><input name="active" type="checkbox" defaultChecked={type.active} />允许后续选择</label><button className="atlas-button-secondary w-full">保存修改</button></form><form action={mergeErrorTypeAction.bind(null, type.id)} className="space-y-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Merge className="size-3.5" />合并到另一个类型</div><select name="targetId" required defaultValue="" className="atlas-input"><option value="">选择目标错误类型</option>{activeTypes.filter((item) => item.id !== type.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><p className="text-[11px] leading-5 text-slate-400">全部题目关联会迁移到目标类型，当前类型随后停用。</p><DangerSubmit label="确认合并" confirmText={`确定将“${type.name}”合并到所选目标吗？题目关联会被批量迁移。`} /></form></div></details>;
      })}{!types.length ? <div className="atlas-card p-8 text-center text-sm text-slate-400">还没有错误类型。</div> : null}</div>
      <form action={createErrorTypeAction} className="atlas-card h-fit p-5"><SectionTitle title="添加错误类型" /><div className="space-y-4"><label><span className="atlas-label">名称 *</span><input name="name" required className="atlas-input" placeholder="例如：边界条件遗漏" /></label><label><span className="atlas-label">判定说明</span><textarea name="description" className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm" /></label><button className="atlas-button-primary w-full"><Plus className="size-4" />添加类型</button></div></form>
    </div>
  </>;
}
