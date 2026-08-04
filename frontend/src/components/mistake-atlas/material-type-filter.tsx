'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpenCheck, Check, ChevronDown, Layers3, NotebookPen } from 'lucide-react';

const options = [
  { value: '', label: '全部', description: '例题和练习题', icon: Layers3 },
  { value: 'EXAMPLE', label: '例题', description: '书上讲解例题', icon: BookOpenCheck },
  { value: 'EXERCISE', label: '练习题', description: '课后题与习题册', icon: NotebookPen },
] as const;

export function MaterialTypeFilter({ value }: { value: string }) {
  const [selected, setSelected] = useState(value);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const current = options.find((option) => option.value === selected) ?? options[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) detailsRef.current?.removeAttribute('open');
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  return <details ref={detailsRef} className="group relative">
    <summary className="flex h-11 cursor-pointer list-none items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 group-open:border-blue-400 group-open:ring-2 group-open:ring-blue-100 [&::-webkit-details-marker]:hidden">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><CurrentIcon className="size-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">题目类型</span><span className="block truncate text-sm font-semibold text-slate-800">{current.label}</span></span>
      <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
    </summary>
    <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
      <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">选择题目范围</div>
      {options.map((option) => {
        const Icon = option.icon;
        const active = selected === option.value;
        return <label key={option.value || 'all'} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition ${active ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-50'}`}>
          <input type="radio" name="materialType" value={option.value} checked={active} onChange={() => { setSelected(option.value); detailsRef.current?.removeAttribute('open'); }} className="sr-only" />
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? 'bg-white text-blue-700 shadow-sm' : 'bg-slate-100 text-slate-500'}`}><Icon className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{option.label}</span><span className="mt-0.5 block text-[11px] text-slate-400">{option.description}</span></span>
          {active ? <Check className="size-4 shrink-0 text-blue-600" /> : null}
        </label>;
      })}
    </div>
  </details>;
}
