'use server';

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ImportConflictStrategy, ImportJobStatus, ImportSourceType, MasteryOverride, Prisma, QuestionStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { persistPreparedImage, prepareImage, removeStoredAttachment, type PreparedImage } from '@/lib/attachments';
import { parseFullJsonExport, type FullJsonExport } from '@/lib/imports/full-json';
import { parseMarkdownBatch, questionFingerprint, type ImportParseError, type ParsedImportQuestion } from '@/lib/imports/markdown';
import { inspectImportZip, resolveZipImagePath, type InspectedImportZip } from '@/lib/imports/zip';
import { calculateMastery } from '@/lib/mastery';
import { prisma } from '@/lib/prisma';
import { questionReference } from '@/lib/question-reference';

export type PreviewRow = {
  key: string;
  sourceName: string;
  documentIndex: number;
  title: string;
  book: string;
  chapter: string;
  materialType?: 'EXAMPLE' | 'EXERCISE';
  reference?: string;
  pageLabel?: string | null;
  valid: boolean;
  issues: string[];
  taxonomyChanges?: string[];
  conflict: null | { questionId: string; code: string; title: string; reason: string };
};

type StoredPreview = { items: ParsedImportQuestion[]; rows: PreviewRow[]; parseErrors: ImportParseError[]; autoCreateTaxonomy?: boolean };

export type ImportPreviewState = {
  error?: string;
  jobId?: string;
  rows?: PreviewRow[];
  sourceType?: ImportSourceType;
};

export type JsonImportPreviewState = ImportPreviewState & { notice?: string };

type TaxonomyResolution = {
  textbookId: string | null;
  chapterId: string | null;
  knowledgePointIds: string[];
  errorTypeIds: string[];
  issues: string[];
  creations: string[];
};

type CreatedTaxonomy = {
  subjectIds: string[];
  textbookIds: string[];
  chapterIds: string[];
  knowledgePointIds: string[];
  errorTypeIds: string[];
};

function emptyCreatedTaxonomy(): CreatedTaxonomy {
  return { subjectIds: [], textbookIds: [], chapterIds: [], knowledgePointIds: [], errorTypeIds: [] };
}

function questionCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `MA-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function resolveTaxonomy(client: Prisma.TransactionClient | typeof prisma, subjectId: string, item: ParsedImportQuestion, autoCreate = false): Promise<TaxonomyResolution> {
  const issues: string[] = [];
  const creations: string[] = [];
  const databaseErrors = await client.errorType.findMany({ where: { subjectId, name: { in: item.errorTypes } }, select: { id: true, name: true, active: true } });
  const errorByName = new Map(databaseErrors.filter((error) => error.active).map((error) => [error.name, error.id]));
  const inactiveErrorNames = new Set(databaseErrors.filter((error) => !error.active).map((error) => error.name));
  for (const name of item.errorTypes) {
    if (errorByName.has(name)) continue;
    if (inactiveErrorNames.has(name)) issues.push(`错误类型已停用：${name}`);
    else if (autoCreate) creations.push(`错误类型：${name}`);
    else issues.push(`未知错误类型：${name}`);
  }

  const textbook = await client.textbook.findFirst({ where: { subjectId, name: item.book } });
  if (!textbook) {
    if (!autoCreate) issues.unshift(`找不到启用的教材：${item.book}`);
    else {
      creations.unshift(`教材：${item.book}`);
      item.chapterPath.forEach((_, index) => creations.push(`章节：${item.book} / ${item.chapterPath.slice(0, index + 1).join(' / ')}`));
      item.knowledgePoints.forEach((name) => creations.push(`知识点：${name}`));
    }
    return {
      textbookId: null,
      chapterId: null,
      knowledgePointIds: [],
      errorTypeIds: item.errorTypes.map((name) => errorByName.get(name)).filter((id): id is string => Boolean(id)),
      issues,
      creations,
    };
  }
  if (!textbook.active) {
    issues.unshift(`教材已停用：${item.book}`);
    return { textbookId: null, chapterId: null, knowledgePointIds: [], errorTypeIds: [], issues, creations };
  }

  let parentId: string | null = null;
  let chapterId: string | null = null;
  for (const [index, segment] of item.chapterPath.entries()) {
    const chapter: { id: string; active: boolean } | null = await client.chapter.findFirst({ where: { textbookId: textbook.id, parentId, name: segment }, select: { id: true, active: true } });
    if (!chapter) {
      if (!autoCreate) issues.push(`章节路径不存在：${item.book} / ${item.chapterPath.join(' / ')}`);
      else {
        for (let missingIndex = index; missingIndex < item.chapterPath.length; missingIndex += 1) {
          creations.push(`章节：${item.book} / ${item.chapterPath.slice(0, missingIndex + 1).join(' / ')}`);
        }
        item.knowledgePoints.forEach((name) => creations.push(`知识点：${name}`));
      }
      chapterId = null;
      break;
    }
    if (!chapter.active) {
      issues.push(`章节已停用：${item.book} / ${item.chapterPath.slice(0, index + 1).join(' / ')}`);
      chapterId = null;
      break;
    }
    chapterId = chapter.id;
    parentId = chapter.id;
  }

  if (!chapterId) return {
    textbookId: textbook.id,
    chapterId: null,
    knowledgePointIds: [],
    errorTypeIds: item.errorTypes.map((name) => errorByName.get(name)).filter((id): id is string => Boolean(id)),
    issues,
    creations,
  };
  const points = item.knowledgePoints.length
    ? await client.knowledgePoint.findMany({ where: { chapterId, name: { in: item.knowledgePoints } }, select: { id: true, name: true, active: true } })
    : [];
  const pointByName = new Map(points.filter((point) => point.active).map((point) => [point.name, point.id]));
  const inactivePointNames = new Set(points.filter((point) => !point.active).map((point) => point.name));
  for (const name of item.knowledgePoints) {
    if (pointByName.has(name)) continue;
    if (inactivePointNames.has(name)) issues.push(`知识点已停用：${name}`);
    else if (autoCreate) creations.push(`知识点：${name}`);
    else issues.push(`未知知识点：${name}`);
  }
  return {
    textbookId: textbook.id,
    chapterId,
    knowledgePointIds: item.knowledgePoints.map((name) => pointByName.get(name)).filter((id): id is string => Boolean(id)),
    errorTypeIds: item.errorTypes.map((name) => errorByName.get(name)).filter((id): id is string => Boolean(id)),
    issues,
    creations,
  };
}

async function materializeTaxonomy(tx: Prisma.TransactionClient, subjectId: string, item: ParsedImportQuestion, created: CreatedTaxonomy): Promise<TaxonomyResolution> {
  let textbook = await tx.textbook.findFirst({ where: { subjectId, name: item.book } });
  if (!textbook) {
    textbook = await tx.textbook.create({ data: { subjectId, name: item.book } });
    created.textbookIds.push(textbook.id);
  }
  if (!textbook.active) throw new Error(`教材已停用：${item.book}`);

  let parentId: string | null = null;
  let chapterId: string | null = null;
  for (const [index, segment] of item.chapterPath.entries()) {
    let chapter: { id: string; active: boolean } | null = await tx.chapter.findFirst({ where: { textbookId: textbook.id, parentId, name: segment }, select: { id: true, active: true } });
    if (!chapter) {
      chapter = await tx.chapter.create({ data: { textbookId: textbook.id, parentId, name: segment }, select: { id: true, active: true } });
      created.chapterIds.push(chapter.id);
    }
    if (!chapter.active) throw new Error(`章节已停用：${item.book} / ${item.chapterPath.slice(0, index + 1).join(' / ')}`);
    chapterId = chapter.id;
    parentId = chapter.id;
  }
  if (!chapterId) throw new Error('章节路径不能为空。');

  const knowledgePointIds: string[] = [];
  for (const name of item.knowledgePoints) {
    let point = await tx.knowledgePoint.findFirst({ where: { chapterId, name } });
    if (!point) {
      point = await tx.knowledgePoint.create({ data: { chapterId, name } });
      created.knowledgePointIds.push(point.id);
    }
    if (!point.active) throw new Error(`知识点已停用：${name}`);
    knowledgePointIds.push(point.id);
  }

  const errorTypeIds: string[] = [];
  for (const name of item.errorTypes) {
    let errorType = await tx.errorType.findUnique({ where: { subjectId_name: { subjectId, name } } });
    if (!errorType) {
      errorType = await tx.errorType.create({ data: { subjectId, name } });
      created.errorTypeIds.push(errorType.id);
    }
    if (!errorType.active) throw new Error(`错误类型已停用：${name}`);
    errorTypeIds.push(errorType.id);
  }

  return { textbookId: textbook.id, chapterId, knowledgePointIds, errorTypeIds, issues: [], creations: [] };
}

async function findConflict(client: Prisma.TransactionClient | typeof prisma, subjectId: string, item: ParsedImportQuestion, taxonomy: TaxonomyResolution) {
  const select = { id: true, code: true, title: true } as const;
  if (item.externalId) {
    const match = await client.question.findUnique({ where: { subjectId_externalId: { subjectId, externalId: item.externalId } }, select });
    if (match) return { questionId: match.id, code: match.code, title: match.title, reason: `external_id：${item.externalId}` };
  }
  if (taxonomy.textbookId && taxonomy.chapterId && item.sourceQuestionNumber) {
    const match = await client.question.findFirst({
      where: { subjectId, textbookId: taxonomy.textbookId, chapterId: taxonomy.chapterId, materialType: item.materialType, sourceQuestionNumber: item.sourceQuestionNumber }, select,
    });
    if (match) return { questionId: match.id, code: match.code, title: match.title, reason: `${item.book} · ${item.materialType === 'EXAMPLE' ? '例' : '练习'} ${item.sourceQuestionNumber}` };
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
    const autoCreateTaxonomy = formData.get('autoCreateTaxonomy') === 'on';
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
      const taxonomy = await resolveTaxonomy(prisma, subject.id, item, autoCreateTaxonomy);
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
        materialType: item.materialType,
        reference: questionReference(item).primary,
        pageLabel: questionReference(item).page,
        valid: issues.length === 0,
        issues,
        taxonomyChanges: taxonomy.creations,
        conflict,
      });
    }
    for (const error of parseErrors) {
      rows.push({
        key: `${error.sourceName}:${error.documentIndex}:error`, sourceName: error.sourceName, documentIndex: error.documentIndex,
        title: '解析失败', book: '—', chapter: '—', valid: false, issues: [error.message], conflict: null,
      });
    }
    const stored: StoredPreview = { items, rows, parseErrors, autoCreateTaxonomy };
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
    await prisma.auditLog.create({ data: { action: 'IMPORT_PREVIEW_CREATED', entity: 'ImportJob', entityId: job.id, detail: { total: documentCount, invalid: rows.filter((row) => !row.valid).length, autoCreateTaxonomy } } });
    revalidatePath('/imports');
    return { jobId: job.id, rows, sourceType: input.sourceType };
  } catch (error) {
    await removeStoredImport(storedFileName);
    return { error: error instanceof Error ? error.message : '无法生成导入预览。' };
  }
}

type StoredJsonPreview = { data: FullJsonExport; rows: PreviewRow[] };

async function findJsonConflict(client: Prisma.TransactionClient | typeof prisma, subjectId: string, item: FullJsonExport['questions'][number]) {
  const select = { id: true, code: true, title: true } as const;
  if (item.externalId) {
    const match = await client.question.findUnique({ where: { subjectId_externalId: { subjectId, externalId: item.externalId } }, select });
    if (match) return { questionId: match.id, code: match.code, title: match.title, reason: `external_id：${item.externalId}` };
  }
  const codeMatch = await client.question.findUnique({ where: { code: item.code }, select });
  if (codeMatch) return { questionId: codeMatch.id, code: codeMatch.code, title: codeMatch.title, reason: `题目编号：${item.code}` };
  const fingerprint = questionFingerprint(item.bodyMarkdown);
  const match = await client.question.findFirst({ where: { subjectId, contentFingerprint: fingerprint }, select });
  return match ? { questionId: match.id, code: match.code, title: match.title, reason: '题干内容指纹相同' } : null;
}

export async function previewJsonImportAction(_previous: JsonImportPreviewState, formData: FormData): Promise<JsonImportPreviewState> {
  await requireUser();
  try {
    const files = formData.getAll('jsonFile').filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length !== 1 || !files[0].name.toLocaleLowerCase().endsWith('.json')) throw new Error('请选择一个由本系统导出的 .json 文件。');
    if (files[0].size > 15 * 1024 * 1024) throw new Error('JSON 文件不能超过 15MB。');
    const data = parseFullJsonExport(await files[0].text());
    const subjectsByOldId = new Map(data.subjects.map((item) => [item.id, item]));
    const books = data.subjects.flatMap((item) => item.textbooks);
    const booksByOldId = new Map(books.map((item) => [item.id, item]));
    const chaptersByOldId = new Map(books.flatMap((item) => item.chapters).map((item) => [item.id, item]));
    const databaseSubjects = new Map((await prisma.subject.findMany()).map((item) => [item.slug, item]));
    const rows: PreviewRow[] = [];
    for (const [index, item] of data.questions.entries()) {
      const exportedSubject = subjectsByOldId.get(item.subjectId)!;
      const databaseSubject = databaseSubjects.get(exportedSubject.slug);
      const issues: string[] = [];
      if (exportedSubject.slug !== 'mathematics') issues.push(`当前版本只导入数学题，暂不导入 ${exportedSubject.name} 的具体题目`);
      const conflict = databaseSubject ? await findJsonConflict(prisma, databaseSubject.id, item) : null;
      rows.push({
        key: `json:${item.id}`, sourceName: files[0].name, documentIndex: index + 1, title: item.title,
        book: booksByOldId.get(item.textbookId)?.name || '—', chapter: chaptersByOldId.get(item.chapterId)?.name || '—',
        materialType: item.materialType,
        reference: questionReference(item).primary,
        pageLabel: questionReference(item).page,
        valid: issues.length === 0, issues, conflict,
      });
    }
    const attachmentCount = data.questions.reduce((sum, item) => sum + item.attachments.length, 0);
    const job = await prisma.importJob.create({
      data: {
        sourceType: ImportSourceType.JSON, originalName: files[0].name.slice(0, 255), totalCount: data.questions.length,
        failedCount: rows.filter((row) => !row.valid).length, preview: json({ data, rows } satisfies StoredJsonPreview),
      },
    });
    await prisma.auditLog.create({ data: { action: 'JSON_IMPORT_PREVIEW_CREATED', entity: 'ImportJob', entityId: job.id, detail: { questions: data.questions.length, attachmentsWithoutFiles: attachmentCount } } });
    revalidatePath('/imports');
    return {
      jobId: job.id, rows, sourceType: ImportSourceType.JSON,
      notice: attachmentCount ? `JSON 只包含 ${attachmentCount} 条附件元数据，不包含图片文件；图片请通过服务器备份恢复。` : undefined,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '无法生成 JSON 导入预览。' };
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
    tags: item.tags, materialType: item.materialType, questionType: item.questionType, difficulty: item.difficulty, priority: item.priority,
    occurredAt: new Date(item.occurredAt), nextReviewAt: item.nextReviewAt ? new Date(item.nextReviewAt) : null,
    knowledgePoints: { create: taxonomy.knowledgePointIds.map((knowledgePointId, index) => ({ knowledgePointId, primary: index === 0 })) },
    errorTypes: { create: taxonomy.errorTypeIds.map((errorTypeId, index) => ({ errorTypeId, primary: index === 0 })) },
  };
}

function questionData(subjectId: string, importJobId: string, item: ParsedImportQuestion, taxonomy: TaxonomyResolution, externalId: string | null) {
  return { code: questionCode(), subjectId, importJobId, ...questionUpdateData(item, taxonomy, externalId) };
}

type JsonTaxonomyMaps = {
  subjects: Map<string, string>; textbooks: Map<string, string>; chapters: Map<string, string>;
  knowledgePoints: Map<string, string>; errorTypes: Map<string, string>;
  created: { subjectIds: string[]; textbookIds: string[]; chapterIds: string[]; knowledgePointIds: string[]; errorTypeIds: string[] };
};

async function materializeJsonTaxonomy(tx: Prisma.TransactionClient, data: FullJsonExport): Promise<JsonTaxonomyMaps> {
  const maps: JsonTaxonomyMaps = {
    subjects: new Map(), textbooks: new Map(), chapters: new Map(), knowledgePoints: new Map(), errorTypes: new Map(),
    created: { subjectIds: [], textbookIds: [], chapterIds: [], knowledgePointIds: [], errorTypeIds: [] },
  };
  for (const subject of data.subjects) {
    let target = await tx.subject.findUnique({ where: { slug: subject.slug } });
    if (!target) {
      target = await tx.subject.create({ data: {
        slug: subject.slug, name: subject.name, shortName: subject.shortName, description: subject.description,
        icon: subject.icon, color: subject.color, enabled: subject.slug === 'mathematics', sortOrder: subject.sortOrder,
      } });
      maps.created.subjectIds.push(target.id);
    }
    maps.subjects.set(subject.id, target.id);
    for (const book of subject.textbooks) {
      let targetBook = await tx.textbook.findFirst({ where: { subjectId: target.id, name: book.name } });
      if (!targetBook) {
        targetBook = await tx.textbook.create({ data: { subjectId: target.id, name: book.name, description: book.description, sortOrder: book.sortOrder, active: book.active } });
        maps.created.textbookIds.push(targetBook.id);
      }
      maps.textbooks.set(book.id, targetBook.id);
    }
    for (const errorType of subject.errorTypes) {
      let targetError = await tx.errorType.findUnique({ where: { subjectId_name: { subjectId: target.id, name: errorType.name } } });
      if (!targetError) {
        targetError = await tx.errorType.create({ data: { subjectId: target.id, name: errorType.name, description: errorType.description, color: errorType.color, active: errorType.active } });
        maps.created.errorTypeIds.push(targetError.id);
      }
      maps.errorTypes.set(errorType.id, targetError.id);
    }
  }

  const pending = data.subjects.flatMap((subject) => subject.textbooks.flatMap((book) => book.chapters));
  while (pending.length) {
    let progressed = false;
    for (let index = pending.length - 1; index >= 0; index--) {
      const chapter = pending[index];
      if (chapter.parentId && !maps.chapters.has(chapter.parentId)) continue;
      const textbookId = maps.textbooks.get(chapter.textbookId)!;
      const parentId = chapter.parentId ? maps.chapters.get(chapter.parentId)! : null;
      let target = await tx.chapter.findFirst({ where: { textbookId, parentId, name: chapter.name } });
      if (!target) {
        target = await tx.chapter.create({ data: { textbookId, parentId, name: chapter.name, sortOrder: chapter.sortOrder, active: chapter.active } });
        maps.created.chapterIds.push(target.id);
      }
      maps.chapters.set(chapter.id, target.id);
      pending.splice(index, 1); progressed = true;
    }
    if (!progressed) throw new Error('JSON 章节树无法按父子顺序恢复。');
  }
  for (const subject of data.subjects) for (const book of subject.textbooks) for (const chapter of book.chapters) {
    const chapterId = maps.chapters.get(chapter.id)!;
    for (const point of chapter.knowledgePoints) {
      let target = await tx.knowledgePoint.findUnique({ where: { chapterId_name: { chapterId, name: point.name } } });
      if (!target) {
        target = await tx.knowledgePoint.create({ data: { chapterId, name: point.name, description: point.description, active: point.active } });
        maps.created.knowledgePointIds.push(target.id);
      }
      maps.knowledgePoints.set(point.id, target.id);
    }
  }
  return maps;
}

function jsonQuestionUpdateData(item: FullJsonExport['questions'][number], maps: JsonTaxonomyMaps, externalId: string | null) {
  return {
    externalId, contentFingerprint: questionFingerprint(item.bodyMarkdown), textbookId: maps.textbooks.get(item.textbookId)!, chapterId: maps.chapters.get(item.chapterId)!,
    title: item.title, bodyMarkdown: item.bodyMarkdown, wrongReason: item.wrongReason, reflection: item.reflection, reminder: item.reminder,
    sourcePage: item.sourcePage, sourceQuestionNumber: item.sourceQuestionNumber, tags: item.tags, materialType: item.materialType, questionType: item.questionType,
    difficulty: item.difficulty, priority: item.priority, occurredAt: new Date(item.occurredAt), nextReviewAt: item.nextReviewAt ? new Date(item.nextReviewAt) : null,
    knowledgePoints: { create: item.knowledgePoints.map((point) => ({ knowledgePointId: maps.knowledgePoints.get(point.knowledgePointId)!, primary: point.primary })) },
    errorTypes: { create: item.errorTypes.map((errorType) => ({ errorTypeId: maps.errorTypes.get(errorType.errorTypeId)!, primary: errorType.primary })) },
  };
}

async function confirmJsonImportJob(jobId: string, strategy: ImportConflictStrategy) {
  await prisma.$transaction(async (tx) => {
    const job = await tx.importJob.findUnique({ where: { id: jobId } });
    if (!job || job.sourceType !== ImportSourceType.JSON || job.status !== ImportJobStatus.PREVIEWED) throw new Error('JSON 导入作业不存在或已经处理。');
    const preview = job.preview as unknown as StoredJsonPreview;
    if (preview.rows.some((row) => !row.valid)) throw new Error('JSON 预览仍有错误，不能确认导入。');
    const maps = await materializeJsonTaxonomy(tx, preview.data);
    const settings = await tx.learningSettings.findUniqueOrThrow({ where: { id: 'learning' } });
    const threshold = preview.data.learningSettings?.masteryThreshold ?? settings.masteryThreshold;
    const createdQuestionIds: string[] = []; const updatedQuestions: Array<Record<string, unknown>> = [];
    let skippedCount = 0;

    for (const item of preview.data.questions) {
      const subjectId = maps.subjects.get(item.subjectId)!;
      const conflict = await findJsonConflict(tx, subjectId, item);
      if (conflict && strategy === ImportConflictStrategy.SKIP) { skippedCount += 1; continue; }
      if (conflict && strategy === ImportConflictStrategy.UPDATE_BASIC) {
        const existing = await tx.question.findUniqueOrThrow({ where: { id: conflict.questionId }, include: { knowledgePoints: true, errorTypes: true } });
        updatedQuestions.push({
          id: existing.id,
          data: {
            externalId: existing.externalId, contentFingerprint: existing.contentFingerprint, textbookId: existing.textbookId, chapterId: existing.chapterId,
            title: existing.title, bodyMarkdown: existing.bodyMarkdown, wrongReason: existing.wrongReason, reflection: existing.reflection,
            reminder: existing.reminder, sourcePage: existing.sourcePage, sourceQuestionNumber: existing.sourceQuestionNumber, tags: existing.tags,
            materialType: existing.materialType, questionType: existing.questionType, difficulty: existing.difficulty, priority: existing.priority,
            occurredAt: existing.occurredAt.toISOString(), nextReviewAt: existing.nextReviewAt?.toISOString() ?? null,
          },
          knowledgePointIds: existing.knowledgePoints.map((point) => point.knowledgePointId), errorTypeIds: existing.errorTypes.map((error) => error.errorTypeId),
        });
        await tx.questionKnowledgePoint.deleteMany({ where: { questionId: existing.id } });
        await tx.questionErrorType.deleteMany({ where: { questionId: existing.id } });
        await tx.question.update({ where: { id: existing.id }, data: jsonQuestionUpdateData(item, maps, item.externalId) });
        continue;
      }

      const orderedAttempts = [...item.attempts].sort((left, right) => Date.parse(left.attemptedAt) - Date.parse(right.attemptedAt));
      const mastery = calculateMastery(orderedAttempts.map((attempt) => attempt.result), threshold);
      const override = item.masteryOverride ?? (item.manuallyMastered ? MasteryOverride.FORCE_MASTERED : null);
      const mastered = override === MasteryOverride.FORCE_MASTERED || (override !== MasteryOverride.FORCE_ACTIVE && mastery.mastered);
      const protectedStatus = item.status === QuestionStatus.ARCHIVED || item.status === QuestionStatus.DELETED;
      const status = protectedStatus ? item.status : mastered ? QuestionStatus.MASTERED : QuestionStatus.ACTIVE;
      const created = await tx.question.create({
        data: {
          code: conflict ? questionCode() : item.code, subjectId, importJobId: job.id,
          ...jsonQuestionUpdateData(item, maps, conflict ? null : item.externalId),
          status, correctStreak: mastery.correctStreak, independentCorrectCount: mastery.independentCorrectCount,
          attemptCount: orderedAttempts.length, wrongCount: mastery.wrongCount,
          lastAttemptAt: orderedAttempts.at(-1) ? new Date(orderedAttempts.at(-1)!.attemptedAt) : null,
          masteredAt: mastered ? (item.masteredAt ? new Date(item.masteredAt) : new Date()) : null,
          masteryOverride: override, manuallyMastered: override === MasteryOverride.FORCE_MASTERED,
          archivedAt: status === QuestionStatus.ARCHIVED ? (item.archivedAt ? new Date(item.archivedAt) : new Date()) : null,
          deletedAt: status === QuestionStatus.DELETED ? (item.deletedAt ? new Date(item.deletedAt) : new Date()) : null,
          attempts: { create: orderedAttempts.map((attempt) => ({
            result: attempt.result, attemptedAt: new Date(attempt.attemptedAt), durationSeconds: attempt.durationSeconds,
            confidence: attempt.confidence, errorReason: attempt.errorReason, note: attempt.note,
            nextReviewAt: attempt.nextReviewAt ? new Date(attempt.nextReviewAt) : null, source: attempt.source,
          })) },
        }, select: { id: true },
      });
      createdQuestionIds.push(created.id);
    }

    const siteBefore = await tx.siteSettings.findUnique({ where: { id: 'site' }, select: { siteName: true, siteSubtitle: true, siteDescription: true, accessTitle: true, accessDescription: true, homeGreeting: true, brandColor: true } });
    const learningBefore = await tx.learningSettings.findUnique({ where: { id: 'learning' }, select: { masteryThreshold: true, repeatedErrorThreshold: true, reviewIntervals: true, timezone: true } });
    if (preview.data.siteSettings) await tx.siteSettings.update({ where: { id: 'site' }, data: {
      siteName: preview.data.siteSettings.siteName, siteSubtitle: preview.data.siteSettings.siteSubtitle, siteDescription: preview.data.siteSettings.siteDescription,
      accessTitle: preview.data.siteSettings.accessTitle, accessDescription: preview.data.siteSettings.accessDescription,
      homeGreeting: preview.data.siteSettings.homeGreeting, brandColor: preview.data.siteSettings.brandColor,
    } });
    if (preview.data.learningSettings) await tx.learningSettings.update({ where: { id: 'learning' }, data: {
      masteryThreshold: preview.data.learningSettings.masteryThreshold, repeatedErrorThreshold: preview.data.learningSettings.repeatedErrorThreshold,
      reviewIntervals: preview.data.learningSettings.reviewIntervals, timezone: preview.data.learningSettings.timezone,
    } });
    await tx.importJob.update({ where: { id: job.id }, data: {
      status: ImportJobStatus.COMPLETED, conflictStrategy: strategy, successCount: createdQuestionIds.length + updatedQuestions.length,
      skippedCount, failedCount: 0, completedAt: new Date(),
      rollbackData: json({ kind: 'JSON', createdQuestionIds, updatedQuestions, createdTaxonomy: maps.created, siteBefore, learningBefore }),
    } });
    await tx.auditLog.create({ data: { action: 'JSON_IMPORT_COMPLETED', entity: 'ImportJob', entityId: job.id, detail: { created: createdQuestionIds.length, updated: updatedQuestions.length, skipped: skippedCount } } });
  }, { maxWait: 10_000, timeout: 300_000 });
}

export async function confirmImportJobAction(jobId: string, formData: FormData) {
  await requireUser();
  const strategy = String(formData.get('strategy') || '') as ImportConflictStrategy;
  if (!Object.values(ImportConflictStrategy).includes(strategy)) throw new Error('请选择有效的重复处理策略。');

  const preflightJob = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!preflightJob || preflightJob.status !== ImportJobStatus.PREVIEWED) throw new Error('导入作业不存在或已经处理。');
  if (preflightJob.sourceType === ImportSourceType.JSON) {
    await confirmJsonImportJob(jobId, strategy);
    revalidatePath('/'); revalidatePath('/questions'); revalidatePath('/imports'); revalidatePath('/settings');
    redirect(`/imports?completed=${jobId}`);
  }
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
    const createdTaxonomy = emptyCreatedTaxonomy();
    let skippedCount = 0;

    for (const item of preview.items) {
      const inspectedTaxonomy = await resolveTaxonomy(tx, subject.id, item, Boolean(preview.autoCreateTaxonomy));
      if (inspectedTaxonomy.issues.length) throw new Error(`${item.title}：${inspectedTaxonomy.issues.join('；')}`);
      const conflict = await findConflict(tx, subject.id, item, inspectedTaxonomy);
      if (conflict && strategy === ImportConflictStrategy.SKIP) {
        skippedCount += 1;
        continue;
      }
      const taxonomy = preview.autoCreateTaxonomy
        ? await materializeTaxonomy(tx, subject.id, item, createdTaxonomy)
        : inspectedTaxonomy;
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
            tags: existing.tags, materialType: existing.materialType, questionType: existing.questionType, difficulty: existing.difficulty, priority: existing.priority,
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
        rollbackData: json({ createdQuestionIds, updatedQuestions, createdTaxonomy }),
      },
    });
    await tx.auditLog.create({ data: { action: 'IMPORT_COMPLETED', entity: 'ImportJob', entityId: job.id, detail: {
      created: createdQuestionIds.length, updated: updatedQuestions.length, skipped: skippedCount, strategy,
      createdTaxonomy: createdTaxonomy.textbookIds.length + createdTaxonomy.chapterIds.length + createdTaxonomy.knowledgePointIds.length + createdTaxonomy.errorTypeIds.length,
    } } });
    }, { maxWait: 10_000, timeout: 60_000 });
  } catch (error) {
    await Promise.all(writtenStorageNames.map((storageName) => removeStoredAttachment(storageName)));
    throw error;
  }

  revalidatePath('/');
  revalidatePath('/questions');
  revalidatePath('/imports');
  revalidatePath('/questions/import');
  revalidatePath('/textbooks');
  revalidatePath('/knowledge-points');
  revalidatePath('/error-types');
  redirect(`/questions/import?completed=${jobId}`);
}

type RollbackQuestion = {
  id: string;
  data: {
    externalId: string | null; contentFingerprint: string | null; textbookId: string; chapterId: string; title: string;
    bodyMarkdown: string; wrongReason: string; reflection: string | null; reminder: string | null; sourcePage: string | null;
    sourceQuestionNumber: string | null; tags: string[]; materialType: ParsedImportQuestion['materialType']; questionType: ParsedImportQuestion['questionType']; difficulty: number;
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
    const rollback = job.rollbackData as unknown as {
      kind?: 'JSON'; createdQuestionIds: string[]; updatedQuestions: RollbackQuestion[];
      createdTaxonomy?: { subjectIds: string[]; textbookIds: string[]; chapterIds: string[]; knowledgePointIds: string[]; errorTypeIds: string[] };
      siteBefore?: { siteName: string; siteSubtitle: string; siteDescription: string; accessTitle: string; accessDescription: string; homeGreeting: string; brandColor: string } | null;
      learningBefore?: { masteryThreshold: number; repeatedErrorThreshold: number; reviewIntervals: number[]; timezone: string } | null;
    };
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
    if (rollback.kind === 'JSON') {
      if (rollback.siteBefore) await tx.siteSettings.update({ where: { id: 'site' }, data: rollback.siteBefore });
      if (rollback.learningBefore) await tx.learningSettings.update({ where: { id: 'learning' }, data: rollback.learningBefore });
    }
    if (rollback.createdTaxonomy) {
      await tx.knowledgePoint.deleteMany({ where: { id: { in: rollback.createdTaxonomy.knowledgePointIds } } });
      await tx.errorType.deleteMany({ where: { id: { in: rollback.createdTaxonomy.errorTypeIds } } });
      await tx.chapter.deleteMany({ where: { id: { in: rollback.createdTaxonomy.chapterIds } } });
      await tx.textbook.deleteMany({ where: { id: { in: rollback.createdTaxonomy.textbookIds } } });
      await tx.subject.deleteMany({ where: { id: { in: rollback.createdTaxonomy.subjectIds } } });
    }
    await tx.importJob.update({ where: { id: job.id }, data: { status: ImportJobStatus.ROLLED_BACK, rolledBackAt: new Date() } });
    await tx.auditLog.create({ data: { action: 'IMPORT_ROLLED_BACK', entity: 'ImportJob', entityId: job.id, detail: { removed: rollback.createdQuestionIds.length, restored: rollback.updatedQuestions.length } } });
  }, { maxWait: 10_000, timeout: 60_000 });
  await Promise.all(removedStorageNames.map((storageName) => removeStoredAttachment(storageName)));
  revalidatePath('/');
  revalidatePath('/questions');
  revalidatePath('/imports');
  revalidatePath('/textbooks');
  revalidatePath('/knowledge-points');
  revalidatePath('/error-types');
  redirect(`/imports?rolledBack=${jobId}`);
}
