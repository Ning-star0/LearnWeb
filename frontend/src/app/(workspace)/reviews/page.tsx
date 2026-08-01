import Link from 'next/link';
import { Plus } from 'lucide-react';
import { subDays } from 'date-fns';
import { PageHeader } from '@/components/mistake-atlas/ui';
import { QuestionList } from '@/components/mistake-atlas/question-list';
import { prisma } from '@/lib/prisma';

export default async function ReviewsPage() {
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const questions = await prisma.question.findMany({ where: { subjectId: math.id, status: 'ACTIVE', nextReviewAt: { lte: new Date() } }, include: { textbook: true, chapter: true, knowledgePoints: { include: { knowledgePoint: true } }, errorTypes: { include: { errorType: true } } }, orderBy: [{ priority: 'desc' }, { nextReviewAt: 'asc' }] });
  const overdueBefore = subDays(new Date(), 1);
  const overdue = questions.filter((item) => item.nextReviewAt && item.nextReviewAt < overdueBefore).length;
  return <><PageHeader eyebrow="Mathematics · Review queue" title="今日复习" description={`共有 ${questions.length} 道数学错题到期，其中 ${overdue} 道已经逾期。点击题目后记录本次重做结果。`} action={<Link href="/questions/new" className="atlas-button-primary"><Plus className="size-4" />录入错题</Link>} /><QuestionList questions={questions} emptyText="今天的复习已经清空。" /></>;
}
