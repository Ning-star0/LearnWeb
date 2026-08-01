'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, CheckCircle2, FileJson, FileText, LoaderCircle, Upload } from 'lucide-react';
import { confirmImportJobAction, previewJsonImportAction, previewMarkdownImportAction, type ImportPreviewState, type JsonImportPreviewState } from '@/app/actions/import-actions';

const template = `---
schema_version: "1.0"
external_id: "math-2026-000001"
subject: "数学"
book: "未指定教材"
chapter_path:
  - "未分类章节"
question_type: "计算题"
source:
  page: 1
  question_number: "1"
difficulty: 3
priority: "MEDIUM"
occurred_at: "2026-08-01"
knowledge_points: []
error_types:
  - "其他"
tags:
  - "待整理"
image_files: []
next_review_at: "2026-08-03"
---

# 题目

计算极限：$\\lim_{x \\to \\infty} x(a^{1/x}-1)$

## 我的错因

没有想到使用变量代换。

## 一句话提醒

出现 $1/x$ 时先考虑令 $t=1/x$。

## 复盘备注

先把无穷远处的极限转化为 $t\\to0^+$。
`;

export function ImportCenter() {
  const [state, previewAction, pending] = useActionState<ImportPreviewState, FormData>(previewMarkdownImportAction, {});
  const [revision, setRevision] = useState(0);
  const [previewRevision, setPreviewRevision] = useState(-1);
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
      <label className="mt-5 block"><span className="atlas-label">Markdown 文件（可多选）或单个 ZIP</span><input name="files" type="file" accept=".md,.zip,text/markdown,text/plain,application/zip" multiple onChange={() => setRevision((value) => value + 1)} className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600" /></label>
      <label className="mt-4 block"><span className="atlas-label">粘贴 Markdown</span><textarea name="markdown" placeholder={template} onChange={() => setRevision((value) => value + 1)} className="mt-1 min-h-[360px] w-full rounded-xl border border-slate-200 bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400" /></label>
      {state.error ? <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{state.error}</div> : null}
      <div className="mt-4 flex justify-end"><button disabled={pending} className="atlas-button-secondary disabled:cursor-wait disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{pending ? '正在解析并检查…' : '生成服务端预览'}</button></div>
    </form>

    {previewCurrent ? <div className="atlas-card p-6">
      <div className="flex items-center justify-between gap-4"><h2 className="font-semibold text-slate-900">预览：{rows.length} 道题</h2><span className="text-xs text-slate-400">{state.sourceType === 'ZIP' ? 'ZIP' : 'Markdown'} · 作业 {state.jobId?.slice(-8)}</span></div>
      <div className="mt-4 divide-y divide-slate-100">{rows.map((row) => <div key={row.key} className="flex items-start gap-3 py-4">
        {row.valid ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">{row.sourceName} · 第 {row.documentIndex} 题 · {row.title}</div>
          <div className="mt-1 text-xs text-slate-400">{row.book} / {row.chapter}</div>
          {row.conflict ? <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">检测到重复：{row.conflict.reason}，现有题目 {row.conflict.code}「{row.conflict.title}」</div> : null}
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
      <div className="mt-3 max-h-72 divide-y divide-slate-100 overflow-y-auto">{rows.map((row) => <div key={row.key} className="flex gap-2 py-3 text-xs">{row.valid ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <AlertCircle className="size-4 shrink-0 text-rose-500" />}<div><div className="font-semibold text-slate-700">{row.title}</div><div className="mt-1 text-slate-400">{row.book} / {row.chapter}</div>{row.conflict ? <div className="mt-1 text-amber-700">重复：{row.conflict.reason}</div> : null}{row.issues.map((issue) => <div key={issue} className="mt-1 text-rose-600">{issue}</div>)}</div></div>)}</div>
      {canConfirm && confirmAction ? <form action={confirmAction} className="mt-4 space-y-3"><select name="strategy" required defaultValue="SKIP" className="atlas-input"><option value="SKIP">跳过重复题（推荐）</option><option value="UPDATE_BASIC">更新重复题基本信息，保留原重做轨迹</option><option value="CREATE_NEW">重复题也作为新题导入</option></select><button className="atlas-button-primary w-full"><Upload className="size-4" />确认回迁 JSON</button></form> : <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">存在不支持的数据，不能确认导入。</div>}
    </div> : state.jobId ? <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">文件在预览后发生变化，请重新生成预览。</div> : null}
  </div>;
}
