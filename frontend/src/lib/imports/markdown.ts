import { createHash } from 'node:crypto';
import { QuestionType } from '@prisma/client';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const questionTypes = {
  单选题: QuestionType.SINGLE_CHOICE,
  多选题: QuestionType.MULTIPLE_CHOICE,
  填空题: QuestionType.FILL_BLANK,
  计算题: QuestionType.CALCULATION,
  证明题: QuestionType.PROOF,
  判断题: QuestionType.TRUE_FALSE,
  综合题: QuestionType.COMPREHENSIVE,
  其他: QuestionType.OTHER,
} as const;

const priorityValues = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 } as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const frontMatterSchema = z.object({
  schema_version: z.literal('1.0'),
  external_id: z.string().trim().min(1).max(160).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  subject: z.enum(['数学', 'mathematics', 'MATH']),
  book: z.string().trim().min(1).max(160),
  chapter_path: z.array(z.string().trim().min(1).max(160)).min(1).max(12),
  question_type: z.enum(Object.keys(questionTypes) as [keyof typeof questionTypes, ...(keyof typeof questionTypes)[]]),
  source: z.object({
    page: z.union([z.string(), z.number()]).optional(),
    question_number: z.union([z.string(), z.number()]).optional(),
  }).optional(),
  difficulty: z.coerce.number().int().min(1).max(5).default(3),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  occurred_at: z.union([z.literal('today'), z.string().regex(datePattern, '必须使用 YYYY-MM-DD 或 today')]),
  knowledge_points: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
  error_types: z.array(z.string().trim().min(1).max(160)).min(1).max(30),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  image_files: z.array(z.string().trim().min(1).max(260)).max(20).default([]),
  next_review_at: z.string().optional(),
}).strict();

export type ParsedImportQuestion = {
  sourceName: string;
  documentIndex: number;
  schemaVersion: '1.0';
  externalId: string | null;
  title: string;
  book: string;
  chapterPath: string[];
  questionType: QuestionType;
  sourcePage: string | null;
  sourceQuestionNumber: string | null;
  difficulty: number;
  priority: number;
  occurredAt: string;
  knowledgePoints: string[];
  errorTypes: string[];
  tags: string[];
  imageFiles: string[];
  nextReviewAt: string | null;
  bodyMarkdown: string;
  wrongReason: string;
  reminder: string | null;
  reflection: string | null;
  contentFingerprint: string;
};

export type ImportParseError = { sourceName: string; documentIndex: number; message: string };

function normalizeLineEndings(value: string) {
  return value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function documentStarts(raw: string) {
  const starts: number[] = [];
  const pattern = /^---\s*\n(?=schema_version\s*:)/gm;
  for (const match of raw.matchAll(pattern)) starts.push(match.index ?? 0);
  return starts;
}

function splitDocuments(rawInput: string) {
  const raw = normalizeLineEndings(rawInput).trim();
  const starts = documentStarts(raw);
  if (!starts.length) return [raw];
  return starts.map((start, index) => raw.slice(start, starts[index + 1] ?? raw.length).trim()).filter(Boolean);
}

function section(markdown: string, heading: string, level: 1 | 2) {
  const prefix = '#'.repeat(level);
  const startPattern = new RegExp(`^${prefix}\\s+${heading}\\s*$`, 'm');
  const match = startPattern.exec(markdown);
  if (!match) return '';
  const bodyStart = match.index + match[0].length;
  const remaining = markdown.slice(bodyStart);
  const endPattern = level === 1 ? /^#{1,2}\s+/m : /^##\s+/m;
  const end = endPattern.exec(remaining);
  return remaining.slice(0, end?.index ?? remaining.length).trim();
}

export function questionFingerprint(markdown: string) {
  const normalized = markdown.normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[^\p{L}\p{N}]+/gu, '');
  return createHash('sha256').update(normalized).digest('hex');
}

function safeDateTime(value: string | undefined) {
  if (!value) return null;
  const date = datePattern.test(value) ? new Date(`${value}T00:00:00+08:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('next_review_at 不是有效日期或时间');
  return date.toISOString();
}

function occurredAtDate(value: string) {
  const shanghaiDate = value === 'today'
    ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : value;
  return new Date(`${shanghaiDate}T00:00:00+08:00`).toISOString();
}

function parseOne(document: string, sourceName: string, documentIndex: number): ParsedImportQuestion {
  const frontMatter = document.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!frontMatter) throw new Error('缺少 YAML Front Matter，或起止分隔符格式不正确');

  let yaml: unknown;
  try {
    yaml = parseYaml(frontMatter[1]);
  } catch (error) {
    throw new Error(`YAML 无法解析：${error instanceof Error ? error.message : '未知错误'}`);
  }
  const parsed = frontMatterSchema.safeParse(yaml);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'Front Matter'}：${issue.message}`).join('；');
    throw new Error(message);
  }

  const markdown = document.slice(frontMatter[0].length).trim();
  const bodyMarkdown = section(markdown, '题目', 1);
  const wrongReason = section(markdown, '我的错因', 2);
  if (!bodyMarkdown) throw new Error('缺少必填区块“# 题目”或区块内容为空');
  if (!wrongReason) throw new Error('缺少必填区块“## 我的错因”或区块内容为空');

  const data = parsed.data;
  const fallbackTitle = bodyMarkdown
    .split('\n')
    .map((line) => line.replace(/[`*_>#|$]/g, '').trim())
    .find(Boolean)
    ?.slice(0, 100);
  const sourcePage = data.source?.page === undefined ? null : String(data.source.page);
  const sourceQuestionNumber = data.source?.question_number === undefined ? null : String(data.source.question_number);

  return {
    sourceName,
    documentIndex,
    schemaVersion: '1.0',
    externalId: data.external_id ?? null,
    title: data.title ?? fallbackTitle ?? data.external_id ?? `导入错题 ${documentIndex}`,
    book: data.book,
    chapterPath: data.chapter_path,
    questionType: questionTypes[data.question_type],
    sourcePage,
    sourceQuestionNumber,
    difficulty: data.difficulty,
    priority: priorityValues[data.priority],
    occurredAt: occurredAtDate(data.occurred_at),
    knowledgePoints: [...new Set(data.knowledge_points)],
    errorTypes: [...new Set(data.error_types)],
    tags: [...new Set(data.tags)],
    imageFiles: [...new Set(data.image_files)],
    nextReviewAt: safeDateTime(data.next_review_at),
    bodyMarkdown,
    wrongReason,
    reminder: section(markdown, '一句话提醒', 2) || null,
    reflection: section(markdown, '复盘备注', 2) || null,
    contentFingerprint: questionFingerprint(bodyMarkdown),
  };
}

export function parseMarkdownBatch(raw: string, sourceName = '粘贴内容') {
  const documents = splitDocuments(raw);
  const items: ParsedImportQuestion[] = [];
  const errors: ImportParseError[] = [];
  documents.forEach((document, index) => {
    try {
      items.push(parseOne(document, sourceName, index + 1));
    } catch (error) {
      errors.push({ sourceName, documentIndex: index + 1, message: error instanceof Error ? error.message : '解析失败' });
    }
  });
  return { items, errors, documentCount: documents.length };
}
