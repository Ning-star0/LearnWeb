import Image from 'next/image';
import Link from 'next/link';
import { AttemptResult } from '@prisma/client';
import { ArrowLeft, Check, ImageIcon, SlidersHorizontal, X } from 'lucide-react';
import { notFound } from 'next/navigation';
import { recordQuickAttemptAction } from '@/app/actions/math-actions';
import { MarkdownContent } from '@/components/mistake-atlas/markdown-content';
import { practicePrompt } from '@/lib/practice-prompt';
import { prisma } from '@/lib/prisma';
import { questionReference } from '@/lib/question-reference';

function todayLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  }).format(new Date());
}

export default async function PracticeQuestionPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string; result?: string; from?: string; to?: string }>;
}) {
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const question = await prisma.question.findUnique({
    where: { id },
    include: { textbook: true, chapter: true, knowledgePoints: { include: { knowledgePoint: true }, orderBy: { primary: 'desc' } }, attachments: { where: { deletedAt: null } } },
  });
  if (!question || question.status === 'DELETED') notFound();

  const prompt = practicePrompt(question.bodyMarkdown);
  const reference = questionReference(question);
  const correctAction = recordQuickAttemptAction.bind(null, question.id, AttemptResult.INDEPENDENT_CORRECT);
  const wrongAction = recordQuickAttemptAction.bind(null, question.id, AttemptResult.WRONG);
  const canRecord = question.status === 'ACTIVE' || question.status === 'MASTERED';

  return <div className="mx-auto min-h-[calc(100vh-3rem)] max-w-5xl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-4">
      <Link href="/questions" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"><ArrowLeft className="size-4" />返回错题库</Link>
      <div className="text-xs text-slate-400">本次重做 · {todayLabel()}</div>
      <Link href={`/questions/${question.id}/details`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"><SlidersHorizontal className="size-4" />题目详情</Link>
    </header>

    {notice.attempt ? <div className={`mx-auto mt-5 max-w-2xl rounded-xl px-4 py-3 text-center text-sm font-medium ${notice.result === 'correct' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{notice.result === 'correct' ? '已记录：这次做对了。' : '已记录：这次做错了。'} 重做时间为当前日期。</div> : null}

    <main className="mx-auto mt-10 max-w-3xl">
      <div className="text-center">
        <div className="text-xs text-slate-400">{question.textbook.name} / {question.chapter.name}{reference.page ? ` · ${reference.page}` : ''}</div>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{reference.primary}</h1>
        <p className="mt-2 text-sm text-slate-500">{question.title}</p>
        {question.knowledgePoints.length ? <div className="mt-4 flex flex-wrap justify-center gap-2"><span className="py-1 text-[11px] text-slate-400">知识点</span>{question.knowledgePoints.map(({ knowledgePoint }) => <span key={knowledgePoint.id} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">{knowledgePoint.name}</span>)}</div> : null}
      </div>

      <article className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        {prompt ? <MarkdownContent>{prompt}</MarkdownContent> : <p className="text-center text-sm text-slate-400">题干为空，请进入题目详情编辑。</p>}
        {question.attachments.length ? <section className="mt-8 border-t border-slate-100 pt-6"><div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400"><ImageIcon className="size-4" />原题图片</div><div className="grid gap-4 sm:grid-cols-2">{question.attachments.map((file) => <Image key={file.id} src={`/api/attachments/${file.id}`} alt={file.originalName} width={file.width || 1200} height={file.height || 900} className="h-auto w-full rounded-xl border border-slate-200 object-contain" />)}</div></section> : null}
      </article>
    </main>

    <div className="sticky bottom-0 z-20 mt-10 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-xl gap-3">
        {canRecord ? <>
          <form action={wrongAction} className="flex-1"><button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white font-semibold text-rose-600 transition hover:bg-rose-50"><X className="size-5" />做错了</button></form>
          <form action={correctAction} className="flex-1"><button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white shadow-sm transition hover:bg-emerald-700"><Check className="size-5" />做对了</button></form>
        </> : <div className="w-full rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-500">这道题已归档；如需继续重做，请先到题目详情取消归档。</div>}
      </div>
    </div>
  </div>;
}
