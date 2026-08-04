import Link from 'next/link';
import { ChevronLeft, ChevronRight, FileUp, Filter, Plus, Search } from 'lucide-react';
import { AttemptResult, Prisma, QuestionMaterialType, QuestionStatus, QuestionType } from '@prisma/client';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/mistake-atlas/ui';
import { QuestionList } from '@/components/mistake-atlas/question-list';
import { QuestionFilterSelect } from '@/components/mistake-atlas/question-filter-select';
import { prisma } from '@/lib/prisma';
import { compareBookQuestions } from '@/lib/question-order';
import { referenceSearchTerm } from '@/lib/question-reference';

type Query = {
  q?: string; status?: string; textbookId?: string; chapterId?: string; knowledgePointId?: string;
  errorTypeId?: string; materialType?: string; questionType?: string; priority?: string; difficulty?: string; review?: string;
  sort?: string; page?: string; deleted?: string;
};

const PAGE_SIZE = 50;

const materialTypeOptions = [
  { value: '', label: '全部', description: '例题和练习题' },
  { value: 'EXAMPLE', label: '例题', description: '书上讲解例题' },
  { value: 'EXERCISE', label: '练习题', description: '课后题与习题册' },
];

const sortOptions = [
  { value: 'BOOK', label: '按书本顺序', description: '按资料、出处类型和题号排列' },
  { value: 'NEWEST', label: '最近新增' },
  { value: 'OLDEST', label: '最早新增' },
  { value: 'NEXT_REVIEW', label: '下次复习' },
  { value: 'LAST_ATTEMPT', label: '最近重做' },
  { value: 'MOST_ERRORS', label: '错误次数' },
  { value: 'STREAK', label: '连续正确' },
  { value: 'DIFFICULTY', label: '难度' },
  { value: 'PRIORITY', label: '优先级' },
];

const questionTypeOptions = [
  { value: '', label: '全部题型' },
  { value: 'SINGLE_CHOICE', label: '单选题' },
  { value: 'MULTIPLE_CHOICE', label: '多选题' },
  { value: 'FILL_BLANK', label: '填空题' },
  { value: 'CALCULATION', label: '计算题' },
  { value: 'PROOF', label: '证明题' },
  { value: 'TRUE_FALSE', label: '判断题' },
  { value: 'COMPREHENSIVE', label: '综合题' },
  { value: 'OTHER', label: '其他' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'ACTIVE', label: '学习中' },
  { value: 'MASTERED', label: '已掌握' },
  { value: 'ARCHIVED', label: '已归档' },
];

const reviewOptions = [
  { value: '', label: '全部复习安排' },
  { value: 'OVERDUE', label: '已逾期' },
  { value: 'DUE_TODAY', label: '今日待复习' },
  { value: 'UNSCHEDULED', label: '未安排复习' },
];

const priorityOptions = [
  { value: '', label: '全部优先级' },
  { value: '4', label: '紧急' },
  { value: '3', label: '高' },
  { value: '2', label: '普通' },
  { value: '1', label: '低' },
];

const difficultyOptions = [
  { value: '', label: '全部难度' },
  ...[1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: `难度 ${value}` })),
];

function integer(value: string | undefined, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

function pageHref(query: Query, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, page: String(page) })) if (value) params.set(key, value);
  return `/questions?${params.toString()}`;
}

