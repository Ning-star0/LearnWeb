import { PageHeader } from '@/components/mistake-atlas/ui';
import { QuestionList } from '@/components/mistake-atlas/question-list';
import { prisma } from '@/lib/prisma';

export default async function MasteredPage() {
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const questions = await prisma.question.findMany({ where: { subjectId: math.id, status: 'MASTERED' }, include: { textbook: true, chapter: true, knowledgePoints: { include: { knowledgePoint: true } }, errorTypes: { include: { errorType: true } } }, orderBy: { masteredAt: 'desc' } });
  return <><PageHeader eyebrow="Mathematics · Mastered" title="已掌握" description="达到连续独立做对标准的数学错题；如果之后再次做错，会自动退回学习中。" /><QuestionList questions={questions} emptyText="还没有达到掌握标准的错题。" /></>;
}
