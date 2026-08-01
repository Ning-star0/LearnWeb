import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { updateQuestionAction } from '@/app/actions/math-actions';
import { QuestionForm } from '@/components/mistake-atlas/question-form';
import { PageHeader } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const [question, textbooks, chapters, knowledgePoints, errorTypes] = await Promise.all([
    prisma.question.findUnique({ where: { id }, include: { knowledgePoints: true, errorTypes: true } }),
    prisma.textbook.findMany({ where: { subjectId: subject.id, active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.chapter.findMany({ where: { textbook: { subjectId: subject.id }, active: true }, include: { textbook: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.knowledgePoint.findMany({ where: { chapter: { textbook: { subjectId: subject.id } }, active: true }, include: { chapter: true }, orderBy: { name: 'asc' } }),
    prisma.errorType.findMany({ where: { subjectId: subject.id, active: true }, orderBy: { name: 'asc' } }),
  ]);
  if (!question || question.status === 'DELETED') notFound();
  return <><PageHeader eyebrow={question.code} title="编辑数学错题" description="修改分类和内容不会改写历史重做轨迹。" action={<Link href={`/questions/${id}`} className="atlas-button-secondary"><ArrowLeft className="size-4" />返回详情</Link>} /><QuestionForm action={updateQuestionAction.bind(null, id)} textbooks={textbooks} chapters={chapters} knowledgePoints={knowledgePoints} errorTypes={errorTypes} initial={question} /></>;
}
