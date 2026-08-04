'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Copy, FileJson, FileText, LoaderCircle, Upload } from 'lucide-react';
import { confirmImportJobAction, previewJsonImportAction, previewMarkdownImportAction, type ImportPreviewState, type JsonImportPreviewState } from '@/app/actions/import-actions';

const template = `---
# 模板版本：必填，不要修改
schema_version: "1.0"

# 学科：必填；当前数学模块统一写“数学”
subject: "数学"

# 题目标题：可选；不写时系统会从题干自动截取
title: "指数函数极限——变量代换"

# 教材与完整章节路径：必填；不存在时可由系统自动建立
book: "张宇 1000 题"
chapter_path:
  - "第一章 函数、极限与连续"
  - "函数极限"

# 内容类型：必填；教材讲解中的题写“例题”，章节练习或习题册中的题写“习题”
material_type: "例题"

# 题型：必填
# 可选值：单选题、多选题、填空题、计算题、证明题、判断题、综合题、其他
question_type: "计算题"

# 来源：可选；没有页码或题号时可删除整个 source 区块
source:
  page: "36"
  question_number: "1.9"

# 难度：1-5；1 最简单，5 最难；默认 3
difficulty: 4

# 优先级：LOW、MEDIUM、HIGH、URGENT；默认 MEDIUM
priority: "HIGH"

# 首次做错日期：必填；当天可写 today，历史题写 YYYY-MM-DD
occurred_at: "today"

# 知识点：可选；可以填写多个；没有时写 []
knowledge_points:
  - "重要极限"
  - "变量代换"

# 错因类型：必填，至少一个；可以填写多个
error_types:
  - "方法没有想到"

# 自定义标签：可选；没有时写 []
tags:
  - "高等数学"
  - "极限"

# 图片文件：无图片写 []；有图片时请使用 ZIP 导入并填写 images/ 下的路径
image_files: []

# 以下两项都是可选项，需要时删除行首的 # 并修改内容
# external_id: "math-2026-000001"
# next_review_at: "YYYY-MM-DD"
---

# 题目

计算极限：$\\lim_{x \\to \\infty} x(a^{1/x}-1)$

已知 $a>0$ 且 $a\\ne1$。

## 我的错因

**错误发生在哪里：**

直接把 $a^{1/x}-1$ 看成趋近于 0，因此误判整个乘积为 0。

**根本原因：**

没有识别出“无穷大乘无穷小”是不定式，也没有想到令 $t=1/x$ 转化为熟悉的重要极限。

**缺少的知识或方法：**

$\\lim_{t\\to0}\\frac{a^t-1}{t}=\\ln a$，以及无穷远变量代换。

## 一句话提醒

看到 $x\\to\\infty$ 且式中出现 $1/x$，先尝试令 $t=1/x$。

## 复盘备注

**这次如何改正：** 先判断是否为不定式，再选择等价无穷小、重要极限或变量代换。

**相似题识别信号：** $a^{1/x}$、$(1+1/x)^x$、无穷大乘无穷小。
`;

