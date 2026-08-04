import Link from 'next/link';
import { ChevronLeft, ChevronRight, FileUp, Filter, Plus, Search } from 'lucide-react';
import { AttemptResult, Prisma, QuestionMaterialType, QuestionStatus, QuestionType } from '@prisma/client';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/mistake-atlas/ui';
import { QuestionList } from '@/components/mistake-atlas/question-list';
import { prisma } from '@/lib/prisma';
import { referenceSearchTerm } from '@/lib/question-reference';

type Query = {
  q?: string; status?: string; textbookId?: string; chapterId?: string; knowledgePointId?: string;
  errorTypeId?: string; materialType?: string; questionType?: string; priority?: string; difficulty?: string; review?: string;
  sort?: string; page?: string; deleted?: string;
};

const PAGE_SIZE = 50;

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

  const orderBy: Prisma.QuestionOrderByWithRelationInput[] = query.sort === 'OLDEST' ? [{ createdAt: 'asc' }]
    : query.sort === 'NEXT_REVIEW' ? [{ nextReviewAt: { sort: 'asc', nulls: 'last' } }, { priority: 'desc' }]
      : query.sort === 'LAST_ATTEMPT' ? [{ lastAttemptAt: { sort: 'desc', nulls: 'last' } }]
        : query.sort === 'MOST_ERRORS' ? [{ wrongCount: 'desc' }, { updatedAt: 'desc' }]
          : query.sort === 'STREAK' ? [{ correctStreak: 'desc' }, { updatedAt: 'desc' }]
            : query.sort === 'DIFFICULTY' ? [{ difficulty: 'desc' }, { updatedAt: 'desc' }]
              : query.sort === 'PRIORITY' ? [{ priority: 'desc' }, { updatedAt: 'desc' }]
                : [{ textbook: { sortOrder: 'asc' } }, { chapter: { sortOrder: 'asc' } }, { sourcePage: { sort: 'asc', nulls: 'last' } }, { sourceQuestionNumber: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }];

  const [questions, total, textbooks, chapters, points, errorTypes] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        textbook: true, chapter: true,
        knowledgePoints: { include: { knowledgePoint: true }, orderBy: { primary: 'desc' } },
        errorTypes: { include: { errorType: true }, orderBy: { primary: 'desc' } },
        attempts: { orderBy: [{ attemptedAt: 'desc' }, { createdAt: 'desc' }], take: 1, select: { result: true, attemptedAt: true } },
      },
      orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
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

  return <>
    <PageHeader eyebrow="Mathematics · Mistake library" title="数学错题库" description="按书本中的例与练习编号排列，书名用于区分不同资料中的同号题。" action={<div className="flex gap-2"><Link href="/questions/import" className="atlas-button-secondary"><FileUp className="size-4" />批量导入</Link><Link href="/questions/new" className="atlas-button-primary"><Plus className="size-4" />录入单题</Link></div>} />
    {query.deleted ? <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">错题已移入回收站，可随时恢复。</div> : null}
    <form className="atlas-card mb-5 grid gap-2 p-3 md:grid-cols-[minmax(280px,1fr)_150px_160px_auto]">
      <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={q} className="atlas-input pl-9" placeholder="搜索例 1.38、练习 1.1、书名或标题" /></label>
      <select name="materialType" defaultValue={materialType || ''} className="atlas-input"><option value="">例与练习</option><option value="EXAMPLE">只看书上例题</option><option value="EXERCISE">只看练习题</option></select>
      <select name="sort" defaultValue={query.sort || 'BOOK'} className="atlas-input"><option value="BOOK">按书本顺序</option><option value="NEWEST">最近新增</option><option value="OLDEST">最早新增</option><option value="NEXT_REVIEW">下次复习</option><option value="LAST_ATTEMPT">最近重做</option><option value="MOST_ERRORS">错误次数</option><option value="STREAK">连续正确</option><option value="DIFFICULTY">难度</option><option value="PRIORITY">优先级</option></select>
      <button className="atlas-button-primary"><Search className="size-4" />搜索</button>
      <details className="md:col-span-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-1 py-1 text-xs font-semibold text-slate-500 [&::-webkit-details-marker]:hidden"><Filter className="size-3.5" />详细筛选</summary>
        <div className="mt-2 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 xl:grid-cols-4">
          <select name="textbookId" defaultValue={query.textbookId || ''} className="atlas-input"><option value="">全部教材</option>{textbooks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select name="chapterId" defaultValue={query.chapterId || ''} className="atlas-input"><option value="">全部章节</option>{chapters.map((item) => <option key={item.id} value={item.id}>{item.textbook.name} / {item.name}</option>)}</select>
          <select name="knowledgePointId" defaultValue={query.knowledgePointId || ''} className="atlas-input"><option value="">全部知识点</option>{points.map((item) => <option key={item.id} value={item.id}>{item.chapter.name} / {item.name}</option>)}</select>
          <select name="errorTypeId" defaultValue={query.errorTypeId || ''} className="atlas-input"><option value="">全部错误类型</option>{errorTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select name="questionType" defaultValue={questionType || ''} className="atlas-input"><option value="">全部题型</option><option value="SINGLE_CHOICE">单选题</option><option value="MULTIPLE_CHOICE">多选题</option><option value="FILL_BLANK">填空题</option><option value="CALCULATION">计算题</option><option value="PROOF">证明题</option><option value="TRUE_FALSE">判断题</option><option value="COMPREHENSIVE">综合题</option><option value="OTHER">其他</option></select>
          <select name="status" defaultValue={status || ''} className="atlas-input"><option value="">全部有效状态</option><option value="ACTIVE">学习中</option><option value="MASTERED">已掌握</option><option value="ARCHIVED">已归档</option></select>
          <select name="review" defaultValue={query.review || ''} className="atlas-input"><option value="">全部复习安排</option><option value="OVERDUE">已逾期</option><option value="DUE_TODAY">今日待复习</option><option value="UNSCHEDULED">未安排复习</option></select>
          <select name="priority" defaultValue={priority || ''} className="atlas-input"><option value="">全部优先级</option><option value="4">紧急</option><option value="3">高</option><option value="2">普通</option><option value="1">低</option></select>
          <select name="difficulty" defaultValue={difficulty || ''} className="atlas-input"><option value="">全部难度</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>难度 {value}</option>)}</select>
        </div>
      </details>
    </form>
    <div className="mb-3 flex items-center justify-between text-xs text-slate-500"><span>共 {total} 道 · 第 {safePage}/{pageCount} 页</span>{Object.values(query).some(Boolean) ? <Link href="/questions" className="font-semibold text-blue-700">清除筛选</Link> : null}</div>
    <QuestionList questions={questions.map((question) => ({ ...question, latestResultLabel: question.attempts[0] ? resultLabels[question.attempts[0].result] : null, latestAttemptAt: question.attempts[0]?.attemptedAt ?? null }))} />
    {pageCount > 1 ? <nav className="mt-5 flex items-center justify-center gap-3"><Link aria-disabled={safePage <= 1} href={safePage > 1 ? pageHref(query, safePage - 1) : '#'} className={`atlas-button-secondary ${safePage <= 1 ? 'pointer-events-none opacity-40' : ''}`}><ChevronLeft className="size-4" />上一页</Link><span className="text-xs text-slate-500">{safePage} / {pageCount}</span><Link aria-disabled={safePage >= pageCount} href={safePage < pageCount ? pageHref(query, safePage + 1) : '#'} className={`atlas-button-secondary ${safePage >= pageCount ? 'pointer-events-none opacity-40' : ''}`}>下一页<ChevronRight className="size-4" /></Link></nav> : null}
  </>;
}
