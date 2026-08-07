'use server';

import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { parseStructuredMarkdownBatch } from '@/lib/imports/structured-markdown';
import { prisma } from '@/lib/prisma';

export type StructuredImportState = {
  error?: string;
  success?: string;
  created?: number;
  updated?: number;
  importedByType?: Partial<Record<'公式与技巧' | '教材' | '章节' | '知识点' | '错误类型', number>>;
};

type ImportCounters = {
  created: number;
  updated: number;
  byType: NonNullable<StructuredImportState['importedByType']>;
};

async function ensureTextbook(
  tx: Prisma.TransactionClient,
  subjectId: string,
  name: string,
  counters: ImportCounters,
  options?: { description?: string | null; sortOrder?: number },
) {
  const existing = await tx.textbook.findUnique({ where: { subjectId_name: { subjectId, name } } });
  if (existing) {
    const description = options?.description;
    if (!existing.active || description) {
      await tx.textbook.update({
        where: { id: existing.id },
        data: { active: true, ...(description ? { description } : {}) },
      });
      counters.updated += 1;
    }
    return existing.id;
  }
  const created = await tx.textbook.create({
    data: { subjectId, name, description: options?.description || null, sortOrder: options?.sortOrder ?? 0 },
  });
  counters.created += 1;
  counters.byType.教材 = (counters.byType.教材 || 0) + 1;
  return created.id;
}

async function ensureChapterPath(
  tx: Prisma.TransactionClient,
  textbookId: string,
  chapterPath: string[],
  counters: ImportCounters,
  leafSortOrder = 0,
) {
  let parentId: string | null = null;
  let chapterId: string | null = null;
  for (const [index, name] of chapterPath.entries()) {
    const existing: { id: string; active: boolean } | null = await tx.chapter.findFirst({
      where: { textbookId, parentId, name },
      select: { id: true, active: true },
    });
    if (existing) {
      if (!existing.active) {
        await tx.chapter.update({ where: { id: existing.id }, data: { active: true } });
        counters.updated += 1;
      }
      chapterId = existing.id;
    } else {
      const created: { id: string } = await tx.chapter.create({
        data: { textbookId, parentId, name, sortOrder: index === chapterPath.length - 1 ? leafSortOrder : 0 },
        select: { id: true },
      });
      chapterId = created.id;
      counters.created += 1;
      counters.byType.章节 = (counters.byType.章节 || 0) + 1;
    }
    parentId = chapterId;
  }
  if (!chapterId) throw new Error('章节路径不能为空。');
  return chapterId;
}