export function ImportCenter() {
  const [state, previewAction, pending] = useActionState<ImportPreviewState, FormData>(previewMarkdownImportAction, {});
  const [revision, setRevision] = useState(0);
  const [previewRevision, setPreviewRevision] = useState(-1);
  const [copied, setCopied] = useState(false);
  const previewCurrent = Boolean(state.jobId) && previewRevision === revision;
  const rows = previewCurrent ? state.rows ?? [] : [];
  const canConfirm = previewCurrent && rows.length > 0 && rows.every((row) => row.valid);
  const confirmAction = state.jobId ? confirmImportJobAction.bind(null, state.jobId) : undefined;

  return <div className="space-y-5">
    <form action={previewAction} onSubmit={() => setPreviewRevision(revision)} className="atlas-card p-6">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileText className="size-5" /></div>
        <div><h2 className="font-semibold text-slate-900">标准 Markdown / ZIP 导入</h2><p className="mt-1 text-xs text-slate-400">支持粘贴、多选 .md，或单独上传含 questions/ 与 images/ 的 ZIP；预览会检查格式、分类、重复项和真实图片内容。</p></div>
      </div>
      <details className="mt-5 overflow-hidden rounded-xl border border-blue-100 bg-blue-50/60">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-blue-900">展开标准 Markdown 模板（可一键复制）</summary>
        <div className="border-t border-blue-100 px-4 pb-4 pt-3">
          <div className="flex flex-col gap-3 text-xs leading-5 text-slate-600 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p>推荐用此格式录入单题或多题；JSON 仅用于整库备份与迁移。</p>
              <p className="mt-1">必填：版本、学科、教材、章节、内容类型（例题/习题）、题型、发生日期、错因类型、题目正文和“我的错因”。当天录入可写 <code className="rounded bg-white px-1 py-0.5">{'occurred_at: "today"'}</code>，无图片时保留 <code className="rounded bg-white px-1 py-0.5">image_files: []</code>。</p>
              <p className="mt-1">默认会按文本自动建立尚不存在的教材、章节、知识点和错因类型；批量录入时可连续粘贴多个完整模板。external_id 为可选项，普通录入不需要填写。</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(template);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
              className="atlas-button-secondary shrink-0"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? '已复制' : '复制模板'}
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-blue-100 bg-white p-3"><div className="font-semibold text-slate-700">必填元数据</div><p className="mt-1 text-[11px] leading-5 text-slate-500">学科、教材、章节路径、例题/习题、题型、做错日期、至少一个错因类型。</p></div>
            <div className="rounded-lg border border-blue-100 bg-white p-3"><div className="font-semibold text-slate-700">可选元数据</div><p className="mt-1 text-[11px] leading-5 text-slate-500">标题、页码、题号、知识点、标签、图片、复习日期和 external_id。</p></div>
            <div className="rounded-lg border border-blue-100 bg-white p-3"><div className="font-semibold text-slate-700">数学题干</div><p className="mt-1 text-[11px] leading-5 text-slate-500">只写题目与必要条件，不记录原答案、正确答案或标准解法；公式支持 $...$ 和 $$...$$。</p></div>
            <div className="rounded-lg border border-blue-100 bg-white p-3"><div className="font-semibold text-slate-700">一次录入多题</div><p className="mt-1 text-[11px] leading-5 text-slate-500">每道题重复一份从 YAML 的 --- 到“复盘备注”的完整结构，直接首尾相接。</p></div>
          </div>
          <pre className="mt-3 max-h-[520px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100"><code>{template}</code></pre>
        </div>
      </details>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <input name="autoCreateTaxonomy" type="checkbox" defaultChecked onChange={() => setRevision((value) => value + 1)} className="mt-0.5 size-4 accent-emerald-600" />
        <span>
          <span className="block text-sm font-semibold text-emerald-900">自动建立 Markdown 中缺失的分类</span>
          <span className="mt-1 block text-xs leading-5 text-emerald-700">预览会先列出将新建的教材、章节、知识点和错因类型，确认导入后才写入；停用中的同名分类仍会阻止导入。</span>
        </span>
      </label>
      <label className="mt-5 block"><span className="atlas-label">Markdown 文件（可多选）或单个 ZIP</span><input name="files" type="file" accept=".md,.zip,text/markdown,text/plain,application/zip" multiple onChange={() => setRevision((value) => value + 1)} className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600" /></label>
      <label className="mt-4 block"><span className="atlas-label">粘贴 Markdown</span><textarea name="markdown" placeholder="把复制并填写好的标准 Markdown 粘贴到这里……" onChange={() => setRevision((value) => value + 1)} onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }
      }} className="mt-1 min-h-[360px] w-full rounded-xl border border-slate-200 bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400" /><span className="mt-1 block text-right text-[11px] text-slate-400">Ctrl / ⌘ + Enter 生成预览</span></label>
      {state.error ? <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{state.error}</div> : null}
      <div className="mt-4 flex justify-end"><button disabled={pending} className="atlas-button-secondary disabled:cursor-wait disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{pending ? '正在解析并检查…' : '生成服务端预览'}</button></div>
    </form>

    {previewCurrent ? <div className="atlas-card p-6">
      <div className="flex items-center justify-between gap-4"><h2 className="font-semibold text-slate-900">预览：{rows.length} 道题</h2><span className="text-xs text-slate-400">{state.sourceType === 'ZIP' ? 'ZIP' : 'Markdown'} · 作业 {state.jobId?.slice(-8)}</span></div>
      <div className="mt-4 divide-y divide-slate-100">{rows.map((row) => <div key={row.key} className="flex items-start gap-3 py-4">
        {row.valid ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">{row.sourceName} · 第 {row.documentIndex} 题 · {row.title}</div>
          <div className="mt-1 text-xs text-slate-400">{row.book} / {row.chapter}{row.materialType ? ` · ${row.materialType === 'EXAMPLE' ? '例题' : '习题'}` : ''}</div>
          {row.conflict ? <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">检测到重复：{row.conflict.reason}，现有题目 {row.conflict.code}「{row.conflict.title}」</div> : null}
          {row.taxonomyChanges?.length ? <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800"><span className="font-semibold">确认后自动建立：</span>{row.taxonomyChanges.join('；')}</div> : null}
          {row.issues.length ? <ul className="mt-2 space-y-1 text-xs text-rose-600">{row.issues.map((issue) => <li key={issue}>· {issue}</li>)}</ul> : null}
        </div>
        <span className={`shrink-0 text-xs font-semibold ${row.valid ? 'text-emerald-600' : 'text-rose-600'}`}>{row.valid ? '可导入' : '需要修正'}</span>
      </div>)}</div>

      {canConfirm && confirmAction ? <form action={confirmAction} className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label><span className="atlas-label">发现重复时</span><select name="strategy" required defaultValue="SKIP" className="atlas-input"><option value="SKIP">跳过重复题（推荐）</option><option value="UPDATE_BASIC">更新现有题的基本信息</option><option value="CREATE_NEW">仍作为新题导入</option></select></label>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">系统不会静默覆盖。更新基本信息不修改已有重做轨迹；本次操作完成后可从导入历史整批回滚。</p>
        <button className="atlas-button-primary mt-4 w-full"><Upload className="size-4" />确认执行导入</button>
      </form> : <div className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">存在解析或分类错误，不能确认导入。请修改内容后重新生成预览。</div>}
    </div> : state.jobId ? <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">内容在预览后发生了变化，请重新生成预览。</div> : null}
  </div>;
}

export function JsonImportCenter() {
  const [state, previewAction, pending] = useActionState<JsonImportPreviewState, FormData>(previewJsonImportAction, {});
  const [revision, setRevision] = useState(0);
  const [previewRevision, setPreviewRevision] = useState(-1);
  const previewCurrent = Boolean(state.jobId) && previewRevision === revision;
  const rows = previewCurrent ? state.rows ?? [] : [];
  const canConfirm = previewCurrent && rows.every((row) => row.valid);
  const confirmAction = state.jobId ? confirmImportJobAction.bind(null, state.jobId) : undefined;
  return <div className="atlas-card p-6">
    <form action={previewAction} onSubmit={() => setPreviewRevision(revision)}>
      <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><FileJson className="size-5" /></div><div><h2 className="font-semibold text-slate-900">完整 JSON 回迁</h2><p className="mt-1 text-xs text-slate-400">仅接受本系统导出的版本 1 文件；先验证全部跨表引用，再生成可回滚预览。</p></div></div>
      <label className="mt-5 block"><span className="atlas-label">JSON 导出文件</span><input name="jsonFile" type="file" accept=".json,application/json" required onChange={() => setRevision((value) => value + 1)} className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600" /></label>
      {state.error ? <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{state.error}</div> : null}
      <button disabled={pending} className="atlas-button-secondary mt-4 w-full disabled:cursor-wait disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{pending ? '正在验证完整导出…' : '生成 JSON 预览'}</button>
    </form>
    {previewCurrent ? <div className="mt-5 border-t border-slate-100 pt-5">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">预览：{rows.length} 道题</h3><span className="text-xs text-slate-400">作业 {state.jobId?.slice(-8)}</span></div>
      {state.notice ? <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{state.notice}</div> : null}
      <div className="mt-3 max-h-72 divide-y divide-slate-100 overflow-y-auto">{rows.map((row) => <div key={row.key} className="flex gap-2 py-3 text-xs">{row.valid ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <AlertCircle className="size-4 shrink-0 text-rose-500" />}<div><div className="font-semibold text-slate-700">{row.title}</div><div className="mt-1 text-slate-400">{row.book} / {row.chapter}{row.materialType ? ` · ${row.materialType === 'EXAMPLE' ? '例题' : '习题'}` : ''}</div>{row.conflict ? <div className="mt-1 text-amber-700">重复：{row.conflict.reason}</div> : null}{row.issues.map((issue) => <div key={issue} className="mt-1 text-rose-600">{issue}</div>)}</div></div>)}</div>
      {canConfirm && confirmAction ? <form action={confirmAction} className="mt-4 space-y-3"><select name="strategy" required defaultValue="SKIP" className="atlas-input"><option value="SKIP">跳过重复题（推荐）</option><option value="UPDATE_BASIC">更新重复题基本信息，保留原重做轨迹</option><option value="CREATE_NEW">重复题也作为新题导入</option></select><button className="atlas-button-primary w-full"><Upload className="size-4" />确认回迁 JSON</button></form> : <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">存在不支持的数据，不能确认导入。</div>}
    </div> : state.jobId ? <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">文件在预览后发生变化，请重新生成预览。</div> : null}
  </div>;
}
