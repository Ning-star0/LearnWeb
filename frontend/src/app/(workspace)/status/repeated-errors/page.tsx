import { PageHeader } from '@/components/mistake-atlas/ui';
import { QuestionList } from '@/components/mistake-atlas/question-list';
import { prisma } from '@/lib/prisma';

export default async function RepeatedErrorsPage() {
  const [math, settings] = await Promise.all([prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } }), prisma.learningSettings.upsert({ where: { id: 'learning' }, update: {}, create: {} })]);
  const questions = await prisma.question.findMany({ where: { subjectId: math.id, status: 'ACTIVE', wrongCount: { gte: settings.repeatedErrorThreshold } }, include: { textbook: true, chapter: true, knowledgePoints: { include: { knowledgePoint: true } }, errorTypes: { include: { errorType: true } } }, orderBy: [{ wrongCount: 'desc' }, { updatedAt: 'desc' }] });
  return <><PageHeader eyebrow="Mathematics · Repeated errors" title="反复错误" description={`累计做错或完全不会达到 ${settings.repeatedErrorThreshold} 次的数学错题，需要优先复盘错因。`} /><QuestionList questions={questions} emptyText="目前没有达到反复错误阈值的错题。" /></>;
}
