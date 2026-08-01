import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { PageHeader, ProgressBar, SectionTitle, StatCard, StatusPill } from '@/components/mistake-atlas/ui';
import { errorTypes, forecast, questions, weeklyBars } from '@/lib/mistake-atlas-data';

const reviewQueue = questions.filter((question) => question.status !== '已掌握').slice(0, 4);

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="个人学习台"
        title="下午好，baixing"
        description="先处理到期复习，再看薄弱知识点。这里的统计只反映已录入错题，不代表整章考试能力。"
        action={
          <div className="flex gap-2">
            <Link href="/reviews" className="atlas-button-secondary"><RotateCcw className="size-4" />开始复习</Link>
            <Link href="/questions/new" className="atlas-button-primary"><Plus className="size-4" />录入错题</Link>
          </div>
        }
      />

      <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0" />
          <div><strong>框架预览已启用。</strong> 当前页面使用演示数据，用于确认信息架构与视觉方向；真实登录、数据库、图片和导入将在下一阶段接入。</div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="今日待复习" value="6" note="其中 2 道已经逾期" icon={CalendarClock} tone="blue" />
        <StatCard label="当前未掌握" value="27" note="占已录入错题的 79.4%" icon={Target} tone="amber" />
        <StatCard label="本周重做" value="18" note="比上周多完成 5 次" icon={RotateCcw} tone="slate" />
        <StatCard label="总体掌握率" value="20.6%" note="7 / 34 道错题已掌握" icon={CheckCircle2} tone="green" />
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <div className="atlas-card p-5 sm:p-6">
          <SectionTitle
            title="今日复习队列"
            description="优先级综合逾期时间、错误次数和掌握进度计算"
            action={<Link href="/reviews" className="text-xs font-semibold text-[var(--atlas-blue)] hover:underline">查看全部</Link>}
          />
          <div className="divide-y divide-slate-100">
            {reviewQueue.map((question, index) => (
              <div key={question.id} className="grid gap-4 py-4 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-center">
                <div className="grid size-8 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{String(index + 1).padStart(2, '0')}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold text-slate-900">{question.title}</div>
                    {question.priority === '紧急' ? <StatusPill tone="red">高风险</StatusPill> : null}
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-400">{question.chapter} · {question.errorType}</div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-700">连续正确 {question.streak}/3</div>
                    <div className="mt-1 text-[11px] text-slate-400">{question.nextReview}</div>
                  </div>
                  <button className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-[var(--atlas-blue)]"><ArrowRight className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="atlas-card p-5 sm:p-6">
          <SectionTitle title="掌握进度" description="连续独立做对 3 次后自动掌握" />
          <div className="flex items-center gap-6 py-3">
            <div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: 'conic-gradient(#2458d3 0 20.6%, #e9eef6 20.6% 100%)' }}>
              <div className="grid size-20 place-items-center rounded-full bg-white text-center">
                <div><div className="font-serif text-2xl font-semibold text-slate-950">20.6%</div><div className="text-[10px] text-slate-400">总体掌握</div></div>
              </div>
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <div><div className="mb-1.5 flex justify-between"><span className="text-slate-500">已掌握</span><strong>7</strong></div><ProgressBar value={20.6} tone="green" /></div>
              <div><div className="mb-1.5 flex justify-between"><span className="text-slate-500">学习中</span><strong>21</strong></div><ProgressBar value={61.8} /></div>
              <div><div className="mb-1.5 flex justify-between"><span className="text-slate-500">反复错误</span><strong>4</strong></div><ProgressBar value={11.8} tone="amber" /></div>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
            本周有 <strong className="text-slate-800">2 道题</strong> 达到掌握标准，另有 1 道已掌握题因再次做错回退到学习中。
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="atlas-card p-5 sm:p-6 xl:col-span-2">
          <SectionTitle title="最近 7 天学习节奏" description="柱高表示每日重做完成度，折线将在真实统计接入后启用" action={<StatusPill tone="blue">18 次重做</StatusPill>} />
          <div className="mt-7 flex h-48 items-end gap-3 border-b border-slate-200 px-1">
            {weeklyBars.map((height, index) => (
              <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div className="mx-auto w-full max-w-12 rounded-t-lg bg-blue-100 transition hover:bg-[var(--atlas-blue)]" style={{ height: `${height}%` }} />
                <div className="pb-2 text-center text-[11px] text-slate-400">{['一', '二', '三', '四', '五', '六', '日'][index]}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-2"><TrendingUp className="size-4 text-emerald-600" />独立正确率 61.1%，较上周提升 8.4%</span>
            <span className="flex items-center gap-2"><Clock3 className="size-4 text-amber-600" />平均每次重做 8 分 20 秒</span>
          </div>
        </div>

        <div className="atlas-card p-5 sm:p-6">
          <SectionTitle title="薄弱错误类型" description="按当前风险排序" />
          <div className="space-y-4">
            {errorTypes.slice(0, 4).map((item, index) => (
              <div key={item.name}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700"><span className="mr-2 text-xs text-slate-300">0{index + 1}</span>{item.name}</span>
                  <span className="text-xs text-slate-400">{item.count} 次</span>
                </div>
                <ProgressBar value={(item.count / 10) * 100} tone={index < 2 ? 'amber' : 'blue'} />
              </div>
            ))}
          </div>
          <Link href="/error-types" className="mt-5 flex items-center gap-1 text-xs font-semibold text-[var(--atlas-blue)]">查看完整分析 <ArrowRight className="size-3.5" /></Link>
        </div>
      </section>

      <section className="mt-5 atlas-card p-5 sm:p-6">
        <SectionTitle title="未来 7 天复习预报" description="根据每道题的下次复习时间汇总，不预测考试成绩" action={<Link href="/reports/forecast" className="text-xs font-semibold text-[var(--atlas-blue)]">调整计划</Link>} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {forecast.map((count, index) => (
            <div key={index} className={`rounded-xl border p-4 ${index === 0 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <div className="text-xs text-slate-400">{['今天', '明天', '8 月 3 日', '8 月 4 日', '8 月 5 日', '8 月 6 日', '8 月 7 日'][index]}</div>
              <div className="mt-2 flex items-end gap-1"><strong className="font-serif text-2xl text-slate-900">{count}</strong><span className="pb-0.5 text-xs text-slate-400">道</span></div>
              <div className="mt-3 h-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--atlas-blue)]" style={{ width: `${count * 10}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
