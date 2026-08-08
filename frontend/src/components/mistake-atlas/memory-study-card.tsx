'use client';

import { useState } from 'react';
import { CalendarCheck2, Check, Eye, EyeOff, PenLine } from 'lucide-react';
import { markMemoryViewedAction } from '@/app/actions/memory-actions';
import { MarkdownContent } from '@/components/mistake-atlas/markdown-content';

export function MemoryStudyCard({ cardId, content, summary, reviewedToday }: { cardId: string; content: string; summary: string | null; reviewedToday: boolean }) {
  const [revealed, setRevealed] = useState(false);

  return <section className="atlas-card overflow-hidden">
    <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50/70 via-white to-violet-50/35 px-5 py-6 text-center sm:px-8">
      <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100"><PenLine className="size-5" /></div>
      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-500">先回忆，再核对</div>
      <p className="mx-auto mt-2 max-w-2xl text-base font-medium leading-8 text-slate-700">{summary || '先根据标题回忆公式、使用条件和易错点，然后在纸上默写。'}</p>
      {!revealed ? <button type="button" onClick={() => setRevealed(true)} className="atlas-button-primary mt-5 h-10 px-5"><Eye className="size-4" />显示公式与内容</button> : null}
    </div>
    {revealed ? <div className="atlas-memory-study px-5 py-7 sm:px-8 lg:px-10">
      <MarkdownContent>{content}</MarkdownContent>
      <div className="mt-7 flex flex-wrap justify-center gap-3 border-t border-slate-100 pt-5">
        <button type="button" onClick={() => setRevealed(false)} className="atlas-button-secondary"><EyeOff className="size-4" />收起，再背一次</button>
        <form action={markMemoryViewedAction.bind(null, cardId)}>
          <button disabled={reviewedToday} className={reviewedToday ? 'atlas-button-secondary text-emerald-700' : 'atlas-button-primary'}>
            {reviewedToday ? <Check className="size-4" /> : <CalendarCheck2 className="size-4" />}
            {reviewedToday ? '今天已看' : '标记今天已看'}
          </button>
        </form>
      </div>
    </div> : <div className="grid min-h-44 place-items-center px-5 py-8 text-center"><div><div className="font-serif text-4xl text-slate-200">?</div><p className="mt-2 text-xs leading-6 text-slate-400">在纸上写出你记得的内容后，再点击上方按钮核对。</p></div></div>}
  </section>;
}
