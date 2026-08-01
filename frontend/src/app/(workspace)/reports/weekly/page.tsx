import Link from 'next/link';
import { CalendarDays, CheckCircle2, Clock3, Target } from 'lucide-react';
import { subDays, startOfDay } from 'date-fns';
import { PageHeader, ProgressBar, SectionTitle, StatCard } from '@/components/mistake-atlas/ui';
import { prisma } from '@/lib/prisma';

export default async function WeeklyReportPage() {
  const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
  const start = subDays(startOfDay(new Date()), 6);
  const [newQuestions, attempts, newlyMastered, points] = await Promise.all([
    prisma.question.count({ where: { subjectId: math.id, createdAt: { gte: start }, status: { not: 'DELETED' } } }),
    prisma.attempt.findMany({ where: { question: { subjectId: math.id }, attemptedAt: { gte: start } }, include: { question: { select: { chapterId: true } } } }),
    prisma.question.count({ where: { subjectId: math.id, masteredAt: { gte: start } } }),
    prisma.knowledgePoint.findMany({ where: { chapter: { textbook: { subjectId: math.id } } }, include: { questions: { include: { question: { select: { status: true, wrongCount: true } } } } } }),
  ]);
  const graded = attempts.filter((item) => item.result !== 'SKIPPED');
  const correct = attempts.filter((item) => item.result === 'INDEPENDENT_CORRECT').length;
  const accuracy = graded.length ? Math.round(correct / graded.length * 100) : 0;
  const weakPoints = points.map((point) => ({ name: point.name, count: point.questions.filter((item) => item.question.status === 'ACTIVE').length, wrong: point.questions.reduce((sum, item) => sum + item.question.wrongCount, 0) })).sort((a, b) => b.wrong - a.wrong).slice(0, 6);
  return <><PageHeader eyebrow="Mathematics · Weekly report" title="数学学习周报" description={`统计区间：${start.toLocaleDateString('zh-CN')} 至今。所有比例只基于已录入的错题和重做记录。`} action={<Link href="/reports/forecast" className="atlas-button-secondary"><CalendarDays className="size-4" />查看未来 7 天</Link>} /><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="本周新增错题" value={String(newQuestions)} note="真实录入数量" icon={Target} tone="amber" /><StatCard label="本周重做" value={String(attempts.length)} note="包含跳过记录" icon={Clock3} tone="blue" /><StatCard label="独立正确率" value={`${accuracy}%`} note={`${correct} 次独立做对`} icon={CheckCircle2} tone="green" /><StatCard label="新掌握" value={String(newlyMastered)} note="达到连续正确标准" icon={CheckCircle2} tone="slate" /></section><section className="mt-5 grid gap-5 xl:grid-cols-2"><div className="atlas-card p-6"><SectionTitle title="薄弱知识点" description="综合未掌握题数和历史错误次数排序" /><div className="space-y-5">{weakPoints.map((point) => <div key={point.name}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-700">{point.name}</span><span className="text-xs text-slate-400">{point.count} 道未掌握 · {point.wrong} 次错误</span></div><ProgressBar value={Math.min(100, point.wrong * 12 + point.count * 8)} tone="amber" /></div>)}{!weakPoints.length ? <p className="text-sm text-slate-400">数据不足，录入并重做错题后生成分析。</p> : null}</div></div><div className="atlas-card p-6"><SectionTitle title="本周结论" /><div className="space-y-3 text-sm leading-7 text-slate-600"><p>本周新增 <strong className="text-slate-900">{newQuestions}</strong> 道数学错题，完成 <strong className="text-slate-900">{attempts.length}</strong> 次重做。</p><p>独立正确率为 <strong className="text-slate-900">{accuracy}%</strong>。提示后做对和看答案后理解不会计入连续正确。</p><p>有 <strong className="text-slate-900">{newlyMastered}</strong> 道题在本周达到掌握标准。</p></div></div></section></>;
}
