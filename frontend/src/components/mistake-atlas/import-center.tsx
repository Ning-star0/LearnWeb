'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Eye, FileText, Upload } from 'lucide-react';
import { importMarkdownAction } from '@/app/actions/math-actions';

const template = `# 指数函数极限中的变量代换
- 教材：未指定教材
- 章节：未分类章节
- 题型：计算题
- 错误类型：方法没有想到
- 知识点：

## 题目
计算极限：$\\lim_{x \\to \\infty} x(a^{1/x}-1)$

## 错因
没有想到使用变量代换。

## 复盘
出现 $1/x$ 时先考虑令 $t=1/x$。
`;

function preview(raw: string) {
  return raw.split(/^---\s*$/m).map((block) => block.trim()).filter(Boolean).map((block, index) => ({
    index: index + 1,
    title: block.match(/^#\s+(.+)$/m)?.[1]?.trim() || '缺少标题',
    textbook: block.match(/^-\s*教材[：:]\s*(.+)$/m)?.[1]?.trim() || '缺少教材',
    chapter: block.match(/^-\s*章节[：:]\s*(.+)$/m)?.[1]?.trim() || '缺少章节',
    valid: Boolean(block.match(/^#\s+(.+)$/m) && block.includes('## 题目') && block.includes('## 错因')),
  }));
}

export function ImportCenter() {
  const [markdown, setMarkdown] = useState(template);
  const [previewed, setPreviewed] = useState(false);
  const rows = useMemo(() => preview(markdown), [markdown]);
  return <form action={importMarkdownAction} className="space-y-5"><div className="atlas-card p-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileText className="size-5" /></div><div><h2 className="font-semibold text-slate-900">标准 Markdown 导入</h2><p className="mt-1 text-xs text-slate-400">多道题之间使用单独一行 <code>---</code> 分隔；导入前必须先预览。</p></div></div><textarea name="markdown" value={markdown} onChange={(event) => { setMarkdown(event.target.value); setPreviewed(false); }} className="mt-5 min-h-[420px] w-full rounded-xl border border-slate-200 bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-blue-400" /><div className="mt-4 flex justify-end"><button type="button" onClick={() => setPreviewed(true)} className="atlas-button-secondary"><Eye className="size-4" />生成导入预览</button></div></div>{previewed ? <div className="atlas-card p-6"><h2 className="font-semibold text-slate-900">预览：{rows.length} 道题</h2><div className="mt-4 divide-y divide-slate-100">{rows.map((row) => <div key={row.index} className="flex items-center gap-3 py-3"><CheckCircle2 className={`size-5 ${row.valid ? 'text-emerald-600' : 'text-rose-500'}`} /><div className="flex-1"><div className="text-sm font-semibold text-slate-800">{row.index}. {row.title}</div><div className="mt-1 text-xs text-slate-400">{row.textbook} / {row.chapter}</div></div><span className={`text-xs font-semibold ${row.valid ? 'text-emerald-600' : 'text-rose-600'}`}>{row.valid ? '结构有效' : '需要补充'}</span></div>)}</div><button disabled={!rows.length || rows.some((row) => !row.valid)} className="atlas-button-primary mt-5 w-full disabled:opacity-50"><Upload className="size-4" />确认导入 {rows.length} 道题</button></div> : null}</form>;
}
