'use client';

import { Trash2 } from 'lucide-react';

export function DangerSubmit({ label, confirmText }: { label: string; confirmText: string }) {
  return <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50" onClick={(event) => { if (!window.confirm(confirmText)) event.preventDefault(); }}><Trash2 className="size-4" />{label}</button>;
}
