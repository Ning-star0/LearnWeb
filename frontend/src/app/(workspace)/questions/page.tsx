import Link from 'next/link';
import { Filter, Plus, Search } from 'lucide-react';
import { Prisma, QuestionStatus } from '@prisma/client';
import { PageHeader } from '@/components/mistake-atlas/ui';
import { QuestionList } from '@/components/mistake-atlas/question-list';
import { prisma } from '@/lib/prisma';

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; deleted?: string }> }) {
  const { q = '', status, deleted } = await searchParams;
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const where: Prisma.QuestionWhereInput = {
    subjectId: math.id,
    status: status && Object.values(QuestionStatus).includes(status as QuestionStatus) ? status as QuestionStatus : { not: 'DELETED' },
    ...(q ? { OR: [
      { title: { contains: q, mode: 'insensitive' } }, { bodyMarkdown: { contains: q, mode: 'insensitive' } },
      { wrongReason: { contains: q, mode: 'insensitive' } }, { tags: { has: q } },
      { knowledgePoints: { some: { knowledgePoint: { name: { contains: q, mode: 'insensitive' } } } } },
    ] } : {}),
  };
  const questions = await prisma.question.findMany({ where, include: { textbook: true, chapter: true, knowledgePoints: { include: { knowledgePoint: true } }, errorTypes: { include: { errorType: true } } }, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] });
  return <><PageHeader eyebrow="Mathematics · Mistake library" title="数学错题库" description="按题目、错因、知识点和标签搜索；所有列表都来自真实数据库。" action={<Link href="/questions/new" className="atlas-button-primary"><Plus className="size-4" />录入错题</Link>} />{deleted ? <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">错题已移入回收站，可随时恢复。</div> : null}<form className="atlas-card mb-5 grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]"><label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={q} className="atlas-input pl-9" placeholder="搜索标题、正文、错因、知识点或标签" /></label><select name="status" defaultValue={status || ''} className="atlas-input"><option value="">全部状态</option><option value="ACTIVE">学习中</option><option value="MASTERED">已掌握</option><option value="ARCHIVED">已归档</option></select><button className="atlas-button-secondary"><Filter className="size-4" />筛选</button></form><QuestionList questions={questions} /></>;
}
