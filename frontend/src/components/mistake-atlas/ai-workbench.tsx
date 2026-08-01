'use client';

import { useState } from 'react';
import { Bot, LoaderCircle, Send } from 'lucide-react';

export function AiWorkbench({ enabled, context }: { enabled: boolean; context: unknown }) {
  const [prompt, setPrompt] = useState('请根据这些数学错题和重做记录，分析我当前最值得优先解决的三个薄弱点，并给出下周复习建议。');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit() {
    setPending(true); setError(''); setAnswer('');
    try {
      const response = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI 请求失败');
      setAnswer(data.answer);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'AI 请求失败'); }
    finally { setPending(false); }
  }
  return <div className="atlas-card p-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><Bot className="size-5" /></div><div><h2 className="font-semibold text-slate-900">数学学习分析</h2><p className="mt-1 text-xs text-slate-400">发送前可以修改问题；下方预览即将发送的上下文。</p></div></div><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-5 min-h-28 w-full rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-[var(--atlas-blue)]" /><button type="button" onClick={submit} disabled={!enabled || pending || !prompt.trim()} className="atlas-button-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{pending ? '正在分析…' : enabled ? '发送给 AI 分析' : '尚未配置 AI Provider'}</button>{error ? <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}{answer ? <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{answer}</div> : null}<details className="mt-5"><summary className="cursor-pointer text-xs font-semibold text-slate-500">查看发送上下文</summary><pre className="atlas-scroll mt-3 max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-200">{JSON.stringify(context, null, 2)}</pre></details></div>;
}
