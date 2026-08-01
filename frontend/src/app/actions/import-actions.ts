'use server';

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ImportConflictStrategy, ImportJobStatus, ImportSourceType, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { persistPreparedImage, prepareImage, removeStoredAttachment, type PreparedImage } from '@/lib/attachments';
import { parseMarkdownBatch, type ImportParseError, type ParsedImportQuestion } from '@/lib/imports/markdown';
import { inspectImportZip, resolveZipImagePath, type InspectedImportZip } from '@/lib/imports/zip';
import { prisma } from '@/lib/prisma';

type PreviewRow = {
  key: string;
  sourceName: string;
  documentIndex: number;
  title: string;
  book: string;
  chapter: string;
  valid: boolean;
  issues: string[];
  conflict: null | { questionId: string; code: string; title: string; reason: string };
};

type StoredPreview = { items: ParsedImportQuestion[]; rows: PreviewRow[]; parseErrors: ImportParseError[] };

export type ImportPreviewState = {
  error?: string;
  jobId?: string;
  rows?: PreviewRow[];
  sourceType?: ImportSourceType;
};

type TaxonomyResolution = {
  textbookId: string | null;
  chapterId: string | null;
  knowledgePointIds: string[];
  errorTypeIds: string[];
  issues: string[];
};

function questionCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `MA-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function resolveTaxonomy(client: Prisma.TransactionClient | typeof prisma, subjectId: string, item: ParsedImportQuestion): Promise<TaxonomyResolution> {
  const issues: string[] = [];
  const textbook = await client.textbook.findFirst({ where: { subjectId, name: item.book, active: true } });
  if (!textbook) return { textbookId: null, chapterId: null, knowledgePointIds: [], errorTypeIds: [], issues: [`找不到启用的教材：${item.book}`] };

  let parentId: string | null = null;
  let chapterId: string | null = null;
  for (const segment of item.chapterPath) {
    const chapter: { id: string } | null = await client.chapter.findFirst({ where: { textbookId: textbook.id, parentId, name: segment, active: true }, select: { id: true } });
    if (!chapter) {
      issues.push(`章节路径不存在：${item.book} / ${item.chapterPath.join(' / ')}`);
      chapterId = null;
      break;
    }
    chapterId = chapter.id;
    parentId = chapter.id;
  }

  if (!chapterId) return { textbookId: textbook.id, chapterId: null, knowledgePointIds: [], errorTypeIds: [], issues };
  const [points, errors] = await Promise.all([
    item.knowledgePoints.length ? client.knowledgePoint.findMany({ where: { chapterId, name: { in: item.knowledgePoints }, active: true } }) : [],
    client.errorType.findMany({ where: { subjectId, name: { in: item.errorTypes }, active: true } }),
  ]);
  const pointByName = new Map(points.map((point) => [point.name, point.id]));
  const errorByName = new Map(errors.map((error) => [error.name, error.id]));
  const missingPoints = item.knowledgePoints.filter((name) => !pointByName.has(name));
  const missingErrors = item.errorTypes.filter((name) => !errorByName.has(name));
  if (missingPoints.length) issues.push(`未知知识点：${missingPoints.join('、')}`);
  if (missingErrors.length) issues.push(`未知错误类型：${missingErrors.join('、')}`);
  return {
    textbookId: textbook.id,
    chapterId,
    knowledgePointIds: item.knowledgePoints.map((name) => pointByName.get(name)).filter((id): id is string => Boolean(id)),
    errorTypeIds: item.errorTypes.map((name) => errorByName.get(name)).filter((id): id is string => Boolean(id)),
    issues,
  };
}

async function findConflict(client: Prisma.TransactionClient | typeof prisma, subjectId: string, item: ParsedImportQuestion, taxonomy: TaxonomyResolution) {
  const select = { id: true, code: true, title: true } as const;
  if (item.externalId) {
    const match = await client.question.findUnique({ where: { subjectId_externalId: { subjectId, externalId: item.externalId } }, select });
    if (match) return { questionId: match.id, code: match.code, title: match.title, reason: `external_id：${item.externalId}` };
  }
  if (taxonomy.textbookId && taxonomy.chapterId && item.sourceQuestionNumber) {
    const match = await client.question.findFirst({
      where: { subjectId, textbookId: taxonomy.textbookId, chapterId: taxonomy.chapterId, sourceQuestionNumber: item.sourceQuestionNumber }, select,
    });
    if (match) return { questionId: match.id, code: match.code, title: match.title, reason: `教材、章节和题号：${item.sourceQuestionNumber}` };
  }
  const match = await client.question.findFirst({ where: { subjectId, contentFingerprint: item.contentFingerprint }, select });
  return match ? { questionId: match.id, code: match.code, title: match.title, reason: '题干内容指纹相同' } : null;
}

type ImportInput = {
  sourceType: ImportSourceType;
  originalName: string;
  sources: Array<{ name: string; raw: string }>;
  archiveBuffer: Buffer | null;
  zip: InspectedImportZip | null;
};

async function readImportInputs(formData: FormData): Promise<ImportInput> {
  const files = formData.getAll('files').filter((value): value is File => value instanceof File && value.size > 0);
  const pasted = String(formData.get('markdown') || '').trim();
  if (!files.length && !pasted) throw new Error('请粘贴 Markdown，或选择至少一个 .md 文件。');
  if (files.length > 100) throw new Error('一次最多选择 100 个 Markdown 文件。');
  const totalSize = files.reduce((sum, file) => sum + file.size, 0) + Buffer.byteLength(pasted);
  if (totalSize > 15 * 1024 * 1024) throw new Error('本次导入内容总大小不能超过 15MB。');

  const zipFiles = files.filter((file) => file.name.toLocaleLowerCase().endsWith('.zip'));
  if (zipFiles.length) {
    if (zipFiles.length !== 1 || files.length !== 1 || pasted) throw new Error('ZIP 包必须单独上传，不能同时粘贴内容或选择其他文件。');
    const archiveBuffer = Buffer.from(await zipFiles[0].arrayBuffer());
    const zip = inspectImportZip(archiveBuffer);
    return { sourceType: ImportSourceType.ZIP, originalName: zipFiles[0].name.slice(0, 255), sources: zip.markdownSources, archiveBuffer, zip };
  }

  const sources: Array<{ name: string; raw: string }> = [];
  if (pasted) sources.push({ name: '粘贴内容', raw: pasted });
  for (const file of files) {
    if (!file.name.toLocaleLowerCase().endsWith('.md')) throw new Error(`仅支持 .md 文件：${file.name}`);
    sources.push({ name: file.name.slice(0, 255), raw: await file.text() });
  }
  return {
    sourceType: ImportSourceType.MARKDOWN,
    originalName: sources.length === 1 ? sources[0].name : `${sources.length} 个 Markdown 来源`,
    sources, archiveBuffer: null, zip: null,
  };
}

async function savePendingArchive(buffer: Buffer) {
  const importRoot = process.env.IMPORT_ROOT;
  if (!importRoot) throw new Error('IMPORT_ROOT 尚未配置，不能保存 ZIP 原文件。');
  const directory = path.join(/* turbopackIgnore: true */ importRoot, 'pending');
  await mkdir(directory, { recursive: true });
  const storedFileName = `pending/${randomBytes(24).toString('hex')}.zip`;
  await writeFile(path.join(directory, path.basename(storedFileName)), buffer, { flag: 'wx' });
  return storedFileName;
}

async function removeStoredImport(storedFileName: string | null) {
  const importRoot = process.env.IMPORT_ROOT;
  if (!storedFileName || !importRoot || !/^pending\/[a-f0-9]{48}\.zip$/.test(storedFileName)) return;
  await unlink(path.join(/* turbopackIgnore: true */ importRoot, storedFileName)).catch(() => undefined);
}

async function readStoredZip(storedFileName: string | null) {
  const importRoot = process.env.IMPORT_ROOT;
  if (!importRoot || !storedFileName || !/^pending\/[a-f0-9]{48}\.zip$/.test(storedFileName)) {
    throw new Error('ZIP 原文件路径无效或文件已丢失。');
  }
  return inspectImportZip(await readFile(path.join(/* turbopackIgnore: true */ importRoot, storedFileName)));
}

export async function previewMarkdownImportAction(_previous: ImportPreviewState, formData: FormData): Promise<ImportPreviewState> {
  await requireUser();
  let storedFileName: string | null = null;
  try {
    const input = await readImportInputs(formData);
    const items: ParsedImportQuestion[] = [];
    const parseErrors: ImportParseError[] = [];
    let documentCount = 0;
    for (const source of input.sources) {
      const parsed = parseMarkdownBatch(source.raw, source.name);
      items.push(...parsed.items);
      parseErrors.push(...parsed.errors);
      documentCount += parsed.documentCount;
    }
    if (documentCount > 1000) throw new Error('单次导入不能超过 1000 道题。');

    const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
    const rows: PreviewRow[] = [];
    for (const item of items) {
      const taxonomy = await resolveTaxonomy(prisma, subject.id, item);
      const conflict = await findConflict(prisma, subject.id, item, taxonomy);
      const issues = [...taxonomy.issues];
      if (item.imageFiles.length && !input.zip) issues.push('image_files 只能通过包含 images/ 目录的 ZIP 包导入');
      if (input.zip) {
        for (const imageFile of item.imageFiles) {
          try {
            const imagePath = resolveZipImagePath(item.sourceName, imageFile);
            const bytes = input.zip.images.get(imagePath);
            if (!bytes) issues.push(`ZIP 中找不到图片：${imagePath}`);
            else await prepareImage(Buffer.from(bytes));
          } catch (error) {
            issues.push(error instanceof Error ? error.message : `图片无效：${imageFile}`);
          }
        }
      }
      rows.push({
        key: `${item.sourceName}:${item.documentIndex}`,
        sourceName: item.sourceName,
        documentIndex: item.documentIndex,
        title: item.title,
        book: item.book,
        chapter: item.chapterPath.join(' / '),
        valid: issues.length === 0,
        issues,
        conflict,
      });
    }
    for (const error of parseErrors) {
      rows.push({
        key: `${error.sourceName}:${error.documentIndex}:error`, sourceName: error.sourceName, documentIndex: error.documentIndex,
        title: '解析失败', book: '—', chapter: '—', valid: false, issues: [error.message], conflict: null,
      });
    }
    const stored: StoredPreview = { items, rows, parseErrors };
    if (input.archiveBuffer) storedFileName = await savePendingArchive(input.archiveBuffer);
    const job = await prisma.importJob.create({
      data: {
        sourceType: input.sourceType,
        originalName: input.originalName,
        storedFileName,
        totalCount: documentCount,
        failedCount: rows.filter((row) => !row.valid).length,
        preview: json(stored),
        errorDetail: parseErrors.length ? json(parseErrors) : undefined,
      },
    });
    await prisma.auditLog.create({ data: { action: 'IMPORT_PREVIEW_CREATED', entity: 'ImportJob', entityId: job.id, detail: { total: documentCount, invalid: rows.filter((row) => !row.valid).length } } });
    revalidatePath('/imports');
    return { jobId: job.id, rows, sourceType: input.sourceType };
  } catch (error) {
    await removeStoredImport(storedFileName);
    return { error: error instanceof Error ? error.message : '无法生成导入预览。' };
  }
}

function storedPreview(value: Prisma.JsonValue): StoredPreview {
  return value as unknown as StoredPreview;
}

function questionUpdateData(item: ParsedImportQuestion, taxonomy: TaxonomyResolution, externalId: string | null) {
  if (!taxonomy.textbookId || !taxonomy.chapterId) throw new Error('教材或章节解析结果已失效。');
  return {
    externalId, contentFingerprint: item.contentFingerprint,
    textbookId: taxonomy.textbookId, chapterId: taxonomy.chapterId,
    title: item.title, bodyMarkdown: item.bodyMarkdown, wrongReason: item.wrongReason,
    reflection: item.reflection, reminder: item.reminder,
    sourcePage: item.sourcePage, sourceQuestionNumber: item.sourceQuestionNumber,
    tags: item.tags, questionType: item.questionType, difficulty: item.difficulty, priority: item.priority,
    occurredAt: new Date(item.occurredAt), nextReviewAt: item.nextReviewAt ? new Date(item.nextReviewAt) : null,
    knowledgePoints: { create: taxonomy.knowledgePointIds.map((knowledgePointId, index) => ({ knowledgePointId, primary: index === 0 })) },
    errorTypes: { create: taxonomy.errorTypeIds.map((errorTypeId, index) => ({ errorTypeId, primary: index === 0 })) },
  };
}

function questionData(subjectId: string, importJobId: string, item: ParsedImportQuestion, taxonomy: TaxonomyResolution, externalId: string | null) {
  return { code: questionCode(), subjectId, importJobId, ...questionUpdateData(item, taxonomy, externalId) };
}

export async function confirmImportJobAction(jobId: string, formData: FormData) {
  await requireUser();
  const strategy = String(formData.get('strategy') || '') as ImportConflictStrategy;
  if (!Object.values(ImportConflictStrategy).includes(strategy)) throw new Error('请选择有效的重复处理策略。');

  const preflightJob = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!preflightJob || preflightJob.status !== ImportJobStatus.PREVIEWED) throw new Error('导入作业不存在或已经处理。');
  const preflightPreview = storedPreview(preflightJob.preview);
  const preparedImages = new Map<string, PreparedImage>();
  if (preflightJob.sourceType === ImportSourceType.ZIP) {
    const zip = await readStoredZip(preflightJob.storedFileName);
    for (const item of preflightPreview.items) {
      for (const reference of item.imageFiles) {
        const imagePath = resolveZipImagePath(item.sourceName, reference);
        if (preparedImages.has(imagePath)) continue;
        const bytes = zip.images.get(imagePath);
        if (!bytes) throw new Error(`ZIP 中找不到图片：${imagePath}`);
        preparedImages.set(imagePath, await prepareImage(Buffer.from(bytes)));
      }
    }
  }

  const writtenStorageNames: string[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      const job = await tx.importJob.findUnique({ where: { id: jobId } });
      if (!job || job.status !== ImportJobStatus.PREVIEWED) throw new Error('导入作业不存在或已经处理。');
      const preview = storedPreview(job.preview);
      if (job.updatedAt.getTime() !== preflightJob.updatedAt.getTime()) throw new Error('导入预览已经变化，请重新生成预览。');
    if (preview.parseErrors.length || preview.rows.some((row) => !row.valid)) throw new Error('预览仍有错误，修正后请重新生成预览。');
    const subject = await tx.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
    const createdQuestionIds: string[] = [];
    const updatedQuestions: Array<Record<string, unknown>> = [];
    let skippedCount = 0;

    for (const item of preview.items) {
      const taxonomy = await resolveTaxonomy(tx, subject.id, item);
      if (taxonomy.issues.length) throw new Error(`${item.title}：${taxonomy.issues.join('；')}`);
      const conflict = await findConflict(tx, subject.id, item, taxonomy);
      if (conflict && strategy === ImportConflictStrategy.SKIP) {
        skippedCount += 1;
        continue;
      }
      if (conflict && strategy === ImportConflictStrategy.UPDATE_BASIC) {
        const existing = await tx.question.findUniqueOrThrow({
          where: { id: conflict.questionId },
          include: { knowledgePoints: true, errorTypes: true },
        });
        updatedQuestions.push({
          id: existing.id,
          data: {
            externalId: existing.externalId, contentFingerprint: existing.contentFingerprint,
            textbookId: existing.textbookId, chapterId: existing.chapterId, title: existing.title,
            bodyMarkdown: existing.bodyMarkdown, wrongReason: existing.wrongReason, reflection: existing.reflection,
            reminder: existing.reminder, sourcePage: existing.sourcePage, sourceQuestionNumber: existing.sourceQuestionNumber,
            tags: existing.tags, questionType: existing.questionType, difficulty: existing.difficulty, priority: existing.priority,
            occurredAt: existing.occurredAt.toISOString(), nextReviewAt: existing.nextReviewAt?.toISOString() ?? null,
          },
          knowledgePointIds: existing.knowledgePoints.map((point) => point.knowledgePointId),
          errorTypeIds: existing.errorTypes.map((error) => error.errorTypeId),
        });
        await tx.questionKnowledgePoint.deleteMany({ where: { questionId: existing.id } });
        await tx.questionErrorType.deleteMany({ where: { questionId: existing.id } });
        await tx.question.update({ where: { id: existing.id }, data: questionUpdateData(item, taxonomy, item.externalId) });
        continue;
      }

      const created = await tx.question.create({
        data: questionData(subject.id, job.id, item, taxonomy, conflict ? null : item.externalId),
        select: { id: true },
      });
      createdQuestionIds.push(created.id);
      for (const reference of item.imageFiles) {
        const imagePath = resolveZipImagePath(item.sourceName, reference);
        const image = preparedImages.get(imagePath);
        if (!image) throw new Error(`图片尚未通过安全检查：${imagePath}`);
        const attachment = await persistPreparedImage(tx, created.id, path.basename(imagePath), image);
        writtenStorageNames.push(attachment.storageName);
      }
    }

    await tx.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.COMPLETED, conflictStrategy: strategy,
        successCount: createdQuestionIds.length + updatedQuestions.length,
        skippedCount, failedCount: 0, completedAt: new Date(),
        rollbackData: json({ createdQuestionIds, updatedQuestions }),
      },
    });
    await tx.auditLog.create({ data: { action: 'IMPORT_COMPLETED', entity: 'ImportJob', entityId: job.id, detail: { created: createdQuestionIds.length, updated: updatedQuestions.length, skipped: skippedCount, strategy } } });
    }, { maxWait: 10_000, timeout: 60_000 });
  } catch (error) {
    await Promise.all(writtenStorageNames.map((storageName) => removeStoredAttachment(storageName)));
    throw error;
  }

  revalidatePath('/');
  revalidatePath('/questions');
  revalidatePath('/imports');
  redirect(`/imports?completed=${jobId}`);
}

type RollbackQuestion = {
  id: string;
  data: {
    externalId: string | null; contentFingerprint: string | null; textbookId: string; chapterId: string; title: string;
    bodyMarkdown: string; wrongReason: string; reflection: string | null; reminder: string | null; sourcePage: string | null;
    sourceQuestionNumber: string | null; tags: string[]; questionType: ParsedImportQuestion['questionType']; difficulty: number;
    priority: number; occurredAt: string; nextReviewAt: string | null;
  };
  knowledgePointIds: string[];
  errorTypeIds: string[];
};

export async function rollbackImportJobAction(jobId: string) {
  await requireUser();
  const removedStorageNames: string[] = [];
  await prisma.$transaction(async (tx) => {
    const job = await tx.importJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== ImportJobStatus.COMPLETED || !job.rollbackData) throw new Error('该导入作业不能回滚。');
    const rollback = job.rollbackData as unknown as { createdQuestionIds: string[]; updatedQuestions: RollbackQuestion[] };
    const attachments = await tx.attachment.findMany({
      where: { questionId: { in: rollback.createdQuestionIds } },
      select: { storageName: true },
    });
    removedStorageNames.push(...attachments.map((attachment) => attachment.storageName));
    await tx.question.deleteMany({ where: { id: { in: rollback.createdQuestionIds }, importJobId: job.id } });
    for (const snapshot of rollback.updatedQuestions) {
      await tx.questionKnowledgePoint.deleteMany({ where: { questionId: snapshot.id } });
      await tx.questionErrorType.deleteMany({ where: { questionId: snapshot.id } });
      await tx.question.update({
        where: { id: snapshot.id },
        data: {
          ...snapshot.data,
          occurredAt: new Date(snapshot.data.occurredAt),
          nextReviewAt: snapshot.data.nextReviewAt ? new Date(snapshot.data.nextReviewAt) : null,
          knowledgePoints: { create: snapshot.knowledgePointIds.map((knowledgePointId, index) => ({ knowledgePointId, primary: index === 0 })) },
          errorTypes: { create: snapshot.errorTypeIds.map((errorTypeId, index) => ({ errorTypeId, primary: index === 0 })) },
        },
      });
    }
    await tx.importJob.update({ where: { id: job.id }, data: { status: ImportJobStatus.ROLLED_BACK, rolledBackAt: new Date() } });
    await tx.auditLog.create({ data: { action: 'IMPORT_ROLLED_BACK', entity: 'ImportJob', entityId: job.id, detail: { removed: rollback.createdQuestionIds.length, restored: rollback.updatedQuestions.length } } });
  }, { maxWait: 10_000, timeout: 60_000 });
  await Promise.all(removedStorageNames.map((storageName) => removeStoredAttachment(storageName)));
  revalidatePath('/');
  revalidatePath('/questions');
  revalidatePath('/imports');
  redirect(`/imports?rolledBack=${jobId}`);
}
