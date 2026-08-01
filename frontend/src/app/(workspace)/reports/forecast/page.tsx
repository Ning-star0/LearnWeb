import { CalendarDays } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/mistake-atlas/ui';
import { forecast } from '@/lib/mistake-atlas-data';

export default function ForecastPage() {
  return <><PageHeader eyebrow="7-day forecast" title="学习预报" description="只根据复习计划估算未来工作量，不预测考试成绩。" /><div className="grid gap-4 sm:grid-cols-3"><StatCard label="未来 7 天" value="35" note="平均每天 5 道" icon={CalendarDays} /><StatCard label="已逾期" value="2" note="建议今天优先处理" icon={CalendarDays} tone="amber" /><StatCard label="预计用时" value="4.8h" note="按历史平均耗时估算" icon={CalendarDays} tone="slate" /></div><div className="mt-5 atlas-card p-6"><div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">{forecast.map((count, index) => <div key={index} className="rounded-xl border border-slate-200 p-4"><div className="text-xs text-slate-400">第 {index + 1} 天</div><div className="mt-2 font-serif text-3xl font-semibold">{count}</div><div className="text-xs text-slate-400">道到期</div></div>)}</div></div></>;
}
