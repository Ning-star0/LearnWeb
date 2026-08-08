'use server';

import { MemoryCardKind } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { memoryDateKey, nextMemoryReviewAt } from '@/lib/memory-schedule';
import { prisma } from '@/lib/prisma';

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function parseTags(raw: string) {
  return [...new Set(raw.split(/[,，、\n]+/).map((item) => item.trim()).filter(Boolean))].slice(0, 20);
}

function parseKind(raw: string): MemoryCardKind {
  return Object.values(MemoryCardKind).includes(raw as MemoryCardKind)
    ? raw as MemoryCardKind
    : MemoryCardKind.FORMULA;
}

function parseData(formData: FormData) {
  const title = text(formData, 'title').slice(0, 160);
  const category = text(formData, 'category').slice(0, 80);
  const contentMarkdown = text(formData, 'contentMarkdown').slice(0, 100_000);
  const summary = text(formData, 'summary').slice(0, 300) || null;
  if (!title || !category || !contentMarkdown) {
    throw new Error('标题、分类和正文不能为空。');
  }
  return {
    title,
    category,
    contentMarkdown,
    summary,
    kind: parseKind(text(formData, 'kind')),
    tags: parseTags(text(formData, 'tags')),
    pinned: formData.get('pinned') === 'on',
    showOnHome: formData.get('showOnHome') === 'on',
    sortOrder: Math.min(9999, Math.max(-9999, Number.parseInt(text(formData, 'sortOrder'), 10) || 0)),
  };
}

export async function createMemoryCardAction(formData: FormData) {
  await requireUser();
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const card = await prisma.memoryCard.create({ data: { subjectId: subject.id, ...parseData(formData) } });
  await prisma.auditLog.create({ data: { action: 'MEMORY_CARD_CREATED', entity: 'MemoryCard', entityId: card.id } });
  revalidatePath('/');
  revalidatePath('/memory');
  redirect('/memory?created=1');
}

export async function updateMemoryCardAction(cardId: string, formData: FormData) {
  await requireUser();
  const card = await prisma.memoryCard.update({ where: { id: cardId }, data: parseData(formData) });
  await prisma.auditLog.create({ data: { action: 'MEMORY_CARD_UPDATED', entity: 'MemoryCard', entityId: card.id } });
  revalidatePath('/');
  revalidatePath('/memory');
  redirect('/memory?updated=1');
}

export async function deleteMemoryCardAction(cardId: string) {
  await requireUser();
  await prisma.$transaction([
    prisma.memoryCard.delete({ where: { id: cardId } }),
    prisma.auditLog.create({ data: { action: 'MEMORY_CARD_DELETED', entity: 'MemoryCard', entityId: cardId } }),
  ]);
  revalidatePath('/');
  revalidatePath('/memory');
  redirect('/memory?deleted=1');
}

export async function markMemoryViewedAction(cardId: string) {
  await requireUser();
  const now = new Date();
  const dateKey = memoryDateKey(now);
  const [card, settings] = await Promise.all([
    prisma.memoryCard.findUniqueOrThrow({ where: { id: cardId } }),
    prisma.learningSettings.upsert({ where: { id: 'learning' }, update: {}, create: {} }),
  ]);
  const existing = await prisma.memoryReview.findUnique({
    where: { memoryCardId_dateKey: { memoryCardId: cardId, dateKey } },
  });
  if (!existing) {
    const intervals = settings.memoryReviewIntervals.length
      ? settings.memoryReviewIntervals
      : [2, 3, 7, 14, 30];
    await prisma.$transaction([
      prisma.memoryReview.create({ data: { memoryCardId: cardId, dateKey, viewedAt: now } }),
      prisma.memoryCard.update({
        where: { id: cardId },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: now,
          nextReviewAt: nextMemoryReviewAt(now, intervals[Math.min(card.viewCount, intervals.length - 1)]),
        },
      }),
      prisma.auditLog.create({
        data: { action: 'MEMORY_CARD_VIEWED', entity: 'MemoryCard', entityId: cardId, detail: { dateKey } },
      }),
    ]);
  }
  revalidatePath('/');
  revalidatePath('/memory');
  revalidatePath(`/memory/${cardId}`);
}
