'use server';

import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AttemptResult, QuestionStatus, QuestionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { calculateMastery } from '@/lib/mastery';
import { prisma } from '@/lib/prisma';

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function optionalDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function questionCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `MA-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function saveAttachment(file: File, questionId: string) {
  if (!file.size) return;
  if (!allowedImages.has(file.type) || file.size > 15 * 1024 * 1024) {
    throw new Error('图片仅支持 JPG、PNG、WEBP，且不能超过 15MB。');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const storageName = `${randomBytes(20).toString('hex')}.${extension}`;
  const uploadRoot = process.env.UPLOAD_ROOT;
  if (!uploadRoot) throw new Error('UPLOAD_ROOT 尚未配置。');
  await mkdir(uploadRoot, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ uploadRoot, storageName), buffer, { flag: 'wx' });
  await prisma.attachment.create({
    data: { questionId, originalName: file.name.slice(0, 255), storageName, mimeType: file.type, size: file.size, sha256 },
  });
}

export async function createQuestionAction(formData: FormData) {
  await requireUser();
  const subject = await prisma.subject.findUnique({ where: { slug: 'mathematics' } });
  if (!subject) throw new Error('数学学科尚未初始化。');

  const title = text(formData, 'title');
  const bodyMarkdown = text(formData, 'bodyMarkdown');
  const wrongReason = text(formData, 'wrongReason');
  const textbookId = text(formData, 'textbookId');
  const chapterId = text(formData, 'chapterId');
  if (!title || !bodyMarkdown || !wrongReason || !textbookId || !chapterId) {
    throw new Error('标题、题目正文、错因、教材和章节为必填项。');
  }

  const [textbook, chapter] = await Promise.all([
    prisma.textbook.findFirst({ where: { id: textbookId, subjectId: subject.id } }),
    prisma.chapter.findFirst({ where: { id: chapterId, textbook: { subjectId: subject.id } } }),
  ]);
  if (!textbook || !chapter || chapter.textbookId !== textbook.id) throw new Error('教材或章节选择无效。');

  const knowledgePointIds = formData.getAll('knowledgePointIds').map(String);
  const errorTypeIds = formData.getAll('errorTypeIds').map(String);
  const question = await prisma.question.create({
    data: {
      code: questionCode(), subjectId: subject.id, textbookId, chapterId, title,
      bodyMarkdown, wrongReason,
      reflection: text(formData, 'reflection') || null,
      reminder: text(formData, 'reminder') || null,
      sourcePage: text(formData, 'sourcePage') || null,
      sourceQuestionNumber: text(formData, 'sourceQuestionNumber') || null,
      tags: text(formData, 'tags').split(/[,，]/).map((item) => item.trim()).filter(Boolean),
      questionType: (text(formData, 'questionType') as QuestionType) || QuestionType.CALCULATION,
      difficulty: Math.min(5, Math.max(1, Number(formData.get('difficulty')) || 3)),
      priority: Math.min(3, Math.max(1, Number(formData.get('priority')) || 2)),
      nextReviewAt: optionalDate(text(formData, 'nextReviewAt')),
      knowledgePoints: { create: knowledgePointIds.map((knowledgePointId, index) => ({ knowledgePointId, primary: index === 0 })) },
      errorTypes: { create: errorTypeIds.map((errorTypeId, index) => ({ errorTypeId, primary: index === 0 })) },
    },
  });

  const image = formData.get('image');
  if (image instanceof File && image.size) await saveAttachment(image, question.id);
  await prisma.auditLog.create({ data: { action: 'QUESTION_CREATED', entity: 'Question', entityId: question.id } });
  revalidatePath('/');
  revalidatePath('/questions');
  redirect(`/questions/${question.id}?created=1`);
}

export async function updateQuestionAction(questionId: string, formData: FormData) {
  await requireUser();
  const existing = await prisma.question.findUnique({ where: { id: questionId } });
  if (!existing) throw new Error('错题不存在。');
  const title = text(formData, 'title');
  const bodyMarkdown = text(formData, 'bodyMarkdown');
  const wrongReason = text(formData, 'wrongReason');
  if (!title || !bodyMarkdown || !wrongReason) throw new Error('标题、题目正文和错因为必填项。');
  const knowledgePointIds = formData.getAll('knowledgePointIds').map(String);
  const errorTypeIds = formData.getAll('errorTypeIds').map(String);
  await prisma.$transaction(async (tx) => {
    await tx.questionKnowledgePoint.deleteMany({ where: { questionId } });
    await tx.questionErrorType.deleteMany({ where: { questionId } });
    await tx.question.update({
      where: { id: questionId },
      data: {
        title, bodyMarkdown, wrongReason,
        textbookId: text(formData, 'textbookId'), chapterId: text(formData, 'chapterId'),
        reflection: text(formData, 'reflection') || null, reminder: text(formData, 'reminder') || null,
        sourcePage: text(formData, 'sourcePage') || null, sourceQuestionNumber: text(formData, 'sourceQuestionNumber') || null,
        tags: text(formData, 'tags').split(/[,，]/).map((item) => item.trim()).filter(Boolean),
        questionType: text(formData, 'questionType') as QuestionType,
        difficulty: Math.min(5, Math.max(1, Number(formData.get('difficulty')) || 3)),
        priority: Math.min(3, Math.max(1, Number(formData.get('priority')) || 2)),
        nextReviewAt: optionalDate(text(formData, 'nextReviewAt')),
        knowledgePoints: { create: knowledgePointIds.map((knowledgePointId, index) => ({ knowledgePointId, primary: index === 0 })) },
        errorTypes: { create: errorTypeIds.map((errorTypeId, index) => ({ errorTypeId, primary: index === 0 })) },
      },
    });
  });
  const image = formData.get('image');
  if (image instanceof File && image.size) await saveAttachment(image, questionId);
  revalidatePath(`/questions/${questionId}`);
  revalidatePath('/questions');
  redirect(`/questions/${questionId}?updated=1`);
}

export async function deleteQuestionAction(questionId: string) {
  await requireUser();
  await prisma.question.update({ where: { id: questionId }, data: { status: 'DELETED', deletedAt: new Date() } });
  revalidatePath('/questions'); revalidatePath('/trash');
  redirect('/questions?deleted=1');
}

export async function restoreQuestionAction(questionId: string) {
  await requireUser();
  await prisma.question.update({ where: { id: questionId }, data: { status: 'ACTIVE', deletedAt: null } });
  revalidatePath('/questions'); revalidatePath('/trash');
}

export async function recordAttemptAction(questionId: string, formData: FormData) {
  await requireUser();
  const result = text(formData, 'result') as AttemptResult;
  if (!Object.values(AttemptResult).includes(result)) throw new Error('重做结果无效。');
  const nextReviewAt = optionalDate(text(formData, 'nextReviewAt'));
  await prisma.attempt.create({
    data: {
      questionId, result, nextReviewAt,
      durationSeconds: Number(formData.get('durationMinutes')) > 0 ? Math.round(Number(formData.get('durationMinutes')) * 60) : null,
      note: text(formData, 'note') || null,
    },
  });
  await recalculateQuestion(questionId, nextReviewAt);
  revalidatePath('/'); revalidatePath('/reviews'); revalidatePath('/questions'); revalidatePath(`/questions/${questionId}`);
  redirect(`/questions/${questionId}?attempt=1`);
}

export async function recalculateQuestion(questionId: string, explicitNextReview?: Date | null) {
  const [question, attempts, settings] = await Promise.all([
    prisma.question.findUniqueOrThrow({ where: { id: questionId } }),
    prisma.attempt.findMany({ where: { questionId }, orderBy: [{ attemptedAt: 'asc' }, { createdAt: 'asc' }] }),
    prisma.learningSettings.upsert({ where: { id: 'learning' }, update: {}, create: {} }),
  ]);
  const { correctStreak, wrongCount, mastered } = calculateMastery(attempts.map((attempt) => attempt.result), settings.masteryThreshold);
  await prisma.question.update({
    where: { id: questionId },
    data: {
      correctStreak, attemptCount: attempts.length, wrongCount,
      status: mastered ? QuestionStatus.MASTERED : question.status === QuestionStatus.DELETED ? QuestionStatus.DELETED : QuestionStatus.ACTIVE,
      masteredAt: mastered ? question.masteredAt || new Date() : null,
      nextReviewAt: mastered ? explicitNextReview ?? null : explicitNextReview ?? question.nextReviewAt,
    },
  });
}

export async function createTextbookAction(formData: FormData) {
  await requireUser();
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const name = text(formData, 'name'); if (!name) return;
  await prisma.textbook.create({ data: { subjectId: subject.id, name, description: text(formData, 'description') || null } });
  revalidatePath('/textbooks'); revalidatePath('/questions/new');
}

export async function createChapterAction(formData: FormData) {
  await requireUser();
  const name = text(formData, 'name'); const textbookId = text(formData, 'textbookId'); if (!name || !textbookId) return;
  await prisma.chapter.create({ data: { name, textbookId, parentId: text(formData, 'parentId') || null } });
  revalidatePath('/textbooks'); revalidatePath('/knowledge-points'); revalidatePath('/questions/new');
}

export async function createKnowledgePointAction(formData: FormData) {
  await requireUser();
  const name = text(formData, 'name'); const chapterId = text(formData, 'chapterId'); if (!name || !chapterId) return;
  await prisma.knowledgePoint.create({ data: { name, chapterId, description: text(formData, 'description') || null } });
  revalidatePath('/knowledge-points'); revalidatePath('/questions/new');
}

export async function createErrorTypeAction(formData: FormData) {
  await requireUser();
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const name = text(formData, 'name'); if (!name) return;
  await prisma.errorType.create({ data: { subjectId: subject.id, name, description: text(formData, 'description') || null } });
  revalidatePath('/error-types'); revalidatePath('/questions/new');
}

type ParsedMarkdownQuestion = { title: string; textbook: string; chapter: string; questionType: string; errorTypes: string[]; knowledgePoints: string[]; bodyMarkdown: string; wrongReason: string; reflection: string };

function parseImportBlock(block: string): ParsedMarkdownQuestion {
  const heading = block.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
  const field = (name: string) => block.match(new RegExp(`^-\\s*${name}[：:]\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  const section = (name: string) => block.match(new RegExp(`##\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`))?.[1]?.trim() || '';
  return {
    title: heading, textbook: field('教材'), chapter: field('章节'), questionType: field('题型') || '计算题',
    errorTypes: field('错误类型').split(/[,，]/).map((item) => item.trim()).filter(Boolean),
    knowledgePoints: field('知识点').split(/[,，]/).map((item) => item.trim()).filter(Boolean),
    bodyMarkdown: section('题目'), wrongReason: section('错因'), reflection: section('复盘'),
  };
}

