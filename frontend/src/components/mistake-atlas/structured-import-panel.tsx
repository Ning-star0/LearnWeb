'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, ClipboardPaste, Copy, FileUp, LoaderCircle, Sparkles, Upload } from 'lucide-react';
import { importStructuredMarkdownAction, type StructuredImportState } from '@/app/actions/structured-import-actions';

const photoToMarkdownPrompt = `你是“个人学习档案”的数学资料结构化助手。我会给你教材、讲义或笔记的照片，并补充书名、章节等出处信息。请准确读取照片，把其中的公式、定理、方法、技巧和知识点整理成一份可直接导入系统的 Markdown 文件。

使用方式与信息来源：
- 我会在本提示词后附上照片，并尽量提供书名、当前讲/章/节。请优先采用我明确提供的出处；照片上能清楚识别的目录标题可用于补全 chapter_path。
- 如果书名或章节确实无法确认，不要虚构。请先向我询问缺失的出处，得到回答后再生成文件。
- 我不需要提前在系统中建立教材、章节或知识点；你必须把这些目录信息一起写入同一份 Markdown 文件。

输出要求：
1. 最终创建一个 UTF-8 编码的 .md 文件并作为附件交付，文件名使用“书名_章节_知识结构.md”；不要解释，不要使用代码围栏。只有在当前平台确实无法创建文件附件时，才直接输出该文件的完整正文。
2. 一个文件中可以连续包含多份结构记录。每份记录都必须以 --- 开始，YAML 结束后再写一个 ---。
3. schema_version 固定为 "1.0"，subject 固定为 "数学"。
4. 只整理照片中能确认的内容。公式、符号、上下标、积分区间、适用条件必须逐字核对；模糊处不要猜测，应写入 summary 或 description 标注“图片此处不清晰，需人工核对”。
5. 不生成练习题答案、标准解法、证明过程或我的原答案。照片中如果只有知识材料，就只整理知识材料。
6. 同一本书、同一章节、同一知识点必须使用完全一致的名称，避免重复分类。
7. 数学公式使用 LaTeX 印刷排版：短公式用 $...$；分式、极限、根式、积分、求和、矩阵、多层指数使用 $$...$$；分式统一使用 \\dfrac；多行公式使用 aligned，每个逻辑单元单独一行。
8. 根据照片内容输出以下四类记录：教材、章节、知识点、公式/技巧卡片。没有对应内容时不要为了凑数而输出。
9. 字段名必须完全照抄模板，禁止自行改名或增加字段。特别注意：公式卡片使用 title 和 category；知识点使用 name、book 和 chapter_path。

【A. 教材：同一本资料只输出一次】
---
schema_version: "1.0"
record_type: "textbook"
subject: "数学"
name: "张宇基础30讲"
description: "资料的简短说明，不超过 200 字"
sort_order: 0
---

【B. 章节：每个实际出现的章节路径输出一次】
---
schema_version: "1.0"
record_type: "chapter"
subject: "数学"
book: "张宇基础30讲"
chapter_path:
  - "第9讲 一元函数积分学的计算"
  - "不定积分的积分法"
  - "凑微分法"
sort_order: 0
---

【C. 知识点：用于建立知识点目录】
---
schema_version: "1.0"
record_type: "knowledge_point"
subject: "数学"
book: "张宇基础30讲"
chapter_path:
  - "第9讲 一元函数积分学的计算"
  - "不定积分的积分法"
  - "凑微分法"
name: "凑微分法"
description: "根据照片概括这个知识点的定义、识别信号或用途，不超过 300 字"
---

【D. 公式、技巧或记忆卡片：每个独立内容输出一份】
---
schema_version: "1.0"
record_type: "memory_card"
subject: "数学"
title: "凑微分法基本形式"
category: "张宇基础30讲 / 第9讲 / 不定积分的积分法 / 凑微分法"
kind: "技巧"
summary: "一句话说明使用条件、识别方法或记忆重点，不超过 200 字"
tags: ["不定积分", "凑微分", "换元"]
pinned: false
show_on_home: true
sort_order: 0
---

# 内容

在这里写照片中对应的 Markdown 正文和 LaTeX 公式。kind 只能写“公式”“技巧”或“记忆”。不要使用 book、chapter_path、name 代替 title 和 category。

整理规则：
- 先输出教材，再输出章节，再输出知识点，最后输出公式/技巧卡片。
- 重复出现的同一公式只保留一张卡片；不同适用条件必须分别写清楚。
- category 直接用“书名 / 完整章节路径”拼接，它只是卡片上的来源文字。
- 如果照片跨越多个章节，分别输出对应的 chapter、knowledge_point 和 memory_card。
- 我如果一次提供多张连续照片，要合并理解后输出同一个 Markdown 文件。

现在请读取我接下来提供的照片和出处信息，并严格生成上述结构化 Markdown 文件。最终只交付一个 .md 文件；不要把目录、说明或提示词放在文件之外：
`;

