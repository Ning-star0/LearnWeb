import { ArchiveRestore, Trash2 } from 'lucide-react';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';

export default function TrashPage() {
  return <><PageHeader eyebrow="Recycle bin" title="回收站" description="错题和附件优先软删除；恢复操作会重新计算相关统计。" /><div className="atlas-card p-10 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Trash2 className="size-6" /></div><h2 className="mt-4 font-semibold text-slate-900">回收站暂无内容</h2><p className="mt-2 text-sm text-slate-400">以后删除的错题会在这里保留一段时间。</p><button className="atlas-button-secondary mt-5"><ArchiveRestore className="size-4" />查看恢复策略</button><div className="mt-5"><StatusPill>框架阶段</StatusPill></div></div></>;
}
