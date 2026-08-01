import { ArrowDownRight, ArrowRight, ArrowUpRight, Plus, Tags } from 'lucide-react';
import { PageHeader, ProgressBar, StatusPill } from '@/components/mistake-atlas/ui';
import { errorTypes } from '@/lib/mistake-atlas-data';

export default function ErrorTypesPage() {
  return <><PageHeader eyebrow="Error taxonomy" title="错误类型" description="错误类型是可配置实体，不写死在代码里。趋势用于判断问题是否正在改善。" action={<button className="atlas-button-primary"><Plus className="size-4" />新建错误类型</button>} /><div className="grid gap-4 lg:grid-cols-2">{errorTypes.map((item, index) => { const TrendIcon = item.trend === '改善中' ? ArrowDownRight : item.trend === '需关注' ? ArrowUpRight : ArrowRight; return <div key={item.name} className="atlas-card p-5"><div className="flex items-start gap-4"><div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500"><Tags className="size-5" /></div><div className="flex-1"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">{item.name}</h2><StatusPill tone={item.trend === '改善中' ? 'green' : item.trend === '需关注' ? 'amber' : 'slate'}><TrendIcon className="mr-1 size-3" />{item.trend}</StatusPill></div><p className="mt-1 text-xs text-slate-400">共出现 {item.count} 次 · 当前启用</p><div className="mt-4"><ProgressBar value={(item.count / 10) * 100} tone={index < 2 ? 'amber' : 'blue'} /></div></div></div></div>; })}</div></>;
}
