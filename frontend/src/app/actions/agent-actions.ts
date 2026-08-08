'use server';

import { createHash } from 'node:crypto';
import { AgentMemoryKind } from '@prisma/client';
import { strFromU8, unzipSync } from 'fflate';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptSecret } from '@/lib/secret-box';

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function validBaseUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) {
    throw new Error('AI API 地址必须使用 HTTPS；仅本机地址允许 HTTP。');
  }
  return url.toString().replace(/\/$/, '');
}

export async function updateAiSettingsAction(formData: FormData) {
  await requireUser();
  const current = await prisma.aiSettings.upsert({ where: { id: 'ai' }, update: {}, create: {} });
  const apiKey = value(formData, 'apiKey');
  const data = {
    provider: 'deepseek',
    baseUrl: validBaseUrl(value(formData, 'baseUrl') || 'https://api.deepseek.com'),
    model: value(formData, 'model').slice(0, 100) || 'deepseek-v4-flash',
    enabled: formData.get('enabled') === 'on',
    systemPrompt: value(formData, 'systemPrompt').slice(0, 8_000) || current.systemPrompt,
    mutationApprovalRequired: true,
    ...(apiKey ? { encryptedApiKey: encryptSecret(apiKey) } : {}),
  };
  await prisma.aiSettings.update({ where: { id: 'ai' }, data });
  await prisma.auditLog.create({ data: { action: 'AI_SETTINGS_UPDATED', entity: 'AiSettings', entityId: 'ai', detail: { model: data.model, enabled: data.enabled } } });
  revalidatePath('/settings');
  revalidatePath('/ai');
  redirect('/settings?ai=saved');
}

function chatGptExportText(input: unknown) {
  if (!Array.isArray(input)) return JSON.stringify(input, null, 2);
  const sections: string[] = [];
  for (const conversation of input.slice(0, 5_000)) {
    if (!conversation || typeof conversation !== 'object') continue;
    const item = conversation as { title?: unknown; mapping?: unknown };
    const lines: string[] = [];
    if (typeof item.title === 'string') lines.push(`# ${item.title}`);
    if (item.mapping && typeof item.mapping === 'object') {
      for (const node of Object.values(item.mapping as Record<string, unknown>)) {
        if (!node || typeof node !== 'object') continue;
        const message = (node as { message?: unknown }).message;
        if (!message || typeof message !== 'object') continue;
        const role = (message as { author?: { role?: unknown } }).author?.role;
        const parts = (message as { content?: { parts?: unknown } }).content?.parts;
        if (!Array.isArray(parts)) continue;
        const content = parts.filter((part): part is string => typeof part === 'string').join('\n').trim();
        if (content) lines.push(`${role === 'assistant' ? 'AI' : '我'}：${content}`);
      }
    }
    if (lines.length > 1) sections.push(lines.join('\n\n'));
  }
  return sections.join('\n\n---\n\n');
}

async function readMemoryFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith('.zip')) {
    const entries = unzipSync(bytes, { filter: (entry) => /\.(json|md|txt)$/i.test(entry.name) && entry.originalSize <= 25 * 1024 * 1024 });
    const entryName = Object.keys(entries).find((name) => /(^|\/)conversations\.json$/i.test(name))
      || Object.keys(entries).find((name) => /\.(json|md|txt)$/i.test(name));
    if (!entryName) throw new Error('压缩包中没有找到 25MB 以内的 conversations.json、Markdown 或文本文件。');
    const raw = strFromU8(entries[entryName]);
    return entryName.endsWith('.json') ? chatGptExportText(JSON.parse(raw)) : raw;
  }
  const raw = strFromU8(bytes);
  return file.name.toLowerCase().endsWith('.json') ? chatGptExportText(JSON.parse(raw)) : raw;
}

export async function importChatGptMemoryAction(formData: FormData) {
  await requireUser();
  const file = formData.get('memoryFile');
  if (!(file instanceof File) || !file.size) throw new Error('请选择 ChatGPT 导出 ZIP、JSON、Markdown 或文本文件。');
  if (file.size > 20 * 1024 * 1024) throw new Error('文件不能超过 20MB。');
  const text = (await readMemoryFile(file)).replace(/\u0000/g, '').slice(0, 5_000_000);
  const chunks = text.match(/[\s\S]{1,8000}/g) || [];
  const rows = chunks.map((content, index) => ({
    fingerprint: createHash('sha256').update(`CHATGPT_EXPORT\0${content}`).digest('hex'),
    kind: AgentMemoryKind.CHATGPT_IMPORT,
    title: `${file.name} · 第 ${String(index + 1).padStart(3, '0')} 段`,
    content,
    source: 'CHATGPT_EXPORT',
    confidence: 0.75,
  }));
  const result = rows.length ? await prisma.agentMemory.createMany({ data: rows, skipDuplicates: true }) : { count: 0 };
  await prisma.auditLog.create({ data: { action: 'AGENT_MEMORY_IMPORTED', entity: 'AgentMemory', detail: { fileName: file.name, chunks: result.count } } });
  revalidatePath('/ai');
  redirect(`/ai?memoryImported=${result.count}`);
}

export async function decideAgentProposalAction(proposalId: string, decision: 'approve' | 'reject') {
  await requireUser();
  const proposal = await prisma.agentProposal.findUniqueOrThrow({ where: { id: proposalId, status: 'PENDING' } });
  const decidedAt = new Date();
  if (decision === 'reject') {
    await prisma.agentProposal.update({ where: { id: proposalId }, data: { status: 'REJECTED', decidedAt } });
  } else if (proposal.actionType === 'AGENT_MEMORY_CREATE') {
    const parsed = z.object({
      kind: z.nativeEnum(AgentMemoryKind).default(AgentMemoryKind.FACT),
      title: z.string().min(1).max(160),
      content: z.string().min(1).max(20_000),
      source: z.string().max(80).default('AI_APPROVED'),
    }).parse(proposal.payload);
    const fingerprint = createHash('sha256').update(`${parsed.kind}\0${parsed.content}`).digest('hex');
    await prisma.$transaction([
      prisma.agentMemory.upsert({ where: { fingerprint }, update: { title: parsed.title, content: parsed.content, active: true }, create: { fingerprint, ...parsed } }),
      prisma.agentProposal.update({ where: { id: proposalId }, data: { status: 'EXECUTED', decidedAt, executedAt: decidedAt } }),
    ]);
  } else if (proposal.actionType === 'FORMULA_CREATE') {
    const parsed = z.object({
      title: z.string().min(1).max(160),
      category: z.string().min(1).max(80),
      contentMarkdown: z.string().min(1).max(100_000),
      summary: z.string().max(300).nullable().optional(),
      tags: z.array(z.string().max(50)).max(20).default([]),
      kind: z.enum(['FORMULA', 'TECHNIQUE', 'MEMORY']).default('FORMULA'),
    }).parse(proposal.payload);
    const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
    await prisma.$transaction([
      prisma.memoryCard.create({ data: { subjectId: subject.id, ...parsed } }),
      prisma.agentProposal.update({ where: { id: proposalId }, data: { status: 'EXECUTED', decidedAt, executedAt: decidedAt } }),
    ]);
  } else {
    await prisma.agentProposal.update({ where: { id: proposalId }, data: { status: 'APPROVED', decidedAt } });
  }
  await prisma.auditLog.create({ data: { action: `AGENT_PROPOSAL_${decision.toUpperCase()}D`, entity: 'AgentProposal', entityId: proposalId } });
  revalidatePath('/ai');
  revalidatePath('/memory');
  revalidatePath('/');
}
