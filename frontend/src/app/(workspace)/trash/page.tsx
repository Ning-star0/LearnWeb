import { ArchiveRestore, Trash2 } from 'lucide-react';
import { restoreQuestionAction } from '@/app/actions/math-actions';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

export default async function TrashPage() {
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const questions = await prisma.question.findMany({ where: { subjectId: math.id, status: 'DELETED' }, include: { textbook: true, chapter: true }, orderBy: { deletedAt: 'desc' } });
  return <><PageHeader eyebrow="Mathematics · Soft delete" title="回收站" description="删除采用软删除，题目、图片和重做历史都会保留；恢复后重新进入学习中。" /><div className="atlas-card overflow-hidden">{questions.length ? <div className="divide-y divide-slate-100">{questions.map((question) => <div key={question.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500"><Trash2 className="size-4" /></div><div className="min-w-0 flex-1"><div className="font-semibold text-slate-800">{question.title}</div><div className="mt-1 text-xs text-slate-400">{question.code} · {question.textbook.name} / {question.chapter.name} · 删除于 {question.deletedAt?.toLocaleString('zh-CN')}</div></div><StatusPill>已删除</StatusPill><form action={restoreQuestionAction.bind(null, question.id)}><button className="atlas-button-secondary"><ArchiveRestore className="size-4" />恢复</button></form></div>)}</div> : <div className="grid min-h-56 place-items-center text-center"><div><Trash2 className="mx-auto size-9 text-slate-300" /><p className="mt-3 text-sm text-slate-400">回收站是空的。</p></div></div>}</div></>;
}