export async function importStructuredMarkdownAction(
  _previous: StructuredImportState,
  formData: FormData,
): Promise<StructuredImportState> {
  await requireUser();
  try {
    const markdown = String(formData.get('markdown') || '').trim();
    const scope = formData.get('scope') === 'memory' ? 'memory' : 'all';
    if (!markdown) return { error: '请先粘贴 AI 返回的标准 Markdown。' };
    if (Buffer.byteLength(markdown, 'utf8') > 1024 * 1024) return { error: '单次粘贴内容不能超过 1MB。' };

    const parsed = parseStructuredMarkdownBatch(markdown);
    if (!parsed.documentCount) return { error: '没有检测到可导入的文档。' };
    if (parsed.documentCount > 1000) return { error: '单次最多导入 1000 条内容。' };
    const blockingErrors = scope === 'memory'
      ? parsed.errors.filter((item) => !item.recordType || item.recordType === 'memory_card')
      : parsed.errors;
    if (blockingErrors.length) {
      const details = blockingErrors.slice(0, 5).map((item) => `第 ${item.documentIndex} 条：${item.message}`).join('；');
      return { error: `${details}${blockingErrors.length > 5 ? `；另有 ${blockingErrors.length - 5} 条错误` : ''}` };
    }

    const records = scope === 'memory'
      ? parsed.records.filter((record) => record.recordType === 'memory_card')
      : parsed.records;
    if (!records.length) return { error: scope === 'memory' ? '没有检测到可导入的公式、技巧或记忆卡片。' : '没有检测到可导入的规范内容。' };
    const ignoredCount = parsed.documentCount - records.length - blockingErrors.length;

    const counters: ImportCounters = { created: 0, updated: 0, byType: {} };
    await prisma.$transaction(async (tx) => {
      const subject = await tx.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
      for (const record of records) {
        if (record.recordType === 'memory_card') {
          const existing = await tx.memoryCard.findFirst({
            where: { subjectId: subject.id, title: record.title, category: record.category },
          });
          const data = {
            kind: record.kind,
            title: record.title,
            category: record.category,
            contentMarkdown: record.contentMarkdown,
            summary: record.summary,
            tags: record.tags,
            pinned: record.pinned,
            showOnHome: record.showOnHome,
            sortOrder: record.sortOrder,
          };
          if (existing) {
            await tx.memoryCard.update({ where: { id: existing.id }, data });
            counters.updated += 1;
          } else {
            await tx.memoryCard.create({ data: { subjectId: subject.id, ...data } });
            counters.created += 1;
          }
          counters.byType['公式与技巧'] = (counters.byType['公式与技巧'] || 0) + 1;
          continue;
        }

        if (record.recordType === 'textbook') {
          const beforeCreated = counters.created;
          await ensureTextbook(tx, subject.id, record.name, counters, { description: record.description, sortOrder: record.sortOrder });
          if (counters.created === beforeCreated) counters.byType.教材 = (counters.byType.教材 || 0) + 1;
          continue;
        }

        if (record.recordType === 'chapter') {
          const textbookId = await ensureTextbook(tx, subject.id, record.book, counters);
          const beforeCreated = counters.created;
          await ensureChapterPath(tx, textbookId, record.chapterPath, counters, record.sortOrder);
          if (counters.created === beforeCreated) counters.byType.章节 = (counters.byType.章节 || 0) + 1;
          continue;
        }

        if (record.recordType === 'knowledge_point') {
          const textbookId = await ensureTextbook(tx, subject.id, record.book, counters);
          const chapterId = await ensureChapterPath(tx, textbookId, record.chapterPath, counters);
          const existing = await tx.knowledgePoint.findUnique({ where: { chapterId_name: { chapterId, name: record.name } } });
          if (existing) {
            await tx.knowledgePoint.update({
              where: { id: existing.id },
              data: { active: true, ...(record.description ? { description: record.description } : {}) },
            });
            counters.updated += 1;
          } else {
            await tx.knowledgePoint.create({ data: { chapterId, name: record.name, description: record.description } });
            counters.created += 1;
          }
          counters.byType.知识点 = (counters.byType.知识点 || 0) + 1;
          continue;
        }

        const existing = await tx.errorType.findUnique({ where: { subjectId_name: { subjectId: subject.id, name: record.name } } });
        if (existing) {
          await tx.errorType.update({
            where: { id: existing.id },
            data: { active: true, color: record.color, ...(record.description ? { description: record.description } : {}) },
          });
          counters.updated += 1;
        } else {
          await tx.errorType.create({ data: { subjectId: subject.id, name: record.name, description: record.description, color: record.color } });
          counters.created += 1;
        }
        counters.byType.错误类型 = (counters.byType.错误类型 || 0) + 1;
      }

      await tx.auditLog.create({
        data: {
          action: 'STRUCTURED_MARKDOWN_IMPORTED',
          entity: 'System',
          detail: { scope, documents: records.length, ignored: ignoredCount, created: counters.created, updated: counters.updated, byType: counters.byType },
        },
      });
    }, { maxWait: 10_000, timeout: 60_000 });

    for (const path of ['/', '/memory', '/textbooks', '/knowledge-points', '/error-types', '/questions', '/questions/new', '/imports']) {
      revalidatePath(path);
    }
    return {
      success: scope === 'memory'
        ? `已导入 ${records.length} 张公式卡片：新建 ${counters.created} 张，更新 ${counters.updated} 张${ignoredCount > 0 ? `；已忽略 ${ignoredCount} 条目录或知识点记录` : ''}。`
        : `已处理 ${records.length} 条规范内容：新建 ${counters.created} 条，更新 ${counters.updated} 条。`,
      created: counters.created,
      updated: counters.updated,
      importedByType: counters.byType,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '导入失败，请检查 Markdown 格式。' };
  }
}
