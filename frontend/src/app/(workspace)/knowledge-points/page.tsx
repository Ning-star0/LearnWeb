import { Network, Plus, Search } from 'lucide-react';
import { PageHeader, ProgressBar, StatusPill } from '@/components/mistake-atlas/ui';

const points = [
  ['函数极限', '变量代换', 6, 33], ['函数极限', '等价无穷小', 5, 40], ['定积分', '换元积分法', 4, 50], ['复合函数', '链式法则', 4, 25], ['连续性', '左右极限', 3, 67],
];

export default function KnowledgePointsPage() {
  return <><PageHeader eyebrow="Knowledge map" title="知识点" description="知识点按教材章节组织，可查看每个知识点的错题数、重做数与掌握率。" action={<button className="atlas-button-primary"><Plus className="size-4" />新建知识点</button>} /><div className="atlas-card overflow-hidden"><div className="border-b border-slate-100 p-5"><div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="atlas-input pl-9" placeholder="搜索知识点…" /></div></div><div className="divide-y divide-slate-100">{points.map(([chapter, point, count, progress]) => <div key={String(point)} className="grid gap-4 p-5 sm:grid-cols-[44px_minmax(0,1fr)_120px_220px] sm:items-center"><div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500"><Network className="size-5" /></div><div><h3 className="font-semibold text-slate-900">{point}</h3><p className="mt-1 text-xs text-slate-400">张宇 1000 题 / {chapter}</p></div><StatusPill>{count} 道错题</StatusPill><div><div className="mb-2 flex justify-between text-xs text-slate-500"><span>掌握率</span><strong>{progress}%</strong></div><ProgressBar value={Number(progress)} /></div></div>)}</div></div></>;
}
