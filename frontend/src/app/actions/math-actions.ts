'use server';

import { randomBytes } from 'node:crypto';
import { AttemptResult, AttemptSource, MasteryOverride, Prisma, QuestionMaterialType, QuestionStatus, QuestionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { saveImageAttachment } from '@/lib/attachments';
import { calculateMastery } from '@/lib/mastery';
import { questionFingerprint } from '@/lib/imports/markdown';
import { prisma } from '@/lib/prisma';

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function optionalDate(value: string) {
  if (!value) return null;
  const zonedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00+08:00`
    : /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+08:00`;
  const date = new Date(zonedValue);
  if (Number.isNaN(date.getTime())) throw new Error('日期或时间无效。');
  return date;
}

function localDateTime(value: string) {
  return optionalDate(value) ?? new Date();
}

function optionalBoundedNumber(formData: FormData, key: string, minimum: number, maximum: number) {
  const raw = text(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum) throw new Error(`${key} 超出允许范围。`);
  return value;
}

function materialType(formData: FormData) {
  const value = text(formData, 'materialType') as QuestionMaterialType;
  if (!Object.values(QuestionMaterialType).includes(value)) throw new Error('请选择例题或习题。');
  return value;
}

function revalidateMathQuestion(questionId: string) {
  revalidatePath('/');
  revalidatePath('/reviews');
  revalidatePath('/questions');
  revalidatePath('/status/correct');
  revalidatePath('/status/mastered');
  revalidatePath('/status/repeated-errors');
  revalidatePath(`/questions/${questionId}`);
  revalidatePath(`/questions/${questionId}/details`);
}

function questionCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `MA-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

async function saveAttachment(file: File, questionId: string) {
  if (!file.size) return;
  await saveImageAttachment(prisma, questionId, file.name, Buffer.from(await file.arrayBuffer()));
}

async function saveAttachments(formData: FormData, questionId: string) {
  const files = [...formData.getAll('images'), ...formData.getAll('image')].filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > 10) throw new Error('单次最多上传 10 张图片。');
  if (files.reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024) throw new Error('单次图片总大小不能超过 50MB。');
  for (const file of files) await saveAttachment(file, questionId);
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
  const occurredAt = optionalDate(text(formData, 'occurredAt'));
  if (!title || !bodyMarkdown || !wrongReason || !textbookId || !chapterId || !occurredAt) {
    throw new Error('标题、题目正文、错因、教材、章节和首次做错日期为必填项。');
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
      code: questionCode(), externalId: text(formData, 'externalId') || null,
      contentFingerprint: questionFingerprint(bodyMarkdown), subjectId: subject.id, textbookId, chapterId, title,
      bodyMarkdown, wrongReason,
      reflection: text(formData, 'reflection') || null,
      reminder: text(formData, 'reminder') || null,
      sourcePage: text(formData, 'sourcePage') || null,
      sourceQuestionNumber: text(formData, 'sourceQuestionNumber') || null,
      tags: text(formData, 'tags').split(/[,，]/).map((item) => item.trim()).filter(Boolean),
      materialType: materialType(formData),
      questionType: (text(formData, 'questionType') as QuestionType) || QuestionType.CALCULATION,
      difficulty: Math.min(5, Math.max(1, Number(formData.get('difficulty')) || 3)),
      priority: Math.min(4, Math.max(1, Number(formData.get('priority')) || 2)),
      occurredAt,
      nextReviewAt: optionalDate(text(formData, 'nextReviewAt')),
      knowledgePoints: { create: knowledgePointIds.map((knowledgePointId, index) => ({ knowledgePointId, primary: index === 0 })) },
      errorTypes: { create: errorTypeIds.map((errorTypeId, index) => ({ errorTypeId, primary: index === 0 })) },
    },
  });

  await saveAttachments(formData, question.id);
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
        externalId: text(formData, 'externalId') || null,
        contentFingerprint: questionFingerprint(bodyMarkdown),
        textbookId: text(formData, 'textbookId'), chapterId: text(formData, 'chapterId'),
        reflection: text(formData, 'reflection') || null, reminder: text(formData, 'reminder') || null,
        sourcePage: text(formData, 'sourcePage') || null, sourceQuestionNumber: text(formData, 'sourceQuestionNumber') || null,
        tags: text(formData, 'tags').split(/[,，]/).map((item) => item.trim()).filter(Boolean),
        materialType: materialType(formData),
        questionType: text(formData, 'questionType') as QuestionType,
        difficulty: Math.min(5, Math.max(1, Number(formData.get('difficulty')) || 3)),
        priority: Math.min(4, Math.max(1, Number(formData.get('priority')) || 2)),
        occurredAt: optionalDate(text(formData, 'occurredAt')) || existing.occurredAt,
        nextReviewAt: optionalDate(text(formData, 'nextReviewAt')),
        knowledgePoints: { create: knowledgePointIds.map((knowledgePointId, index) => ({ knowledgePointId, primary: index === 0 })) },
        errorTypes: { create: errorTypeIds.map((errorTypeId, index) => ({ errorTypeId, primary: index === 0 })) },
      },
    });
  });
  await saveAttachments(formData, questionId);
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
  await prisma.$transaction(async (tx) => {
    const question = await tx.question.findFirst({ where: { id: questionId, subject: { slug: 'mathematics' }, status: QuestionStatus.DELETED } });
    if (!question) throw new Error('回收站中找不到这道数学错题。');
    await tx.question.update({ where: { id: questionId }, data: { status: QuestionStatus.ACTIVE, deletedAt: null } });
    await recalculateQuestionInTransaction(tx, questionId);
    await tx.auditLog.create({ data: { action: 'QUESTION_RESTORED', entity: 'Question', entityId: questionId } });
  });
  revalidatePath('/questions'); revalidatePath('/trash');
}

export async function deleteAttachmentAction(attachmentId: string) {
  await requireUser();
  const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, question: { subject: { slug: 'mathematics' } } }, select: { id: true, questionId: true, deletedAt: true } });
  if (!attachment || attachment.deletedAt) throw new Error('图片不存在或已经删除。');
  await prisma.$transaction([
    prisma.attachment.update({ where: { id: attachment.id }, data: { deletedAt: new Date() } }),
    prisma.auditLog.create({ data: { action: 'ATTACHMENT_DELETED', entity: 'Attachment', entityId: attachment.id, detail: { questionId: attachment.questionId } } }),
  ]);
  revalidateMathQuestion(attachment.questionId);
}

export async function restoreAttachmentAction(attachmentId: string) {
  await requireUser();
  const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, deletedAt: { not: null }, question: { subject: { slug: 'mathematics' }, status: { not: QuestionStatus.DELETED } } }, select: { id: true, questionId: true } });
  if (!attachment) throw new Error('图片不存在，或所属题目尚未恢复。');
  await prisma.$transaction([
    prisma.attachment.update({ where: { id: attachment.id }, data: { deletedAt: null } }),
    prisma.auditLog.create({ data: { action: 'ATTACHMENT_RESTORED', entity: 'Attachment', entityId: attachment.id, detail: { questionId: attachment.questionId } } }),
  ]);
  revalidateMathQuestion(attachment.questionId);
}

export async function recordAttemptAction(questionId: string, formData: FormData) {
  await requireUser();
  const result = text(formData, 'result') as AttemptResult;
  if (!Object.values(AttemptResult).includes(result)) throw new Error('重做结果无效。');
  const nextReviewAt = optionalDate(text(formData, 'nextReviewAt'));
  const durationMinutes = optionalBoundedNumber(formData, 'durationMinutes', 0, 1440);
  const confidence = optionalBoundedNumber(formData, 'confidence', 1, 5);
  const change = await prisma.$transaction(async (tx) => {
    const question = await tx.question.findFirst({
      where: { id: questionId, subject: { slug: 'mathematics' }, status: { in: [QuestionStatus.ACTIVE, QuestionStatus.MASTERED] } },
    });
    if (!question) throw new Error('错题不存在、已归档或已删除。');
    await tx.attempt.create({
      data: {
        questionId, result, nextReviewAt,
        attemptedAt: localDateTime(text(formData, 'attemptedAt')),
        durationSeconds: durationMinutes === null ? null : Math.round(durationMinutes * 60),
        confidence: confidence === null ? null : Math.round(confidence),
        errorReason: text(formData, 'errorReason') || null,
        note: text(formData, 'note') || null,
        source: AttemptSource.MANUAL,
      },
    });
    if (result !== AttemptResult.INDEPENDENT_CORRECT && result !== AttemptResult.SKIPPED && (question.manuallyMastered || question.masteryOverride === MasteryOverride.FORCE_MASTERED)) {
      await tx.question.update({ where: { id: questionId }, data: { manuallyMastered: false, masteryOverride: null } });
    }
    const updated = await recalculateQuestionInTransaction(tx, questionId, nextReviewAt);
    await tx.auditLog.create({ data: { action: 'ATTEMPT_CREATED', entity: 'Question', entityId: questionId, detail: { result } } });
    return { before: question.correctStreak, after: updated.correctStreak, statusChanged: question.status !== updated.status };
  });
  revalidateMathQuestion(questionId);
  redirect(`/questions/${questionId}?attempt=1&from=${change.before}&to=${change.after}${change.statusChanged ? '&statusChanged=1' : ''}`);
}

export async function recordQuickAttemptAction(questionId: string, result: AttemptResult, _formData: FormData) {
  await requireUser();
  void _formData;
  if (result !== AttemptResult.INDEPENDENT_CORRECT && result !== AttemptResult.WRONG) throw new Error('快捷重做只支持做对或做错。');
  const attemptedAt = new Date();
  const change = await prisma.$transaction(async (tx) => {
    const [question, settings] = await Promise.all([
      tx.question.findFirst({
        where: { id: questionId, subject: { slug: 'mathematics' }, status: { in: [QuestionStatus.ACTIVE, QuestionStatus.MASTERED] } },
      }),
      tx.learningSettings.upsert({ where: { id: 'learning' }, update: {}, create: {} }),
    ]);
    if (!question) throw new Error('错题不存在、已归档或已删除。');
    await tx.attempt.create({ data: { questionId, result, attemptedAt, source: AttemptSource.MANUAL } });
    if (result === AttemptResult.WRONG && (question.manuallyMastered || question.masteryOverride === MasteryOverride.FORCE_MASTERED)) {
      await tx.question.update({ where: { id: questionId }, data: { manuallyMastered: false, masteryOverride: null } });
    }
    const updated = await recalculateQuestionInTransaction(tx, questionId);
    const intervals = settings.reviewIntervals.length ? settings.reviewIntervals : [1, 3, 7, 14, 30];
    const intervalIndex = result === AttemptResult.WRONG ? 0 : Math.min(updated.correctStreak, intervals.length - 1);
    const nextReviewAt = updated.status === QuestionStatus.MASTERED
      ? null
      : new Date(attemptedAt.getTime() + intervals[intervalIndex] * 24 * 60 * 60 * 1000);
    await tx.question.update({ where: { id: questionId }, data: { nextReviewAt } });
    await tx.auditLog.create({ data: {
      action: 'QUICK_ATTEMPT_CREATED', entity: 'Question', entityId: questionId,
      detail: { result, attemptedAt: attemptedAt.toISOString(), nextReviewAt: nextReviewAt?.toISOString() ?? null },
    } });
    return { before: question.correctStreak, after: updated.correctStreak, statusChanged: question.status !== updated.status };
  });
  revalidateMathQuestion(questionId);
  redirect(`/questions/${questionId}?attempt=1&result=${result === AttemptResult.INDEPENDENT_CORRECT ? 'correct' : 'wrong'}&from=${change.before}&to=${change.after}${change.statusChanged ? '&statusChanged=1' : ''}`);
}

export async function updateAttemptAction(attemptId: string, formData: FormData) {
  await requireUser();
  const result = text(formData, 'result') as AttemptResult;
  if (!Object.values(AttemptResult).includes(result)) throw new Error('重做结果无效。');
  const nextReviewAt = optionalDate(text(formData, 'nextReviewAt'));
  const durationMinutes = optionalBoundedNumber(formData, 'durationMinutes', 0, 1440);
  const confidence = optionalBoundedNumber(formData, 'confidence', 1, 5);
  const questionId = await prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findFirst({
      where: { id: attemptId, question: { subject: { slug: 'mathematics' }, status: { not: QuestionStatus.DELETED } } },
      select: { questionId: true },
    });
    if (!attempt) throw new Error('重做记录不存在。');
    await tx.attempt.update({
      where: { id: attemptId },
      data: {
        result, nextReviewAt,
        attemptedAt: localDateTime(text(formData, 'attemptedAt')),
        durationSeconds: durationMinutes === null ? null : Math.round(durationMinutes * 60),
        confidence: confidence === null ? null : Math.round(confidence),
        errorReason: text(formData, 'errorReason') || null,
        note: text(formData, 'note') || null,
      },
    });
    await recalculateQuestionInTransaction(tx, attempt.questionId, nextReviewAt);
    await tx.auditLog.create({ data: { action: 'ATTEMPT_UPDATED', entity: 'Attempt', entityId: attemptId } });
    return attempt.questionId;
  });
  revalidateMathQuestion(questionId);
  redirect(`/questions/${questionId}?attemptUpdated=1`);
}

export async function deleteAttemptAction(attemptId: string) {
  await requireUser();
  const questionId = await prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findFirst({
      where: { id: attemptId, question: { subject: { slug: 'mathematics' }, status: { not: QuestionStatus.DELETED } } },
      select: { questionId: true },
    });
    if (!attempt) throw new Error('重做记录不存在。');
    await tx.attempt.delete({ where: { id: attemptId } });
    await recalculateQuestionInTransaction(tx, attempt.questionId);
    await tx.auditLog.create({ data: { action: 'ATTEMPT_DELETED', entity: 'Attempt', entityId: attemptId } });
    return attempt.questionId;
  });
  revalidateMathQuestion(questionId);
  redirect(`/questions/${questionId}?attemptDeleted=1`);
}

export async function setMasteryOverrideAction(questionId: string, override: MasteryOverride | 'AUTO') {
  await requireUser();
  if (override !== 'AUTO' && !Object.values(MasteryOverride).includes(override)) throw new Error('掌握状态操作无效。');
  await prisma.$transaction(async (tx) => {
    const question = await tx.question.findFirst({
      where: { id: questionId, subject: { slug: 'mathematics' }, status: { not: QuestionStatus.DELETED } },
    });
    if (!question) throw new Error('错题不存在。');
    await tx.question.update({ where: { id: questionId }, data: {
      masteryOverride: override === 'AUTO' ? null : override,
      manuallyMastered: override === MasteryOverride.FORCE_MASTERED,
      archivedAt: override === MasteryOverride.FORCE_MASTERED ? null : question.archivedAt,
      status: override === MasteryOverride.FORCE_MASTERED
        ? QuestionStatus.MASTERED
        : question.status === QuestionStatus.ARCHIVED ? QuestionStatus.ARCHIVED : QuestionStatus.ACTIVE,
      masteredAt: override === MasteryOverride.FORCE_MASTERED ? question.masteredAt || new Date() : null,
    } });
    await recalculateQuestionInTransaction(tx, questionId);
    await tx.auditLog.create({
      data: { action: override === 'AUTO' ? 'QUESTION_MASTERY_OVERRIDE_CLEARED' : 'QUESTION_MASTERY_OVERRIDDEN', entity: 'Question', entityId: questionId, detail: { override } },
    });
  });
  revalidateMathQuestion(questionId);
  redirect(`/questions/${questionId}?masteryChanged=1`);
}

export async function setQuestionArchivedAction(questionId: string, archived: boolean) {
  await requireUser();
  await prisma.$transaction(async (tx) => {
    const question = await tx.question.findFirst({
      where: { id: questionId, subject: { slug: 'mathematics' }, status: { not: QuestionStatus.DELETED } },
    });
    if (!question) throw new Error('错题不存在。');
    await tx.question.update({
      where: { id: questionId },
      data: archived ? { status: QuestionStatus.ARCHIVED, archivedAt: new Date() } : { status: QuestionStatus.ACTIVE, archivedAt: null },
    });
    if (!archived) await recalculateQuestionInTransaction(tx, questionId);
    await tx.auditLog.create({ data: { action: archived ? 'QUESTION_ARCHIVED' : 'QUESTION_UNARCHIVED', entity: 'Question', entityId: questionId } });
  });
  revalidateMathQuestion(questionId);
  redirect(`/questions/${questionId}?archiveChanged=1`);
}

async function recalculateQuestionInTransaction(tx: Prisma.TransactionClient, questionId: string, explicitNextReview?: Date | null) {
  const [question, attempts, settings] = await Promise.all([
    tx.question.findUniqueOrThrow({ where: { id: questionId } }),
    tx.attempt.findMany({ where: { questionId }, orderBy: [{ attemptedAt: 'asc' }, { createdAt: 'asc' }] }),
    tx.learningSettings.upsert({ where: { id: 'learning' }, update: {}, create: {} }),
  ]);
  const { correctStreak, independentCorrectCount, wrongCount, mastered } = calculateMastery(attempts.map((attempt) => attempt.result), settings.masteryThreshold);
  const isProtected = question.status === QuestionStatus.DELETED || question.status === QuestionStatus.ARCHIVED;
  const override = question.masteryOverride ?? (question.manuallyMastered ? MasteryOverride.FORCE_MASTERED : null);
  const isMastered = override === MasteryOverride.FORCE_MASTERED || (override !== MasteryOverride.FORCE_ACTIVE && mastered);
  return tx.question.update({
    where: { id: questionId },
    data: {
      correctStreak, independentCorrectCount, attemptCount: attempts.length, wrongCount,
      lastAttemptAt: attempts.at(-1)?.attemptedAt ?? null,
      status: isProtected ? question.status : isMastered ? QuestionStatus.MASTERED : QuestionStatus.ACTIVE,
      masteredAt: isMastered ? question.masteredAt || new Date() : null,
      nextReviewAt: explicitNextReview === undefined ? question.nextReviewAt : explicitNextReview,
    },
  });
}

export async function createTextbookAction(formData: FormData) {
  await requireUser();
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const name = text(formData, 'name'); if (!name) return;
  const created = await prisma.textbook.create({ data: { subjectId: subject.id, name, description: text(formData, 'description') || null } });
  await prisma.auditLog.create({ data: { action: 'TEXTBOOK_CREATED', entity: 'Textbook', entityId: created.id } });
  revalidatePath('/textbooks'); revalidatePath('/questions/new');
}

export async function createChapterAction(formData: FormData) {
  await requireUser();
  const name = text(formData, 'name'); const textbookId = text(formData, 'textbookId'); if (!name || !textbookId) return;
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const parentId = text(formData, 'parentId') || null;
  const [book, parent] = await Promise.all([
    prisma.textbook.findFirst({ where: { id: textbookId, subjectId: math.id } }),
    parentId ? prisma.chapter.findUnique({ where: { id: parentId } }) : null,
  ]);
  if (!book || (parent && parent.textbookId !== book.id)) throw new Error('教材或父章节无效。');
  const created = await prisma.chapter.create({ data: { name, textbookId, parentId } });
  await prisma.auditLog.create({ data: { action: 'CHAPTER_CREATED', entity: 'Chapter', entityId: created.id } });
  revalidatePath('/textbooks'); revalidatePath('/knowledge-points'); revalidatePath('/questions/new');
}

export async function createKnowledgePointAction(formData: FormData) {
  await requireUser();
  const name = text(formData, 'name'); const chapterId = text(formData, 'chapterId'); if (!name || !chapterId) return;
  const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, textbook: { subject: { slug: 'mathematics' } } } });
  if (!chapter) throw new Error('章节无效。');
  const created = await prisma.knowledgePoint.create({ data: { name, chapterId, description: text(formData, 'description') || null } });
  await prisma.auditLog.create({ data: { action: 'KNOWLEDGE_POINT_CREATED', entity: 'KnowledgePoint', entityId: created.id } });
  revalidatePath('/knowledge-points'); revalidatePath('/questions/new');
}

export async function createErrorTypeAction(formData: FormData) {
  await requireUser();
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const name = text(formData, 'name'); if (!name) return;
  const created = await prisma.errorType.create({ data: { subjectId: subject.id, name, description: text(formData, 'description') || null } });
  await prisma.auditLog.create({ data: { action: 'ERROR_TYPE_CREATED', entity: 'ErrorType', entityId: created.id } });
  revalidatePath('/error-types'); revalidatePath('/questions/new');
}

function sortOrder(formData: FormData) {
  const value = Number(text(formData, 'sortOrder') || '0');
  if (!Number.isInteger(value) || value < -10_000 || value > 10_000) throw new Error('排序值必须是 -10000 到 10000 之间的整数。');
  return value;
}

export async function updateTextbookAction(textbookId: string, formData: FormData) {
  await requireUser();
  const name = text(formData, 'name'); if (!name) throw new Error('教材名称不能为空。');
  const book = await prisma.textbook.findFirst({ where: { id: textbookId, subject: { slug: 'mathematics' } } });
  if (!book) throw new Error('教材不存在。');
  await prisma.textbook.update({ where: { id: book.id }, data: { name, description: text(formData, 'description') || null, sortOrder: sortOrder(formData), active: formData.get('active') === 'on' } });
  await prisma.auditLog.create({ data: { action: 'TEXTBOOK_UPDATED', entity: 'Textbook', entityId: book.id } });
  revalidatePath('/textbooks'); revalidatePath('/questions'); revalidatePath('/questions/new');
}

export async function updateChapterAction(chapterId: string, formData: FormData) {
  await requireUser();
  const name = text(formData, 'name'); if (!name) throw new Error('章节名称不能为空。');
  const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, textbook: { subject: { slug: 'mathematics' } } } });
  if (!chapter) throw new Error('章节不存在。');
  const parentId = text(formData, 'parentId') || null;
  if (parentId === chapter.id) throw new Error('章节不能以自己为父章节。');
  if (parentId) {
    const all = await prisma.chapter.findMany({ where: { textbookId: chapter.textbookId }, select: { id: true, parentId: true } });
    const byId = new Map(all.map((item) => [item.id, item]));
    if (!byId.has(parentId)) throw new Error('父章节必须属于同一本教材。');
    let cursor: string | null = parentId;
    while (cursor) { if (cursor === chapter.id) throw new Error('不能形成循环章节树。'); cursor = byId.get(cursor)?.parentId ?? null; }
  }
  await prisma.chapter.update({ where: { id: chapter.id }, data: { name, parentId, sortOrder: sortOrder(formData), active: formData.get('active') === 'on' } });
  await prisma.auditLog.create({ data: { action: 'CHAPTER_UPDATED', entity: 'Chapter', entityId: chapter.id } });
  revalidatePath('/textbooks'); revalidatePath('/knowledge-points'); revalidatePath('/questions'); revalidatePath('/questions/new');
}

export async function mergeChapterAction(sourceId: string, formData: FormData) {
  await requireUser(); const targetId = text(formData, 'targetId');
  if (!targetId || targetId === sourceId) throw new Error('请选择同一本教材中的不同目标章节。');
  await prisma.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.chapter.findFirst({ where: { id: sourceId, textbook: { subject: { slug: 'mathematics' } } }, include: { children: true, knowledgePoints: true } }),
      tx.chapter.findFirst({ where: { id: targetId, textbook: { subject: { slug: 'mathematics' } } }, include: { children: true, knowledgePoints: true } }),
    ]);
    if (!source || !target || source.textbookId !== target.textbookId) throw new Error('来源和目标章节必须属于同一本数学教材。');
    const all = await tx.chapter.findMany({ where: { textbookId: source.textbookId }, select: { id: true, parentId: true } });
    const byId = new Map(all.map((item) => [item.id, item])); let cursor: string | null = target.id;
    while (cursor) { if (cursor === source.id) throw new Error('不能把章节合并到自己的子章节。'); cursor = byId.get(cursor)?.parentId ?? null; }
    const targetChildNames = new Set(target.children.map((item) => item.name));
    const duplicateChild = source.children.find((item) => targetChildNames.has(item.name));
    if (duplicateChild) throw new Error(`目标章节下已存在同名子章节：${duplicateChild.name}，请先改名或单独合并。`);

    const targetPoints = new Map(target.knowledgePoints.map((item) => [item.name, item]));
    for (const point of source.knowledgePoints) {
      const sameName = targetPoints.get(point.name);
      if (!sameName) { await tx.knowledgePoint.update({ where: { id: point.id }, data: { chapterId: target.id } }); continue; }
      const links = await tx.questionKnowledgePoint.findMany({ where: { knowledgePointId: point.id } });
      for (const link of links) {
        const existing = await tx.questionKnowledgePoint.findUnique({ where: { questionId_knowledgePointId: { questionId: link.questionId, knowledgePointId: sameName.id } } });
        if (existing) { if (link.primary && !existing.primary) await tx.questionKnowledgePoint.update({ where: { questionId_knowledgePointId: { questionId: link.questionId, knowledgePointId: sameName.id } }, data: { primary: true } }); }
        else await tx.questionKnowledgePoint.create({ data: { questionId: link.questionId, knowledgePointId: sameName.id, primary: link.primary } });
      }
      await tx.questionKnowledgePoint.deleteMany({ where: { knowledgePointId: point.id } });
      await tx.knowledgePoint.update({ where: { id: point.id }, data: { active: false } });
    }
    await tx.question.updateMany({ where: { chapterId: source.id }, data: { chapterId: target.id } });
    await tx.chapter.updateMany({ where: { parentId: source.id }, data: { parentId: target.id } });
    await tx.chapter.update({ where: { id: source.id }, data: { active: false } });
    await tx.auditLog.create({ data: { action: 'CHAPTER_MERGED', entity: 'Chapter', entityId: source.id, detail: { targetId: target.id } } });
  }, { maxWait: 10_000, timeout: 60_000 });
  revalidatePath('/textbooks'); revalidatePath('/knowledge-points'); revalidatePath('/questions'); revalidatePath('/questions/new');
}

export async function updateKnowledgePointAction(pointId: string, formData: FormData) {
  await requireUser();
  const name = text(formData, 'name'); if (!name) throw new Error('知识点名称不能为空。');
  const point = await prisma.knowledgePoint.findFirst({ where: { id: pointId, chapter: { textbook: { subject: { slug: 'mathematics' } } } } });
  if (!point) throw new Error('知识点不存在。');
  await prisma.knowledgePoint.update({ where: { id: point.id }, data: { name, description: text(formData, 'description') || null, active: formData.get('active') === 'on' } });
  await prisma.auditLog.create({ data: { action: 'KNOWLEDGE_POINT_UPDATED', entity: 'KnowledgePoint', entityId: point.id } });
  revalidatePath('/knowledge-points'); revalidatePath('/questions'); revalidatePath('/questions/new');
}

export async function mergeKnowledgePointAction(sourceId: string, formData: FormData) {
  await requireUser(); const targetId = text(formData, 'targetId');
  if (!targetId || targetId === sourceId) throw new Error('请选择不同的目标知识点。');
  await prisma.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.knowledgePoint.findFirst({ where: { id: sourceId, chapter: { textbook: { subject: { slug: 'mathematics' } } } } }),
      tx.knowledgePoint.findFirst({ where: { id: targetId, chapter: { textbook: { subject: { slug: 'mathematics' } } } } }),
    ]);
    if (!source || !target) throw new Error('来源或目标知识点不存在。');
    const links = await tx.questionKnowledgePoint.findMany({ where: { knowledgePointId: source.id } });
    for (const link of links) {
      const existing = await tx.questionKnowledgePoint.findUnique({ where: { questionId_knowledgePointId: { questionId: link.questionId, knowledgePointId: target.id } } });
      if (existing) { if (link.primary && !existing.primary) await tx.questionKnowledgePoint.update({ where: { questionId_knowledgePointId: { questionId: link.questionId, knowledgePointId: target.id } }, data: { primary: true } }); }
      else await tx.questionKnowledgePoint.create({ data: { questionId: link.questionId, knowledgePointId: target.id, primary: link.primary } });
    }
    await tx.questionKnowledgePoint.deleteMany({ where: { knowledgePointId: source.id } });
    await tx.knowledgePoint.update({ where: { id: source.id }, data: { active: false } });
    await tx.auditLog.create({ data: { action: 'KNOWLEDGE_POINT_MERGED', entity: 'KnowledgePoint', entityId: source.id, detail: { targetId: target.id, movedQuestions: links.length } } });
  });
  revalidatePath('/knowledge-points'); revalidatePath('/questions'); revalidatePath('/questions/new');
}

export async function updateErrorTypeAction(errorTypeId: string, formData: FormData) {
  await requireUser();
  const name = text(formData, 'name'); if (!name) throw new Error('错误类型名称不能为空。');
  const item = await prisma.errorType.findFirst({ where: { id: errorTypeId, subject: { slug: 'mathematics' } } });
  if (!item) throw new Error('错误类型不存在。');
  await prisma.errorType.update({ where: { id: item.id }, data: { name, description: text(formData, 'description') || null, active: formData.get('active') === 'on' } });
  await prisma.auditLog.create({ data: { action: 'ERROR_TYPE_UPDATED', entity: 'ErrorType', entityId: item.id } });
  revalidatePath('/error-types'); revalidatePath('/questions'); revalidatePath('/questions/new');
}

export async function mergeErrorTypeAction(sourceId: string, formData: FormData) {
  await requireUser(); const targetId = text(formData, 'targetId');
  if (!targetId || targetId === sourceId) throw new Error('请选择不同的目标错误类型。');
  await prisma.$transaction(async (tx) => {
    const math = await tx.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
    const [source, target] = await Promise.all([tx.errorType.findFirst({ where: { id: sourceId, subjectId: math.id } }), tx.errorType.findFirst({ where: { id: targetId, subjectId: math.id } })]);
    if (!source || !target) throw new Error('来源或目标错误类型不存在。');
    const links = await tx.questionErrorType.findMany({ where: { errorTypeId: source.id } });
    for (const link of links) {
      const existing = await tx.questionErrorType.findUnique({ where: { questionId_errorTypeId: { questionId: link.questionId, errorTypeId: target.id } } });
      if (existing) { if (link.primary && !existing.primary) await tx.questionErrorType.update({ where: { questionId_errorTypeId: { questionId: link.questionId, errorTypeId: target.id } }, data: { primary: true } }); }
      else await tx.questionErrorType.create({ data: { questionId: link.questionId, errorTypeId: target.id, primary: link.primary } });
    }
    await tx.questionErrorType.deleteMany({ where: { errorTypeId: source.id } });
    await tx.errorType.update({ where: { id: source.id }, data: { active: false } });
    await tx.auditLog.create({ data: { action: 'ERROR_TYPE_MERGED', entity: 'ErrorType', entityId: source.id, detail: { targetId: target.id, movedQuestions: links.length } } });
  });
  revalidatePath('/error-types'); revalidatePath('/questions'); revalidatePath('/questions/new');
}
