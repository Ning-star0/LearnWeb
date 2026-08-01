import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createQuestionAction } from '@/app/actions/math-actions';
import { PageHeader } from '@/components/mistake-atlas/ui';
import { QuestionForm } from '@/components/mistake-atlas/question-form';
import { prisma } from '@/lib/prisma';

export default async function NewQuestionPage() {
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const [textbooks, chapters, knowledgePoints, errorTypes] = await Promise.all([
    prisma.textbook.findMany({ where: { subjectId: subject.id, active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.chapter.findMany({ where: { textbook: { subjectId: subject.id }, active: true }, include: { textbook: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.knowledgePoint.findMany({ where: { chapter: { textbook: { subjectId: subject.id } }, active: true }, include: { chapter: true }, orderBy: { name: 'asc' } }),
    prisma.errorType.findMany({ where: { subjectId: subject.id, active: true }, orderBy: { name: 'asc' } }),
  ]);
  return <><PageHeader eyebrow="Mathematics · New mistake" title="录入数学错题" description="记录题目本身，更要记录当时真正的思考断点。题目支持 Markdown 和 LaTeX，图片只会通过鉴权接口提供。" action={<Link href="/questions" className="atlas-button-secondary"><ArrowLeft className="size-4" />返回错题库</Link>} /><QuestionForm action={createQuestionAction} textbooks={textbooks} chapters={chapters} knowledgePoints={knowledgePoints} errorTypes={errorTypes} /></>;
}
