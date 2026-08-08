'use client';

import { BookOpenCheck, Brain, CalendarCheck2, Check } from 'lucide-react';
import { markMemoryMemorizedAction, markMemoryViewedAction } from '@/app/actions/memory-actions';
import { MarkdownContent } from '@/components/mistake-atlas/markdown-content';

export function MemoryStudyCard({
  cardId,
  content,
  summary,
  reviewedToday,
  memorizedToday,
}: {
  cardId: string;
  content: string;
  summary: string | null;
  reviewedToday: boolean;
  memorizedToday: boolean;
}) {
  return <section className="atlas-card overflow-hidden">
    {summary ? <div className="flex items-start gap-3 border-b border-blue-100/70 bg-blue-50/45 px-4 py-3 sm:px-5">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-blue-600 ring-1 ring-blue-100"><Brain className="size-4" /></div>
      <div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500">记忆提示</div><p className="mt-1 text-sm leading-6 text-slate-600">{summary}</p></div>
    </div> : null}

    <div className="atlas-memory-study px-4 py-4 sm:px-6 sm:py-5">
      <MarkdownContent>{content}</MarkdownContent>
    </div>

    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="text-xs leading-5 text-slate-400">
        阅读表示今天已经核对；背诵表示今天已经完成回忆或默写。
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <form action={markMemoryViewedAction.bind(null, cardId)}>
          <button disabled={reviewedToday} className={reviewedToday ? 'atlas-button-secondary text-emerald-700' : 'atlas-button-secondary'}>
            {reviewedToday ? <Check className="size-4" /> : <CalendarCheck2 className="size-4" />}
            {reviewedToday ? '今天已读' : '标记今天已读'}
          </button>
        </form>
        <form action={markMemoryMemorizedAction.bind(null, cardId)}>
          <button disabled={memorizedToday} className={memorizedToday ? 'atlas-button-secondary text-emerald-700' : 'atlas-button-primary'}>
            {memorizedToday ? <Check className="size-4" /> : <BookOpenCheck className="size-4" />}
            {memorizedToday ? '今天已背' : '标记今天已背'}
          </button>
        </form>
      </div>
    </div>
  </section>;
}
