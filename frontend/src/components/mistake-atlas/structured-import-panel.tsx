'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, ChevronDown, ClipboardPaste, Copy, LoaderCircle, Sparkles, Upload } from 'lucide-react';
import { importStructuredMarkdownAction, type StructuredImportState } from '@/app/actions/structured-import-actions';

const totalPrompt = `你是“个人学习档案”的结构化整理助手。请把我接下来提供的数学材料整理成可直接导入系统的标准 Markdown。材料可能是公式、定理、技巧、需要记忆的结论、教材目录、章节目录、知识点目录或错误类型目录。

必须严格遵守：
1. 只输出最终 Markdown，不要解释，不要使用代码围栏。
2. 一条内容输出一份文档；多条内容连续输出多份文档。每份都必须从 --- 开始，YAML 结束后再写一个 ---。
3. schema_version 固定为 "1.0"，subject 固定为 "数学"。
4. record_type 只能是：memory_card、textbook、chapter、knowledge_point、error_type。
5. 不生成题目答案、标准解法、证明过程或我的原答案。只整理我提供的知识内容；信息不足时保守填写，不得虚构。
6. 名称要简短、稳定、可复用。相同教材、章节或知识点必须保持完全相同的名称，方便系统自动去重。
7. 公式必须使用 LaTeX 印刷排版：短公式用 $...$；分式、极限、根式、积分、求和、矩阵、多层指数使用 $$...$$；分式统一使用 \\dfrac；多个条件或多行公式使用 aligned，每个逻辑单元单独一行；禁止用 a/b、1/2 代替上下分式。
8. 如果我给的是目录，按教材、章节、知识点分别输出多份文档。chapter_path 必须从一级章节写到当前层级。
9. tags 使用简短中文词；没有内容写 []。布尔值只能写 true 或 false，数字不要加引号。
10. 不要输出规范以外的字段。

【公式、技巧、记忆卡片】
---
schema_version: "1.0"
record_type: "memory_card"
subject: "数学"
title: "泰勒公式"
category: "高等数学 / 级数"
kind: "公式"
summary: "一句话说明使用条件或记忆重点"
tags: ["泰勒展开", "常用公式"]
pinned: false
show_on_home: true
sort_order: 0
---

# 内容

在这里写整理后的 Markdown 与 LaTeX 正文。kind 只能写“公式”“技巧”或“记忆”。

【教材】
---
schema_version: "1.0"
record_type: "textbook"
subject: "数学"
name: "张宇基础30讲"
description: "教材的简短说明，没有可写空字符串"
sort_order: 0
---

【章节目录】
---
schema_version: "1.0"
record_type: "chapter"
subject: "数学"
book: "张宇基础30讲"
chapter_path:
  - "第一章 函数、极限与连续"
  - "函数极限"
sort_order: 0
---

【知识点】
---
schema_version: "1.0"
record_type: "knowledge_point"
subject: "数学"
book: "张宇基础30讲"
chapter_path:
  - "第一章 函数、极限与连续"
  - "函数极限"
name: "洛必达法则"
description: "知识点的简短说明，没有可写空字符串"
---

【错误类型】
---
schema_version: "1.0"
record_type: "error_type"
subject: "数学"
name: "方法没有想到"
description: "错误类型的简短说明，没有可写空字符串"
color: "slate"
---

现在请根据以上规范整理我接下来提供的材料：
`;

export function StructuredImportPanel({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState<StructuredImportState, FormData>(importStructuredMarkdownAction, {});
  const [copied, setCopied] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(totalPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <section id="ai-structured-import" className="atlas-card scroll-mt-24 overflow-hidden border-blue-100">
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Sparkles className="size-4" /></div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-slate-900">AI 规范导入</h2><span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">公式 · 目录 · 知识点</span></div>
          <p className="mt-0.5 text-xs text-slate-400">复制一段总提示词，粘贴 AI 返回的 Markdown；重复名称会自动更新。</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button type="button" onClick={copyPrompt} className="atlas-button-secondary h-8 px-3 text-xs">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? '已复制' : '复制总提示词'}</button>
        <button type="button" onClick={() => setPasteOpen((value) => !value)} className="atlas-button-primary h-8 px-3 text-xs"><ClipboardPaste className="size-3.5" />{pasteOpen ? '收起粘贴区' : '粘贴 Markdown'}</button>
      </div>
    </div>

    <div className="grid border-t border-blue-50 md:grid-cols-2">
      <details className="group border-b border-blue-50 md:border-b-0 md:border-r">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-blue-50/40">
          查看这段总提示词
          <ChevronDown className="size-3.5 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-blue-50 p-3">
          <pre className={`${compact ? 'max-h-52' : 'max-h-72'} overflow-auto rounded-xl border border-blue-100 bg-blue-50/45 p-3 text-[11px] leading-5 text-slate-600`}><code>{totalPrompt}</code></pre>
        </div>
      </details>

      <details id="paste-structured-markdown" open={pasteOpen} onToggle={(event) => setPasteOpen(event.currentTarget.open)} className="group scroll-mt-24">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-blue-50/40">
          粘贴 AI 返回的 Markdown
          <ChevronDown className="size-3.5 transition group-open:rotate-180" />
        </summary>
        <form action={action} className="border-t border-blue-50 p-3">
          <textarea
            name="markdown"
            required
            placeholder="把 AI 生成的标准 Markdown 粘贴到这里……"
            className={`${compact ? 'min-h-32' : 'min-h-40'} w-full resize-y rounded-xl border border-blue-100 bg-blue-50/40 p-3 font-mono text-xs leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100`}
          />
          {state.error ? <div role="alert" className="mt-2 flex gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{state.error}</div> : null}
          {state.success ? <div role="status" className="mt-2 flex gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />{state.success}</div> : null}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[10px] text-slate-400">一次可粘贴多份文档，系统先校验再写入。</span>
            <button disabled={pending} className="atlas-button-primary h-8 shrink-0 px-3 text-xs disabled:cursor-wait disabled:opacity-60">{pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}{pending ? '正在导入…' : '导入规范内容'}</button>
          </div>
        </form>
      </details>
    </div>
  </section>;
}
