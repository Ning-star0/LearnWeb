'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, ClipboardPaste, Copy, LoaderCircle, Sparkles, Upload } from 'lucide-react';
import { importStructuredMarkdownAction, type StructuredImportState } from '@/app/actions/structured-import-actions';

const formulaPrompt = `你是“个人学习档案”的数学公式整理助手。请把我接下来提供的公式、定理、技巧或需要记忆的结论，整理成可直接导入“公式与技巧”页面的标准 Markdown。

必须严格遵守：
1. 只输出最终 Markdown，不要解释，不要使用代码围栏。
2. 只允许输出 memory_card。绝对不要输出 textbook、chapter、knowledge_point、error_type，也不要建立任何目录。
3. 每个公式或技巧输出一份完整文档；多条内容连续输出多份文档。每份都从 --- 开始，YAML 结束后再写一个 ---。
4. 每份 YAML 必须且只能使用下面模板中的字段。标题字段必须叫 title，分类字段必须叫 category；禁止使用 name、book、chapter_path。
5. category 只是卡片上的来源/分类文字。如果材料包含书名和章节，可直接写成“张宇基础30讲 / 第9讲 / 基本积分公式”，不要另外生成目录。
6. 不生成题目答案、标准解法、证明过程或我的原答案。只整理材料中已有的公式、使用条件、识别技巧和记忆要点，不得虚构。
7. 公式使用 LaTeX 印刷排版：短公式用 $...$；分式、极限、根式、积分、求和、矩阵、多层指数使用 $$...$$；分式统一使用 \\dfrac；多行公式使用 aligned，每个公式单独一行。
8. kind 只能写“公式”“技巧”或“记忆”。tags 使用简短中文词；没有标签写 []。
9. pinned、show_on_home 必须写 true 或 false；sort_order 必须写数字。

每一条内容严格套用以下结构：

---
schema_version: "1.0"
record_type: "memory_card"
subject: "数学"
title: "幂函数基本积分"
category: "张宇基础30讲 / 第9讲 / 基本积分公式"
kind: "公式"
summary: "一句话说明使用条件或记忆重点"
tags: ["不定积分", "幂函数"]
pinned: false
show_on_home: true
sort_order: 0
---

# 内容

在这里写整理后的 Markdown 与 LaTeX 正文。

现在请整理我接下来提供的公式材料：
`;

const systemPrompt = `你是“个人学习档案”的结构化目录助手。请把我接下来提供的数学目录或分类材料整理成可直接导入系统的标准 Markdown。

只输出最终 Markdown，不要解释，不要使用代码围栏。一条内容一份文档，每份都从 --- 开始。schema_version 固定为 "1.0"，subject 固定为 "数学"。

record_type 只能按内容选择一种：textbook、chapter、knowledge_point、error_type。不要输出公式卡片和题目答案。

教材模板：
---
schema_version: "1.0"
record_type: "textbook"
subject: "数学"
name: "张宇基础30讲"
description: "教材简短说明"
sort_order: 0
---

章节模板：
---
schema_version: "1.0"
record_type: "chapter"
subject: "数学"
book: "张宇基础30讲"
chapter_path: ["第9讲 一元函数积分学的计算", "基本积分公式"]
sort_order: 0
---

知识点模板：
---
schema_version: "1.0"
record_type: "knowledge_point"
subject: "数学"
book: "张宇基础30讲"
chapter_path: ["第9讲 一元函数积分学的计算", "不定积分的积分法"]
name: "凑微分法"
description: "知识点简短说明"
---

错误类型模板：
---
schema_version: "1.0"
record_type: "error_type"
subject: "数学"
name: "方法没有想到"
description: "错误类型简短说明"
color: "slate"
---

名称必须稳定一致，不要输出模板之外的字段。现在请整理我接下来提供的目录或分类材料：
`;

export function StructuredImportPanel({ compact = false, scope = 'all' }: { compact?: boolean; scope?: 'memory' | 'all' }) {
  const [state, action, pending] = useActionState<StructuredImportState, FormData>(importStructuredMarkdownAction, {});
  const [copied, setCopied] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const memoryOnly = scope === 'memory';
  const prompt = memoryOnly ? formulaPrompt : systemPrompt;

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <section id="ai-structured-import" className="atlas-card scroll-mt-24 overflow-hidden border-blue-100">
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Sparkles className="size-4" /></div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{memoryOnly ? '公式 AI 导入' : '目录 AI 导入'}</h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">{memoryOnly ? '仅公式卡片' : '教材 · 章节 · 知识点'}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{memoryOnly ? '复制公式专用提示词，粘贴结果即可；不会建立或修改目录。' : '复制目录专用提示词，粘贴结果后统一建立分类。'}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button type="button" onClick={copyPrompt} className="atlas-button-secondary h-8 px-3 text-xs">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? '已复制' : `复制${memoryOnly ? '公式' : '目录'}提示词`}</button>
        <button type="button" onClick={() => setPasteOpen((value) => !value)} className="atlas-button-primary h-8 px-3 text-xs"><ClipboardPaste className="size-3.5" />{pasteOpen ? '收起' : '粘贴 Markdown'}</button>
      </div>
    </div>

    {pasteOpen ? <form action={action} className="border-t border-blue-50 bg-blue-50/20 p-3 sm:p-4">
      <input type="hidden" name="scope" value={scope} />
      <textarea
        name="markdown"
        required
        placeholder={memoryOnly ? '把 AI 生成的公式 Markdown 粘贴到这里……' : '把 AI 生成的目录 Markdown 粘贴到这里……'}
        className={`${compact ? 'min-h-28' : 'min-h-36'} w-full resize-y rounded-xl border border-blue-100 bg-white p-3 font-mono text-xs leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100`}
      />
      {state.error ? <div role="alert" className="mt-2 flex gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{state.error}</div> : null}
      {state.success ? <div role="status" className="mt-2 flex gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />{state.success}</div> : null}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[10px] text-slate-400">{memoryOnly ? '只导入公式卡片；混入的目录记录会自动忽略。' : '同名目录会复用或更新，不会重复建立。'}</span>
        <button disabled={pending} className="atlas-button-primary h-8 shrink-0 px-3 text-xs disabled:cursor-wait disabled:opacity-60">{pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}{pending ? '正在导入…' : memoryOnly ? '导入公式' : '导入目录'}</button>
      </div>
    </form> : null}
  </section>;
}
