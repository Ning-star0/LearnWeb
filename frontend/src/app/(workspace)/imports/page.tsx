import { Download, FileJson } from 'lucide-react';
import { ImportCenter } from '@/components/mistake-atlas/import-center';
import { PageHeader } from '@/components/mistake-atlas/ui';

export default async function ImportsPage({ searchParams }: { searchParams: Promise<{ imported?: string }> }) {
  const { imported } = await searchParams;
  return <><PageHeader eyebrow="Mathematics · Portability" title="导入与导出" description="数学错题支持标准 Markdown 批量导入；完整 JSON 用于备份和迁移。导入必须先预览再确认。" action={<a href="/api/exports/full" className="atlas-button-primary"><Download className="size-4" />导出完整 JSON</a>} />{imported ? <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">已成功导入 {imported} 道数学错题。</div> : null}<div className="grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_360px]"><ImportCenter /><aside className="space-y-5"><div className="atlas-card p-5"><div className="flex items-center gap-2 font-semibold text-slate-800"><FileJson className="size-4" />完整 JSON</div><p className="mt-3 text-xs leading-6 text-slate-500">导出包含学科、教材、章节、知识点、错误类型、错题、重做轨迹和非敏感站点设置；不包含密码、会话、图标二进制和服务器密钥。</p><a href="/api/exports/full" className="atlas-button-secondary mt-4 w-full"><Download className="size-4" />立即下载</a></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-800"><strong>导入前准备</strong><br />Markdown 中的教材和章节名称必须已经存在。未知知识点或错误类型会被忽略，但不会自动创建，避免污染分类体系。</div></aside></div></>;
}
