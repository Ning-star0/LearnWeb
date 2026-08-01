import { z } from 'zod';

const id = z.string().min(1).max(128);
const nullableText = z.string().max(200_000).nullable();
const date = z.string().refine((value) => Number.isFinite(Date.parse(value)), '日期时间格式无效');
const nullableDate = date.nullable();

const knowledgePointSchema = z.object({
  id, chapterId: id, name: z.string().min(1).max(200), description: nullableText, active: z.boolean(),
}).passthrough();

const chapterSchema = z.object({
  id, textbookId: id, parentId: id.nullable(), name: z.string().min(1).max(200),
  sortOrder: z.number().int(), active: z.boolean(), knowledgePoints: z.array(knowledgePointSchema).max(20_000),
}).passthrough();

const textbookSchema = z.object({
  id, subjectId: id, name: z.string().min(1).max(200), description: nullableText,
  sortOrder: z.number().int(), active: z.boolean(), chapters: z.array(chapterSchema).max(20_000),
}).passthrough();

const errorTypeSchema = z.object({
  id, subjectId: id, name: z.string().min(1).max(200), description: nullableText,
  color: z.string().max(50), active: z.boolean(),
}).passthrough();

const subjectSchema = z.object({
  id, slug: z.string().min(1).max(100), name: z.string().min(1).max(100), shortName: z.string().min(1).max(100),
  description: nullableText, icon: z.string().max(100), color: z.string().max(30), enabled: z.boolean(), sortOrder: z.number().int(),
  textbooks: z.array(textbookSchema).max(1_000), errorTypes: z.array(errorTypeSchema).max(2_000),
}).passthrough();

const attemptSchema = z.object({
  id: id.optional(), questionId: id.optional(),
  result: z.enum(['INDEPENDENT_CORRECT', 'HINTED_CORRECT', 'UNDERSTOOD_AFTER_REVIEW', 'WRONG', 'UNABLE', 'SKIPPED']),
  attemptedAt: date, durationSeconds: z.number().int().min(0).max(86_400).nullable(), confidence: z.number().int().min(1).max(5).nullable(),
  errorReason: nullableText, note: nullableText, nextReviewAt: nullableDate,
  source: z.enum(['MANUAL', 'IMPORT', 'AI']).default('IMPORT'), createdAt: date.optional(),
}).passthrough();

const questionSchema = z.object({
  id, code: z.string().min(1).max(100), externalId: z.string().max(200).nullable(), contentFingerprint: z.string().max(128).nullable(),
  subjectId: id, textbookId: id, chapterId: id, title: z.string().min(1).max(500),
  bodyMarkdown: z.string().min(1).max(200_000), wrongReason: z.string().min(1).max(100_000), reflection: nullableText, reminder: nullableText,
  sourcePage: z.string().max(100).nullable(), sourceQuestionNumber: z.string().max(100).nullable(), tags: z.array(z.string().min(1).max(100)).max(100),
  questionType: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'FILL_BLANK', 'CALCULATION', 'PROOF', 'TRUE_FALSE', 'COMPREHENSIVE', 'OTHER']),
  difficulty: z.number().int().min(1).max(5), priority: z.number().int().min(1).max(4),
  status: z.enum(['ACTIVE', 'MASTERED', 'ARCHIVED', 'DELETED']), masteryOverride: z.enum(['FORCE_MASTERED', 'FORCE_ACTIVE']).nullable().optional(),
  manuallyMastered: z.boolean().optional(), archivedAt: nullableDate.optional(), deletedAt: nullableDate.optional(), occurredAt: date,
  nextReviewAt: nullableDate, masteredAt: nullableDate.optional(),
  knowledgePoints: z.array(z.object({ knowledgePointId: id, primary: z.boolean() }).passthrough()).max(1_000),
  errorTypes: z.array(z.object({ errorTypeId: id, primary: z.boolean() }).passthrough()).max(1_000),
  attempts: z.array(attemptSchema).max(100_000),
  attachments: z.array(z.object({ id: id.optional(), originalName: z.string(), mimeType: z.string(), size: z.number().int(), sha256: z.string() }).passthrough()).max(50_000),
}).passthrough();

const siteSettingsSchema = z.object({
  siteName: z.string().min(1).max(100), siteSubtitle: z.string().max(200), siteDescription: z.string().max(500),
  accessTitle: z.string().max(200), accessDescription: z.string().max(500), homeGreeting: z.string().max(200),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
}).passthrough().nullable();