const importedTypeMap: Record<string, QuestionType> = { 单选题: 'SINGLE_CHOICE', 多选题: 'MULTIPLE_CHOICE', 填空题: 'FILL_BLANK', 计算题: 'CALCULATION', 证明题: 'PROOF', 判断题: 'TRUE_FALSE', 综合题: 'COMPREHENSIVE', 其他: 'OTHER' };

export async function importMarkdownAction(formData: FormData) {
  await requireUser();
  const raw = text(formData, 'markdown');
  const blocks = raw.split(/^---\s*$/m).map((item) => item.trim()).filter(Boolean);
  if (!blocks.length || blocks.length > 1000) throw new Error('导入内容必须包含 1 到 1000 道题。');
  const parsed = blocks.map(parseImportBlock);
  if (parsed.some((item) => !item.title || !item.textbook || !item.chapter || !item.bodyMarkdown || !item.wrongReason)) throw new Error('导入内容缺少标题、教材、章节、题目或错因。');
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });

  let imported = 0;
  await prisma.$transaction(async (tx) => {
    for (const item of parsed) {
      const textbook = await tx.textbook.findFirst({ where: { subjectId: subject.id, name: item.textbook } });
      if (!textbook) throw new Error(`找不到教材：${item.textbook}`);
      const chapter = await tx.chapter.findFirst({ where: { textbookId: textbook.id, name: item.chapter } });
      if (!chapter) throw new Error(`在 ${item.textbook} 中找不到章节：${item.chapter}`);
      const points = item.knowledgePoints.length ? await tx.knowledgePoint.findMany({ where: { chapterId: chapter.id, name: { in: item.knowledgePoints } } }) : [];
      const errors = item.errorTypes.length ? await tx.errorType.findMany({ where: { subjectId: subject.id, name: { in: item.errorTypes } } }) : [];
      await tx.question.create({ data: {
        code: questionCode(), subjectId: subject.id, textbookId: textbook.id, chapterId: chapter.id,
        title: item.title, bodyMarkdown: item.bodyMarkdown, wrongReason: item.wrongReason, reflection: item.reflection || null,
        questionType: importedTypeMap[item.questionType] || 'OTHER', tags: [],
        knowledgePoints: { create: points.map((point, index) => ({ knowledgePointId: point.id, primary: index === 0 })) },
        errorTypes: { create: errors.map((error, index) => ({ errorTypeId: error.id, primary: index === 0 })) },
      } });
      imported += 1;
    }
  });
  await prisma.auditLog.create({ data: { action: 'MARKDOWN_IMPORTED', entity: 'Question', detail: { count: imported } } });
  revalidatePath('/questions'); revalidatePath('/');
  redirect(`/imports?imported=${imported}`);
}
