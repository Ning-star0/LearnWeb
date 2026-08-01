import Image from 'next/image';
import Link from 'next/link';
import { Attempt, AttemptResult, AttemptSource, MasteryOverride } from '@prisma/client';
import { Archive, ArchiveRestore, ArrowLeft, Award, CalendarClock, Check, ImageIcon, Pencil, RotateCcw, Settings2, X } from 'lucide-react';
import { notFound } from 'next/navigation';
import {
  deleteAttemptAction,
  deleteQuestionAction,
  recordAttemptAction,
  setMasteryOverrideAction,
  setQuestionArchivedAction,
  updateAttemptAction,
} from '@/app/actions/math-actions';
import { DangerSubmit } from '@/components/mistake-atlas/danger-submit';
import { MarkdownContent } from '@/components/mistake-atlas/markdown-content';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

const resultLabels: Record<AttemptResult, string> = {
  INDEPENDENT_CORRECT: '独立做对',
  HINTED_CORRECT: '提示后做对',
  UNDERSTOOD_AFTER_REVIEW: '看答案后理解',
  WRONG: '做错',
  UNABLE: '完全不会',
  SKIPPED: '本次跳过',
};

const sourceLabels: Record<AttemptSource, string> = { MANUAL: '手动', IMPORT: '导入', AI: 'AI 辅助' };

function localDateTimeValue(date: Date | null) {
  if (!date) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date).replace(' ', 'T');
}

