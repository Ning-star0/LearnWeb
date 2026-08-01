import { PageHeader } from '@/components/mistake-atlas/ui';
import { QuestionList } from '@/components/mistake-atlas/question-list';
import { prisma } from '@/lib/prisma';

export default async function CorrectPage() {
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const questions = await prisma.question.findMany({ where: { subjectId: math.id, status: { not: 'DELETED' }, attempts: { some: { result: { in: ['INDEPENDENT_CORRECT', 'HINTED_CORRECT'] } } } }, include: { textbook: true, chapter: true, knowledgePoints: { include: { knowledgePoint: true } }, errorTypes: { include: { errorType: true } } }, orderBy: { updatedAt: 'desc' } });
  return <><PageHeader eyebrow="Mathematics · Recently correct" title="最近做对" description="至少有过一次独立做对或提示后做对的数学错题；这并不等同于已经掌握。" /><QuestionList questions={questions} emptyText="还没有记录做对的错题。" /></>;
}