const learningSettingsSchema = z.object({
  masteryThreshold: z.number().int().min(1).max(10), repeatedErrorThreshold: z.number().int().min(1).max(100),
  reviewIntervals: z.array(z.number().int().min(1).max(3650)).min(1).max(20), timezone: z.string().min(1).max(100),
}).passthrough().nullable();

const exportSchema = z.object({
  version: z.literal(1), exportedAt: date, subjects: z.array(subjectSchema).min(1).max(20),
  questions: z.array(questionSchema).max(10_000), siteSettings: siteSettingsSchema, learningSettings: learningSettingsSchema,
}).strict();

export type FullJsonExport = z.infer<typeof exportSchema>;

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`${label}包含重复 ID。`);
}

export function parseFullJsonExport(raw: string): FullJsonExport {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('JSON 文件不是有效的 JSON。'); }
  const parsed = exportSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`JSON 结构校验失败：${issue.path.join('.') || '根节点'} ${issue.message}`);
  }
  const data = parsed.data;
  const subjects = new Map(data.subjects.map((item) => [item.id, item]));
  const textbooks = data.subjects.flatMap((item) => item.textbooks);
  const chapters = textbooks.flatMap((item) => item.chapters);
  const points = chapters.flatMap((item) => item.knowledgePoints);
  const errorTypes = data.subjects.flatMap((item) => item.errorTypes);
  unique([...subjects.keys()], '学科'); unique(textbooks.map((item) => item.id), '教材'); unique(chapters.map((item) => item.id), '章节');
  unique(points.map((item) => item.id), '知识点'); unique(errorTypes.map((item) => item.id), '错误类型'); unique(data.questions.map((item) => item.id), '题目');
  const textbookById = new Map(textbooks.map((item) => [item.id, item]));
  const chapterById = new Map(chapters.map((item) => [item.id, item]));
  const pointIds = new Set(points.map((item) => item.id));
  const errorIds = new Set(errorTypes.map((item) => item.id));
  for (const textbook of textbooks) if (!subjects.has(textbook.subjectId)) throw new Error(`教材 ${textbook.name} 引用了不存在的学科。`);
  for (const chapter of chapters) {
    const textbook = textbookById.get(chapter.textbookId);
    if (!textbook) throw new Error(`章节 ${chapter.name} 引用了不存在的教材。`);
    if (chapter.parentId && chapterById.get(chapter.parentId)?.textbookId !== chapter.textbookId) throw new Error(`章节 ${chapter.name} 的父章节无效。`);
    const seen = new Set<string>(); let current = chapter;
    while (current.parentId) {
      if (seen.has(current.id)) throw new Error(`章节 ${chapter.name} 存在循环父子关系。`);
      seen.add(current.id); const parent = chapterById.get(current.parentId); if (!parent) break; current = parent;
    }
  }
  for (const point of points) if (!chapterById.has(point.chapterId)) throw new Error(`知识点 ${point.name} 引用了不存在的章节。`);
  for (const item of errorTypes) if (!subjects.has(item.subjectId)) throw new Error(`错误类型 ${item.name} 引用了不存在的学科。`);
  const questionIds = new Set(data.questions.map((item) => item.id));
  for (const question of data.questions) {
    const textbook = textbookById.get(question.textbookId); const chapter = chapterById.get(question.chapterId);
    if (!subjects.has(question.subjectId) || textbook?.subjectId !== question.subjectId || chapter?.textbookId !== question.textbookId) throw new Error(`题目 ${question.code} 的学科、教材或章节引用无效。`);
    if (question.knowledgePoints.some((item) => !pointIds.has(item.knowledgePointId))) throw new Error(`题目 ${question.code} 引用了不存在的知识点。`);
    if (question.errorTypes.some((item) => !errorIds.has(item.errorTypeId))) throw new Error(`题目 ${question.code} 引用了不存在的错误类型。`);
    if (question.attempts.some((item) => item.questionId && (!questionIds.has(item.questionId) || item.questionId !== question.id))) throw new Error(`题目 ${question.code} 的重做记录引用无效。`);
  }
  const attemptCount = data.questions.reduce((sum, item) => sum + item.attempts.length, 0);
  if (attemptCount > 100_000) throw new Error('JSON 中的重做记录超过 100,000 条限制。');
  return data;
}
