import type { LucideIcon } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        {eyebrow ? <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--atlas-blue)]">{eyebrow}</div> : null}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, note, icon: Icon, tone = 'blue' }: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: 'blue' | 'amber' | 'green' | 'slate';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div className="atlas-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-3 font-serif text-3xl font-semibold tabular-nums text-slate-950">{value}</div>
        </div>
        <div className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="size-5" /></div>
      </div>
      <div className="mt-3 text-xs text-slate-400">{note}</div>
    </div>
  );
}

export function StatusPill({ children, tone = 'slate' }: {
  children: React.ReactNode;
  tone?: 'blue' | 'amber' | 'red' | 'green' | 'slate';
}) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-rose-200 bg-rose-50 text-rose-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'amber' | 'green' }) {
  const colors = { blue: 'bg-[var(--atlas-blue)]', amber: 'bg-amber-500', green: 'bg-emerald-500' };
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