export function StructuredImportPanel({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState<StructuredImportState, FormData>(importStructuredMarkdownAction, {});
  const [copied, setCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [fileName, setFileName] = useState('');

  async function copyPrompt() {
    await navigator.clipboard.writeText(photoToMarkdownPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <section id="ai-structured-import" className="atlas-card scroll-mt-24 overflow-hidden border-blue-100">
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Sparkles className="size-4" /></div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">学习资料 Markdown 导入</h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">教材 · 章节 · 知识点 · 公式</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">复制唯一的总提示词，让 AI 根据照片生成 .md；上传后自动拆分到对应板块。</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button type="button" onClick={copyPrompt} className="atlas-button-secondary h-8 px-3 text-xs">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? '已复制' : '复制总提示词'}</button>
        <button type="button" onClick={() => setImportOpen((value) => !value)} className="atlas-button-primary h-8 px-3 text-xs"><FileUp className="size-3.5" />{importOpen ? '收起' : '上传 Markdown'}</button>
      </div>
    </div>

    {importOpen ? <form action={action} className="border-t border-blue-50 bg-blue-50/20 p-4 sm:p-5">
      <input type="hidden" name="scope" value="all" />
      <label className="grid min-h-44 cursor-pointer place-items-center rounded-2xl border border-dashed border-blue-200 bg-white p-5 text-center transition hover:border-blue-300 hover:bg-blue-50/30">
        <div>
          <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><FileUp className="size-5" /></div>
          <div className="mt-3 text-sm font-semibold text-slate-700">上传 AI 生成的 Markdown</div>
          <div className="mt-1 text-[11px] text-slate-400">点击选择 .md 文件，最大 1MB</div>
          <span className="mt-3 inline-flex h-8 items-center rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700">{fileName || '选择文件'}</span>
        </div>
        <input name="markdownFile" type="file" accept=".md,text/markdown,text/plain" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name || '')} />
      </label>

      <button type="button" onClick={() => setPasteOpen((value) => !value)} className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 transition hover:text-blue-600"><ClipboardPaste className="size-3.5" />{pasteOpen ? '收起文本粘贴' : '没有文件？也可以直接粘贴 Markdown 文本'}</button>
      {pasteOpen ? <textarea name="markdown" placeholder="把 AI 生成的结构化 Markdown 粘贴到这里……" className={`${compact ? 'min-h-28' : 'min-h-36'} mt-2 w-full resize-y rounded-xl border border-blue-100 bg-white p-3 font-mono text-xs leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100`} /> : null}

      {state.error ? <div role="alert" className="mt-3 inline-flex max-w-full gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{state.error}</div> : null}
      {state.success ? <div role="status" className="mt-3 inline-flex max-w-full gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />{state.success}</div> : null}
      <div className="mt-4 flex flex-col gap-2 border-t border-blue-50 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[10px] text-slate-400">无需预建章节；系统会按 book 与 chapter_path 自动建立目录。</span>
        <button disabled={pending} className="atlas-button-primary h-8 shrink-0 px-3 text-xs disabled:cursor-wait disabled:opacity-60">{pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}{pending ? '正在分析并导入…' : '分析并导入结构文件'}</button>
      </div>
    </form> : null}
  </section>;
}