const resultLabels: Record<AttemptResult, string> = {
  INDEPENDENT_CORRECT: '独立做对', HINTED_CORRECT: '提示后做对', UNDERSTOOD_AFTER_REVIEW: '看答案后理解',
  WRONG: '做错', UNABLE: '完全不会', SKIPPED: '跳过',
};

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const q = query.q?.trim() || '';
  const bookNumberQuery = referenceSearchTerm(q);
  const page = integer(query.page, 1, 100_000) ?? 1;
  const priority = integer(query.priority, 1, 4);
  const difficulty = integer(query.difficulty, 1, 5);
  const status = query.status && Object.values(QuestionStatus).includes(query.status as QuestionStatus) ? query.status as QuestionStatus : undefined;
  const questionType = query.questionType && Object.values(QuestionType).includes(query.questionType as QuestionType) ? query.questionType as QuestionType : undefined;
  const materialType = query.materialType && Object.values(QuestionMaterialType).includes(query.materialType as QuestionMaterialType) ? query.materialType as QuestionMaterialType : undefined;
  const now = new Date();
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);

  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const where: Prisma.QuestionWhereInput = {
    subjectId: math.id,
    status: status ?? { not: 'DELETED' },
    ...(query.textbookId ? { textbookId: query.textbookId } : {}),
    ...(query.chapterId ? { chapterId: query.chapterId } : {}),
    ...(query.knowledgePointId ? { knowledgePoints: { some: { knowledgePointId: query.knowledgePointId } } } : {}),
    ...(query.errorTypeId ? { errorTypes: { some: { errorTypeId: query.errorTypeId } } } : {}),
    ...(materialType ? { materialType } : {}),
    ...(questionType ? { questionType } : {}),
    ...(priority ? { priority } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(query.review === 'OVERDUE' ? { nextReviewAt: { lt: now }, status: QuestionStatus.ACTIVE } : {}),
    ...(query.review === 'DUE_TODAY' ? { nextReviewAt: { gte: now, lte: endOfToday }, status: QuestionStatus.ACTIVE } : {}),
    ...(query.review === 'UNSCHEDULED' ? { nextReviewAt: null } : {}),
    ...(q ? { OR: [
      { title: { contains: q, mode: 'insensitive' } }, { bodyMarkdown: { contains: q, mode: 'insensitive' } },
      { wrongReason: { contains: q, mode: 'insensitive' } }, { reflection: { contains: q, mode: 'insensitive' } },
      { sourcePage: { contains: q, mode: 'insensitive' } }, { sourceQuestionNumber: { contains: q, mode: 'insensitive' } },
      ...(bookNumberQuery && bookNumberQuery !== q ? [{ sourceQuestionNumber: { contains: bookNumberQuery, mode: Prisma.QueryMode.insensitive } }] : []),
      { tags: { has: q } }, { textbook: { name: { contains: q, mode: 'insensitive' } } },
      { chapter: { name: { contains: q, mode: 'insensitive' } } },
      { knowledgePoints: { some: { knowledgePoint: { name: { contains: q, mode: 'insensitive' } } } } },
      { errorTypes: { some: { errorType: { name: { contains: q, mode: 'insensitive' } } } } },
    ] } : {}),
  };

  const bookOrder = !query.sort || query.sort === 'BOOK';
  const orderBy: Prisma.QuestionOrderByWithRelationInput[] = query.sort === 'OLDEST' ? [{ createdAt: 'asc' }]
    : query.sort === 'NEXT_REVIEW' ? [{ nextReviewAt: { sort: 'asc', nulls: 'last' } }, { priority: 'desc' }]
      : query.sort === 'LAST_ATTEMPT' ? [{ lastAttemptAt: { sort: 'desc', nulls: 'last' } }]
        : query.sort === 'MOST_ERRORS' ? [{ wrongCount: 'desc' }, { updatedAt: 'desc' }]
          : query.sort === 'STREAK' ? [{ correctStreak: 'desc' }, { updatedAt: 'desc' }]
            : query.sort === 'DIFFICULTY' ? [{ difficulty: 'desc' }, { updatedAt: 'desc' }]
              : query.sort === 'PRIORITY' ? [{ priority: 'desc' }, { updatedAt: 'desc' }]
                : [{ createdAt: 'asc' }];

  const [questions, total, textbooks, chapters, points, errorTypes] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        textbook: true, chapter: true,
        knowledgePoints: { include: { knowledgePoint: true }, orderBy: { primary: 'desc' } },
        errorTypes: { include: { errorType: true }, orderBy: { primary: 'desc' } },
        attempts: { orderBy: [{ attemptedAt: 'desc' }, { createdAt: 'desc' }], take: 1, select: { result: true, attemptedAt: true } },
      },
      orderBy,
      ...(bookOrder ? {} : { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    }),
    prisma.question.count({ where }),
    prisma.textbook.findMany({ where: { subjectId: math.id, active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.chapter.findMany({ where: { textbook: { subjectId: math.id }, active: true }, include: { textbook: true }, orderBy: [{ textbookId: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.knowledgePoint.findMany({ where: { chapter: { textbook: { subjectId: math.id } }, active: true }, include: { chapter: true }, orderBy: { name: 'asc' } }),
    prisma.errorType.findMany({ where: { subjectId: math.id, active: true }, orderBy: { name: 'asc' } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pageCount) redirect(pageHref(query, pageCount));
  const safePage = page;
  const visibleQuestions = bookOrder
    ? [...questions].sort(compareBookQuestions).slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : questions;

  return <>
    <PageHeader eyebrow="Mathematics · Mistake library" title="数学错题库" description="按书本中的例与练习编号排列，书名用于区分不同资料中的同号题。" action={<div className="flex gap-2"><Link href="/questions/import" className="atlas-button-secondary"><FileUp className="size-4" />批量导入</Link><Link href="/questions/new" className="atlas-button-primary"><Plus className="size-4" />录入单题</Link></div>} />
    {query.deleted ? <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">错题已移入回收站，可随时恢复。</div> : null}
    <form className="atlas-card mb-5 grid gap-2 p-3 md:grid-cols-[minmax(280px,1fr)_180px_160px_auto]">
      <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={q} className="atlas-input pl-9" placeholder="搜索例 1.38、练习 1.1、书名或标题" /></label>
      <QuestionFilterSelect name="materialType" label="题目类型" value={materialType || ''} options={materialTypeOptions} icon="type" />
      <QuestionFilterSelect name="sort" label="排序方式" value={query.sort || 'BOOK'} options={sortOptions} icon="sort" />
      <button className="atlas-button-primary"><Search className="size-4" />搜索</button>
      <details className="md:col-span-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-1 py-1 text-xs font-semibold text-slate-500 [&::-webkit-details-marker]:hidden"><Filter className="size-3.5" />详细筛选</summary>
        <div className="mt-2 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuestionFilterSelect name="textbookId" label="教材" value={query.textbookId || ''} icon="book" options={[{ value: '', label: '全部教材' }, ...textbooks.map((item) => ({ value: item.id, label: item.name }))]} />
          <QuestionFilterSelect name="chapterId" label="章节" value={query.chapterId || ''} icon="chapter" options={[{ value: '', label: '全部章节' }, ...chapters.map((item) => ({ value: item.id, label: `${item.textbook.name} / ${item.name}` }))]} />
          <QuestionFilterSelect name="knowledgePointId" label="知识点" value={query.knowledgePointId || ''} icon="knowledge" options={[{ value: '', label: '全部知识点' }, ...points.map((item) => ({ value: item.id, label: `${item.chapter.name} / ${item.name}` }))]} />
          <QuestionFilterSelect name="errorTypeId" label="错误类型" value={query.errorTypeId || ''} icon="error" options={[{ value: '', label: '全部错误类型' }, ...errorTypes.map((item) => ({ value: item.id, label: item.name }))]} />
          <QuestionFilterSelect name="questionType" label="题型" value={questionType || ''} options={questionTypeOptions} icon="type" />
          <QuestionFilterSelect name="status" label="掌握状态" value={status || ''} options={statusOptions} icon="status" />
          <QuestionFilterSelect name="review" label="复习安排" value={query.review || ''} options={reviewOptions} icon="review" />
          <QuestionFilterSelect name="priority" label="优先级" value={priority ? String(priority) : ''} options={priorityOptions} icon="priority" />
          <QuestionFilterSelect name="difficulty" label="难度" value={difficulty ? String(difficulty) : ''} options={difficultyOptions} icon="difficulty" />
        </div>
      </details>
    </form>
    <div className="mb-3 flex items-center justify-between text-xs text-slate-500"><span>共 {total} 道 · 第 {safePage}/{pageCount} 页</span>{Object.values(query).some(Boolean) ? <Link href="/questions" className="font-semibold text-blue-700">清除筛选</Link> : null}</div>
    <QuestionList questions={visibleQuestions.map((question) => ({ ...question, latestResultLabel: question.attempts[0] ? resultLabels[question.attempts[0].result] : null, latestAttemptAt: question.attempts[0]?.attemptedAt ?? null }))} />
    {pageCount > 1 ? <nav className="mt-5 flex items-center justify-center gap-3"><Link aria-disabled={safePage <= 1} href={safePage > 1 ? pageHref(query, safePage - 1) : '#'} className={`atlas-button-secondary ${safePage <= 1 ? 'pointer-events-none opacity-40' : ''}`}><ChevronLeft className="size-4" />上一页</Link><span className="text-xs text-slate-500">{safePage} / {pageCount}</span><Link aria-disabled={safePage >= pageCount} href={safePage < pageCount ? pageHref(query, safePage + 1) : '#'} className={`atlas-button-secondary ${safePage >= pageCount ? 'pointer-events-none opacity-40' : ''}`}>下一页<ChevronRight className="size-4" /></Link></nav> : null}
  </>;
}