function displayDate(date: Date) {
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function noticeText(notice: Record<string, string | undefined>) {
  if (notice.attempt) {
    const change = notice.from !== undefined && notice.to !== undefined ? `连续独立做对 ${notice.from} → ${notice.to}。` : '';
    const state = notice.statusChanged ? '题目掌握状态也已更新。' : '';
    return `重做结果已保存。${change}${state}`;
  }
  if (notice.attemptUpdated) return '重做记录已修改，所有派生统计已重新计算。';
  if (notice.attemptDeleted) return '误录的重做记录已删除，所有派生统计已重新计算。';
  if (notice.masteryChanged) return '人工掌握设置已更新。';
  if (notice.archiveChanged) return '归档状态已更新。';
  if (notice.created || notice.updated) return '错题已经保存。';
  return null;
}

function AttemptFields({ attempt }: { attempt?: Attempt }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <label><span className="atlas-label">重做时间 *</span><input name="attemptedAt" type="datetime-local" required className="atlas-input" defaultValue={localDateTimeValue(attempt?.attemptedAt ?? new Date())} /></label>
    <label><span className="atlas-label">本次结果 *</span><select name="result" className="atlas-input" required defaultValue={attempt?.result ?? AttemptResult.INDEPENDENT_CORRECT}>{Object.entries(resultLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label><span className="atlas-label">耗时（分钟）</span><input name="durationMinutes" type="number" min="0" max="1440" step="0.5" className="atlas-input" defaultValue={attempt?.durationSeconds ? attempt.durationSeconds / 60 : ''} /></label>
    <label><span className="atlas-label">信心程度</span><select name="confidence" className="atlas-input" defaultValue={attempt?.confidence ?? ''}><option value="">未填写</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
    <label className="sm:col-span-2"><span className="atlas-label">下次复习</span><input name="nextReviewAt" type="datetime-local" className="atlas-input" defaultValue={localDateTimeValue(attempt?.nextReviewAt ?? null)} /></label>
    <label className="sm:col-span-2"><span className="atlas-label">本次错因</span><textarea name="errorReason" className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[var(--atlas-blue)]" defaultValue={attempt?.errorReason ?? ''} /></label>
    <label className="sm:col-span-2"><span className="atlas-label">本次备注</span><textarea name="note" className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[var(--atlas-blue)]" defaultValue={attempt?.note ?? ''} /></label>
  </div>;
}

export default async function QuestionDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const [question, settings] = await Promise.all([
    prisma.question.findUnique({
      where: { id },
      include: {
        textbook: true, chapter: true,
        knowledgePoints: { include: { knowledgePoint: true } },
        errorTypes: { include: { errorType: true } },
        attempts: { orderBy: [{ attemptedAt: 'desc' }, { createdAt: 'desc' }] },
        attachments: true,
      },
    }),
    prisma.learningSettings.upsert({ where: { id: 'learning' }, update: {}, create: {} }),
  ]);
  if (!question || question.status === 'DELETED') notFound();

  const feedback = noticeText(notice);
  const attemptAction = recordAttemptAction.bind(null, question.id);
  const deleteAction = deleteQuestionAction.bind(null, question.id);
  const archiveAction = setQuestionArchivedAction.bind(null, question.id, question.status !== 'ARCHIVED');
  const automaticMasteryAction = setMasteryOverrideAction.bind(null, question.id, 'AUTO');
  const manualMasteryAction = setMasteryOverrideAction.bind(
    null,
    question.id,
    question.status === 'MASTERED' ? MasteryOverride.FORCE_ACTIVE : MasteryOverride.FORCE_MASTERED,
  );
  const statusLabel = question.status === 'ARCHIVED' ? '已归档' : question.status === 'MASTERED' ? '已掌握' : question.wrongCount >= settings.repeatedErrorThreshold ? '反复错误' : '学习中';
  const statusTone = question.status === 'ARCHIVED' ? undefined : question.status === 'MASTERED' ? 'green' as const : question.wrongCount >= settings.repeatedErrorThreshold ? 'red' as const : 'blue' as const;
  const progressSteps = Math.min(settings.masteryThreshold, 10);

  return <>
    <PageHeader
      eyebrow={question.code}
      title={question.title}
      description={`${question.textbook.name} / ${question.chapter.name}`}
      action={<div className="flex flex-wrap gap-2">
        <Link href="/questions" className="atlas-button-secondary"><ArrowLeft className="size-4" />返回</Link>
        <Link href={`/questions/${question.id}/edit`} className="atlas-button-secondary"><Pencil className="size-4" />编辑</Link>
        <form action={archiveAction}><button className="atlas-button-secondary">{question.status === 'ARCHIVED' ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}{question.status === 'ARCHIVED' ? '取消归档' : '归档'}</button></form>
        <form action={deleteAction}><DangerSubmit label="移入回收站" confirmText="确定把这道错题移入回收站吗？历史重做记录会保留。" /></form>
      </div>}
    />

    {feedback ? <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
      <article className="space-y-5">
        <div className="atlas-card p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
            {question.masteryOverride ? <StatusPill tone="amber">人工覆盖：{question.masteryOverride === MasteryOverride.FORCE_MASTERED ? '掌握' : '学习中'}</StatusPill> : null}
            {question.errorTypes.map(({ errorType }) => <StatusPill key={errorType.id}>{errorType.name}</StatusPill>)}
            <StatusPill>{['', '普通', '较高', '紧急'][question.priority]}优先级</StatusPill>
          </div>
          <div className="paper-grid mt-6 rounded-xl border border-slate-200 p-6 sm:p-8"><MarkdownContent>{question.bodyMarkdown}</MarkdownContent></div>
          {question.attachments.length ? <section className="mt-7"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ImageIcon className="size-4" />原题图片</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{question.attachments.map((file) => <a key={file.id} href={`/api/attachments/${file.id}`} target="_blank" rel="noreferrer"><Image src={`/api/attachments/${file.id}`} alt={file.originalName} width={1200} height={800} unoptimized className="max-h-80 w-full rounded-xl border border-slate-200 object-contain" /></a>)}</div></section> : null}
          <section className="mt-7"><h2 className="text-sm font-semibold text-slate-900">我的错因</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{question.wrongReason}</p></section>
          {question.reflection ? <section className="mt-6"><h2 className="text-sm font-semibold text-slate-900">复盘总结</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{question.reflection}</p></section> : null}
          {question.reminder ? <section className="mt-6 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-5"><div className="text-xs font-semibold text-blue-700">一句话提醒</div><p className="mt-2 text-sm leading-6 text-blue-900">{question.reminder}</p></section> : null}
          <div className="mt-6 flex flex-wrap gap-2">{question.knowledgePoints.map(({ knowledgePoint }) => <StatusPill key={knowledgePoint.id} tone="blue">{knowledgePoint.name}</StatusPill>)}{question.tags.map((tag) => <StatusPill key={tag}>#{tag}</StatusPill>)}</div>
        </div>
      </article>

      <aside className="space-y-5">
        <div className="atlas-card p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">掌握进度</h2><Award className="size-5 text-slate-400" /></div>
          <div className="mt-5 flex gap-2">{Array.from({ length: progressSteps }, (_, step) => <div key={step} className={`h-2 flex-1 rounded-full ${step < question.correctStreak ? 'bg-[var(--atlas-blue)]' : 'bg-slate-100'}`} />)}</div>
          <div className="mt-3 flex justify-between text-xs"><span className="text-slate-400">连续独立做对</span><strong>{question.correctStreak} / {settings.masteryThreshold}</strong></div>
          <div className="mt-3 text-xs leading-5 text-slate-500">累计重做 {question.attemptCount} 次，其中独立做对 {question.independentCorrectCount} 次，做错/不会 {question.wrongCount} 次。</div>
          {question.status !== 'ARCHIVED' ? <div className="mt-4 flex flex-wrap gap-2">
            <form action={question.masteryOverride ? automaticMasteryAction : manualMasteryAction}><button className="atlas-button-secondary">{question.masteryOverride ? '恢复自动判定' : question.status === 'MASTERED' ? '手动取消掌握' : '手动标记掌握'}</button></form>
          </div> : null}
        </div>

        {question.status === 'ARCHIVED'
          ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">此题已归档，不进入常规复习。取消归档后可以继续记录重做。</div>
          : <form action={attemptAction} className="atlas-card p-6"><h2 className="flex items-center gap-2 font-semibold text-slate-900"><RotateCcw className="size-4" />记录一次重做</h2><div className="mt-5 space-y-4"><AttemptFields /><button className="atlas-button-primary w-full">保存并重新计算</button></div></form>}

        <div className="atlas-card p-6">
          <h2 className="font-semibold text-slate-900">重做轨迹</h2>
          {question.attempts.length ? <div className="mt-5 space-y-5">{question.attempts.map((attempt) => {
            const correct = attempt.result === AttemptResult.INDEPENDENT_CORRECT;
            const updateAction = updateAttemptAction.bind(null, attempt.id);
            const removeAction = deleteAttemptAction.bind(null, attempt.id);
            return <div key={attempt.id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
              <div className="flex gap-3">
                <div className={`grid size-8 shrink-0 place-items-center rounded-full ${correct ? 'bg-emerald-50 text-emerald-700' : attempt.result === AttemptResult.SKIPPED ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-700'}`}>{correct ? <Check className="size-4" /> : <X className="size-4" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-700">{resultLabels[attempt.result]}</div>
                  <div className="mt-1 text-xs text-slate-400">{displayDate(attempt.attemptedAt)} · {sourceLabels[attempt.source]}{attempt.durationSeconds ? ` · ${Math.round(attempt.durationSeconds / 60)} 分钟` : ''}{attempt.confidence ? ` · 信心 ${attempt.confidence}/5` : ''}</div>
                  {attempt.errorReason ? <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">本次错因：{attempt.errorReason}</div> : null}
                  {attempt.note ? <div className="mt-2 text-xs leading-5 text-slate-500">{attempt.note}</div> : null}
                </div>
              </div>
              <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-slate-600 [&::-webkit-details-marker]:hidden"><Settings2 className="size-3.5" />修改或删除这条记录</summary>
                <form action={updateAction} className="mt-4 space-y-4"><AttemptFields attempt={attempt} /><button className="atlas-button-primary w-full">保存修改并重算</button></form>
                <form action={removeAction} className="mt-3"><DangerSubmit label="删除这条误录记录" confirmText="确定删除这条重做记录吗？删除后连续正确次数、掌握状态和统计都会重新计算。" /></form>
              </details>
            </div>;
          })}</div> : <p className="mt-4 text-xs text-slate-400">还没有重做记录。</p>}
        </div>

        <div className="atlas-card p-6"><div className="flex gap-3"><CalendarClock className="size-5 text-slate-400" /><div><div className="text-xs text-slate-400">下次复习</div><div className="mt-1 font-semibold text-slate-800">{question.nextReviewAt ? displayDate(question.nextReviewAt) : '未安排'}</div>{question.lastAttemptAt ? <div className="mt-2 text-xs text-slate-400">最近重做：{displayDate(question.lastAttemptAt)}</div> : null}</div></div></div>
      </aside>
    </div>
  </>;
}
