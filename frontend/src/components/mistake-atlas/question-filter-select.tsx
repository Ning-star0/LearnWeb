'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownUp, BookOpen, Brain, CalendarClock, Check, ChevronDown,
  CircleGauge, Flag, Layers3, LibraryBig, ListChecks, Tags,
} from 'lucide-react';

type FilterIcon = 'type' | 'sort' | 'book' | 'chapter' | 'knowledge' | 'error' | 'status' | 'review' | 'priority' | 'difficulty';

type FilterOption = {
  value: string;
  label: string;
  description?: string;
};

const icons = {
  type: Layers3,
  sort: ArrowDownUp,
  book: LibraryBig,
  chapter: BookOpen,
  knowledge: Brain,
  error: Tags,
  status: ListChecks,
  review: CalendarClock,
  priority: Flag,
  difficulty: CircleGauge,
} satisfies Record<FilterIcon, typeof Layers3>;

export function QuestionFilterSelect({ name, label, value, options, icon = 'type' }: {
  name: string;
  label: string;
  value: string;
  options: FilterOption[];
  icon?: FilterIcon;
}) {
  const [selected, setSelected] = useState(value);
  const [submitting, setSubmitting] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = options.find((option) => option.value === selected) ?? options[0];
  const Icon = icons[icon];

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) detailsRef.current?.removeAttribute('open');
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  function choose(option: FilterOption) {
    if (option.value === selected) {
      detailsRef.current?.removeAttribute('open');
      return;
    }
    setSelected(option.value);
    setSubmitting(true);
    if (inputRef.current) inputRef.current.value = option.value;
    detailsRef.current?.removeAttribute('open');
    inputRef.current?.form?.requestSubmit();
  }

  return <details ref={detailsRef} className={`group relative ${submitting ? 'pointer-events-none opacity-60' : ''}`}>
    <input ref={inputRef} type="hidden" name={name} value={selected} readOnly />
    <summary className="flex h-11 cursor-pointer list-none items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 group-open:border-blue-400 group-open:ring-2 group-open:ring-blue-100 [&::-webkit-details-marker]:hidden">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span><span className="block truncate text-sm font-semibold text-slate-800">{current.label}</span></span>
      <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
    </summary>
    <div className="absolute left-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
      <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">选择{label}</div>
      {options.map((option) => {
        const active = selected === option.value;
        return <button type="button" key={option.value || 'all'} onClick={() => choose(option)} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-50'}`}>
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? 'bg-white text-blue-700 shadow-sm' : 'bg-slate-100 text-slate-500'}`}><Icon className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{option.label}</span>{option.description ? <span className="mt-0.5 block text-[11px] text-slate-400">{option.description}</span> : null}</span>
          {active ? <Check className="size-4 shrink-0 text-blue-600" /> : null}
        </button>;
      })}
    </div>
  </details>;
}
