import { MemoryCardKind } from '@prisma/client';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const common = {
  schema_version: z.literal('1.0'),
  subject: z.enum(['数学', 'mathematics', 'MATH']).default('数学'),
};

const memoryCardSchema = z.object({
  ...common,
  record_type: z.literal('memory_card'),
  title: z.string().trim().min(1).max(160).optional(),
  category: z.string().trim().min(1).max(240).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  book: z.string().trim().min(1).max(160).optional(),
  chapter_path: z.array(z.string().trim().min(1).max(160)).max(12).optional().default([]),
  kind: z.enum(['公式', '技巧', '记忆', 'FORMULA', 'TECHNIQUE', 'MEMORY']).default('公式'),
  summary: z.string().trim().max(300).optional().default(''),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).optional().default([]),
  pinned: z.boolean().optional().default(false),
  show_on_home: z.boolean().optional().default(true),
  sort_order: z.coerce.number().int().min(-9999).max(9999).optional().default(0),
}).strict().superRefine((data, context) => {
  if (!data.title && !data.name) context.addIssue({ code: 'custom', path: ['title'], message: 'title 与 name 至少填写一项' });
  if (!data.category && !data.book) context.addIssue({ code: 'custom', path: ['category'], message: 'category 与 book 至少填写一项' });
});

const textbookSchema = z.object({
  ...common,
  record_type: z.literal('textbook'),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional().default(''),
  sort_order: z.coerce.number().int().min(-9999).max(9999).optional().default(0),
}).strict();

const chapterSchema = z.object({
  ...common,
  record_type: z.literal('chapter'),
  book: z.string().trim().min(1).max(160),
  chapter_path: z.array(z.string().trim().min(1).max(160)).min(1).max(12),
  sort_order: z.coerce.number().int().min(-9999).max(9999).optional().default(0),
}).strict();

const knowledgePointSchema = z.object({
  ...common,
  record_type: z.literal('knowledge_point'),
  book: z.string().trim().min(1).max(160),
  chapter_path: z.array(z.string().trim().min(1).max(160)).min(1).max(12),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional().default(''),
}).strict();

const errorTypeSchema = z.object({
  ...common,
  record_type: z.literal('error_type'),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional().default(''),
  color: z.enum(['slate', 'blue', 'amber', 'red', 'green']).optional().default('slate'),
}).strict();

const recordSchema = z.discriminatedUnion('record_type', [
  memoryCardSchema,
  textbookSchema,
  chapterSchema,
  knowledgePointSchema,
  errorTypeSchema,
]);

const kindMap = {
  公式: MemoryCardKind.FORMULA,
  技巧: MemoryCardKind.TECHNIQUE,
  记忆: MemoryCardKind.MEMORY,
  FORMULA: MemoryCardKind.FORMULA,
  TECHNIQUE: MemoryCardKind.TECHNIQUE,
  MEMORY: MemoryCardKind.MEMORY,
} as const;

type ParsedYamlRecord = z.infer<typeof recordSchema>;

export type StructuredImportRecord =
  | {
    recordType: 'memory_card'; title: string; category: string; kind: MemoryCardKind;
    summary: string | null; tags: string[]; pinned: boolean; showOnHome: boolean;
    sortOrder: number; contentMarkdown: string;
  }
  | { recordType: 'textbook'; name: string; description: string | null; sortOrder: number }
  | { recordType: 'chapter'; book: string; chapterPath: string[]; sortOrder: number }
  | { recordType: 'knowledge_point'; book: string; chapterPath: string[]; name: string; description: string | null }
  | { recordType: 'error_type'; name: string; description: string | null; color: string };

export type StructuredImportError = { documentIndex: number; recordType?: string; message: string };

function normalizeLineEndings(value: string) {
  return value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function documentStarts(raw: string) {
  const starts: number[] = [];
  const pattern = /^---\s*\n(?=(?:[ \t]*#.*\n|[ \t]*\n)*schema_version\s*:)/gm;
  for (const match of raw.matchAll(pattern)) starts.push(match.index ?? 0);
  return starts;
}

function splitDocuments(rawInput: string) {
  const raw = normalizeLineEndings(rawInput).trim();
  const starts = documentStarts(raw);
  if (!starts.length) return raw ? [raw] : [];
  return starts.map((start, index) => raw.slice(start, starts[index + 1] ?? raw.length).trim()).filter(Boolean);
}

function parseFrontMatter(document: string) {
  const match = document.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) throw new Error('缺少 YAML Front Matter，或起止分隔符格式不正确');
  let raw: unknown;
  try {
    raw = parseYaml(match[1]);
  } catch (error) {
    throw new Error(`YAML 无法解析：${error instanceof Error ? error.message : '未知错误'}`);
  }
  const parsed = recordSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => `${issue.path.join('.') || 'Front Matter'}：${issue.message}`).join('；'));
  }
  return { data: parsed.data, markdown: document.slice(match[0].length).trim() };
}

function contentSection(markdown: string) {
  const heading = /^#\s+内容\s*$/m.exec(markdown);
  if (!heading) return '';
  const remainder = markdown.slice(heading.index + heading[0].length);
  const nextHeading = /^#\s+/m.exec(remainder);
  return remainder.slice(0, nextHeading?.index ?? remainder.length).trim();
}

function mapRecord(data: ParsedYamlRecord, markdown: string): StructuredImportRecord {
  if (data.record_type === 'memory_card') {
    const contentMarkdown = contentSection(markdown);
    if (!contentMarkdown) throw new Error('memory_card 缺少必填区块“# 内容”或区块内容为空');
    const title = data.title || data.name;
    const category = data.category || [data.book, ...data.chapter_path].filter(Boolean).join(' / ');
    if (!title || !category) throw new Error('memory_card 无法确定标题或分类');
    return {
      recordType: 'memory_card',
      title,
      category,
      kind: kindMap[data.kind],
      summary: data.summary || null,
      tags: [...new Set(data.tags)],
      pinned: data.pinned,
      showOnHome: data.show_on_home,
      sortOrder: data.sort_order,
      contentMarkdown,
    };
  }
  if (data.record_type === 'textbook') return { recordType: 'textbook', name: data.name, description: data.description || null, sortOrder: data.sort_order };
  if (data.record_type === 'chapter') return { recordType: 'chapter', book: data.book, chapterPath: data.chapter_path, sortOrder: data.sort_order };
  if (data.record_type === 'knowledge_point') return { recordType: 'knowledge_point', book: data.book, chapterPath: data.chapter_path, name: data.name, description: data.description || null };
  return { recordType: 'error_type', name: data.name, description: data.description || null, color: data.color };
}

export function parseStructuredMarkdownBatch(raw: string) {
  const documents = splitDocuments(raw);
  const records: StructuredImportRecord[] = [];
  const errors: StructuredImportError[] = [];
  documents.forEach((document, index) => {
    try {
      const { data, markdown } = parseFrontMatter(document);
      records.push(mapRecord(data, markdown));
    } catch (error) {
      const recordType = /^record_type\s*:\s*["']?([^\s"']+)/m.exec(document)?.[1];
      errors.push({ documentIndex: index + 1, recordType, message: error instanceof Error ? error.message : '解析失败' });
    }
  });
  return { records, errors, documentCount: documents.length };
}
