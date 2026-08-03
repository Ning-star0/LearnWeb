import { ImportJobStatus } from '@prisma/client';
import { Download, FileJson, History, RotateCcw } from 'lucide-react';
import { rollbackImportJobAction } from '@/app/actions/import-actions';
import { DangerSubmit } from '@/components/mistake-atlas/danger-submit';
import { ImportCenter, JsonImportCenter } from '@/components/mistake-atlas/import-center';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

const statusLabels: Record<ImportJobStatus, string> = {
  PREVIEWED: '仅预览', COMPLETED: '已完成', ROLLED_BACK: '已回滚', FAILED: '失败',
};

export default async function ImportsPage({ searchParams }: { searchParams: Promise<{ completed?: string; rolledBack?: string }> }) {
  const [{ completed, rolledBack }, jobs] = await Promise.all([
    searchParams,
    prisma.importJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  return <>
    <PageHeader eyebrow="Mathematics · Portability" title="导入与导出" description="先由服务端解析、匹配分类和检测重复，再确认写入；每次正式导入都有报告并可整批回滚。" action={<a href="/api/exports/full" className="atlas-button-primary"><Download className="size-4" />导出完整 JSON</a>} />
    {completed ? <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">导入作业已完成，结果已写入数学错题库。</div> : null}
    {rolledBack ? <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">导入作业已回滚：新建题目已移除，被更新题目已恢复。</div> : null}
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_380px]">
      <div className="space-y-5"><ImportCenter /><JsonImportCenter /></div>
      <aside className="space-y-5">
        <div className="atlas-card p-5"><div className="flex items-center gap-2 font-semibold text-slate-800"><FileJson className="size-4" />完整 JSON</div><p className="mt-3 text-xs leading-6 text-slate-500">导出包含学科、教材、章节、知识点、错误类型、错题、重做轨迹、附件元数据和非敏感站点设置；不包含图片文件、密码、会话、图标二进制和服务器密钥。</p><a href="/api/exports/full" className="atlas-button-secondary mt-4 w-full"><Download className="size-4" />立即下载</a></div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-xs leading-6 text-blue-900"><strong>正式模板规则</strong><br />必须包含 schema_version、数学科目、教材、完整章节路径、题型、首次做错日期、至少一个错误类型，以及“# 题目”“## 我的错因”两个正文区块。勾选自动建立分类后，系统会在预览中列出新增项，确认时与题目一起写入并支持整批回滚。</div>
      </aside>
    </div>

    <section className="mt-6 atlas-card p-6">
      <div className="flex items-center gap-2"><History className="size-5 text-slate-500" /><h2 className="font-semibold text-slate-900">最近导入作业</h2></div>
      {jobs.length ? <div className="mt-4 divide-y divide-slate-100">{jobs.map((job) => {
        const rollbackAction = rollbackImportJobAction.bind(null, job.id);
        return <div key={job.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-800">{job.originalName || job.sourceType}</span><StatusPill tone={job.status === 'COMPLETED' ? 'green' : job.status === 'ROLLED_BACK' ? 'amber' : job.status === 'FAILED' ? 'red' : 'blue'}>{statusLabels[job.status]}</StatusPill></div><div className="mt-1 text-xs text-slate-400">{job.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} · 总计 {job.totalCount} · 成功 {job.successCount} · 跳过 {job.skippedCount} · 失败 {job.failedCount}</div></div>
          {job.status === ImportJobStatus.COMPLETED ? <form action={rollbackAction}><DangerSubmit label="回滚整批导入" confirmText="确定回滚这次导入吗？本次新建的题目会被移除，被覆盖的基本信息会恢复；后续手动添加到这些新题的记录也会一并删除。" /></form> : <div className="flex items-center gap-2 text-xs text-slate-400"><RotateCcw className="size-3.5" />{job.status === ImportJobStatus.ROLLED_BACK ? '已完成回滚' : '无需回滚'}</div>}
        </div>;
      })}</div> : <p className="mt-4 text-sm text-slate-400">还没有导入作业。</p>}
    </section>
  </>;
}
