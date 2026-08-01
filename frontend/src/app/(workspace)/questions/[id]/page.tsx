import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CalendarClock, Check, ImageIcon, Pencil, RotateCcw, X } from 'lucide-react';
import { notFound } from 'next/navigation';
import { deleteQuestionAction, recordAttemptAction } from '@/app/actions/math-actions';
import { DangerSubmit } from '@/components/mistake-atlas/danger-submit';
import { MarkdownContent } from '@/components/mistake-atlas/markdown-content';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

const resultLabels: Record<string, string> = {
  INDEPENDENT_CORRECT: '独立做对', HINTED_CORRECT: '提示后做对', UNDERSTOOD_AFTER_REVIEW: '看答案后理解', WRONG: '做错', UNABLE: '完全不会', SKIPPED: '本次跳过',
};

export default async function QuestionDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; updated?: string; attempt?: string }> }) {
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const question = await prisma.question.findUnique({
    where: { id },
    include: { textbook: true, chapter: true, knowledgePoints: { include: { knowledgePoint: true } }, errorTypes: { include: { errorType: true } }, attempts: { orderBy: { attemptedAt: 'desc' } }, attachments: true },
  });
  if (!question || question.status === 'DELETED') notFound();
  const attemptAction = recordAttemptAction.bind(null, question.id);
  const deleteAction = deleteQuestionAction.bind(null, question.id);
  return <>
    <PageHeader eyebrow={question.code} title={question.title} description={`${question.textbook.name} / ${question.chapter.name}`} action={<div className="flex flex-wrap gap-2"><Link href="/questions" className="atlas-button-secondary"><ArrowLeft className="size-4" />返回</Link><Link href={`/questions/${question.id}/edit`} className="atlas-button-secondary"><Pencil className="size-4" />编辑</Link><form action={deleteAction}><DangerSubmit label="移入回收站" confirmText="确定把这道错题移入回收站吗？历史重做记录会保留。" /></form></div>} />
    {notice.created || notice.updated || notice.attempt ? <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice.attempt ? '重做结果已保存，掌握状态已重新计算。' : '错题已经保存。'}</div> : null}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <article className="space-y-5">
        <div className="atlas-card p-6 sm:p-8">
          <div className="flex flex-wrap gap-2"><StatusPill tone={question.status === 'MASTERED' ? 'green' : question.wrongCount >= 3 ? 'red' : 'blue'}>{question.status === 'MASTERED' ? '已掌握' : question.wrongCount >= 3 ? '反复错误' : '学习中'}</StatusPill>{question.errorTypes.map(({ errorType }) => <StatusPill key={errorType.id}>{errorType.name}</StatusPill>)}<StatusPill>{['', '普通', '较高', '紧急'][question.priority]}优先级</StatusPill></div>
          <div className="paper-grid mt-6 rounded-xl border border-slate-200 p-6 sm:p-8"><MarkdownContent>{question.bodyMarkdown}</MarkdownContent></div>
          {question.attachments.length ? <section className="mt-7"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ImageIcon className="size-4" />原题图片</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{question.attachments.map((file) => <a key={file.id} href={`/api/attachments/${file.id}`} target="_blank" rel="noreferrer"><Image src={`/api/attachments/${file.id}`} alt={file.originalName} width={1200} height={800} unoptimized className="max-h-80 w-full rounded-xl border border-slate-200 object-contain" /></a>)}</div></section> : null}
          <section className="mt-7"><h2 className="text-sm font-semibold text-slate-900">我的错因</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{question.wrongReason}</p></section>
          {question.reflection ? <section className="mt-6"><h2 className="text-sm font-semibold text-slate-900">复盘总结</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{question.reflection}</p></section> : null}
          {question.reminder ? <section className="mt-6 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-5"><div className="text-xs font-semibold text-blue-700">一句话提醒</div><p className="mt-2 text-sm leading-6 text-blue-900">{question.reminder}</p></section> : null}
          <div className="mt-6 flex flex-wrap gap-2">{question.knowledgePoints.map(({ knowledgePoint }) => <StatusPill key={knowledgePoint.id} tone="blue">{knowledgePoint.name}</StatusPill>)}{question.tags.map((tag) => <StatusPill key={tag}>#{tag}</StatusPill>)}</div>
        </div>
      </article>

      <aside className="space-y-5">
        <div className="atlas-card p-6"><h2 className="font-semibold text-slate-900">掌握进度</h2><div className="mt-5 flex gap-2">{[0, 1, 2].map((step) => <div key={step} className={`h-2 flex-1 rounded-full ${step < question.correctStreak ? 'bg-[var(--atlas-blue)]' : 'bg-slate-100'}`} />)}</div><div className="mt-3 flex justify-between text-xs"><span className="text-slate-400">连续独立做对</span><strong>{question.correctStreak} / 3</strong></div><div className="mt-3 text-xs text-slate-500">累计重做 {question.attemptCount} 次，做错/不会 {question.wrongCount} 次。</div></div>
        <form action={attemptAction} className="atlas-card p-6"><h2 className="flex items-center gap-2 font-semibold text-slate-900"><RotateCcw className="size-4" />记录一次重做</h2><div className="mt-5 space-y-4"><label><span className="atlas-label">本次结果 *</span><select name="result" className="atlas-input" required defaultValue="INDEPENDENT_CORRECT">{Object.entries(resultLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="atlas-label">耗时（分钟，可选）</span><input name="durationMinutes" type="number" min="0" step="0.5" className="atlas-input" /></label><label><span className="atlas-label">下次复习</span><input name="nextReviewAt" type="datetime-local" className="atlas-input" /></label><label><span className="atlas-label">本次备注</span><textarea name="note" className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[var(--atlas-blue)]" /></label><button className="atlas-button-primary w-full">保存并重新计算</button></div></form>
        <div className="atlas-card p-6"><h2 className="font-semibold text-slate-900">重做轨迹</h2>{question.attempts.length ? <div className="mt-5 space-y-5">{question.attempts.map((attempt) => { const correct = attempt.result === 'INDEPENDENT_CORRECT'; return <div key={attempt.id} className="flex gap-3"><div className={`grid size-8 shrink-0 place-items-center rounded-full ${correct ? 'bg-emerald-50 text-emerald-700' : attempt.result === 'SKIPPED' ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-700'}`}>{correct ? <Check className="size-4" /> : <X className="size-4" />}</div><div><div className="text-sm font-medium text-slate-700">{resultLabels[attempt.result]}</div><div className="mt-1 text-xs text-slate-400">{attempt.attemptedAt.toLocaleString('zh-CN')}</div>{attempt.note ? <div className="mt-1 text-xs leading-5 text-slate-500">{attempt.note}</div> : null}</div></div>; })}</div> : <p className="mt-4 text-xs text-slate-400">还没有重做记录。</p>}</div>
        <div className="atlas-card p-6"><div className="flex gap-3"><CalendarClock className="size-5 text-slate-400" /><div><div className="text-xs text-slate-400">下次复习</div><div className="mt-1 font-semibold text-slate-800">{question.nextReviewAt ? question.nextReviewAt.toLocaleString('zh-CN') : '未安排'}</div></div></div></div>
      </aside>
    </div>
  </>;
}
