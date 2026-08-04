import Link from 'next/link';
import { ArrowRight, Inbox } from 'lucide-react';
import { questionReference } from '@/lib/question-reference';
import { StatusPill } from './ui';

type QuestionListItem = {
  id: string; code: string; title: string; materialType: string; status: string; correctStreak: number; attemptCount: number;
  wrongCount: number; nextReviewAt: Date | null; priority: number; sourcePage: string | null; sourceQuestionNumber: string | null;
  latestResultLabel?: string | null; latestAttemptAt?: Date | null;
  textbook: { name: string }; chapter: { name: string };
  knowledgePoints: { knowledgePoint: { name: string } }[];
  errorTypes: { errorType: { name: string } }[];
};

const statusLabel: Record<string, string> = { ACTIVE: '学习中', MASTERED: '已掌握', ARCHIVED: '已归档', DELETED: '已删除' };

export function QuestionList({ questions, emptyText = '暂时没有符合条件的错题。' }: { questions: QuestionListItem[]; emptyText?: string }) {
  if (!questions.length) return <div className="atlas-card grid min-h-56 place-items-center p-8 text-center"><div><Inbox className="mx-auto size-9 text-slate-300" /><p className="mt-3 text-sm text-slate-500">{emptyText}</p></div></div>;
  return <div className="atlas-card overflow-hidden"><div className="divide-y divide-slate-100">{questions.map((question) => {
    const reference = questionReference(question);
    return <Link key={question.id} href={`/questions/${question.id}`} className="grid gap-4 p-4 transition hover:bg-blue-50/40 sm:grid-cols-[minmax(0,1fr)_160px_90px_24px] sm:items-center">
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-serif text-lg font-semibold text-slate-950">{reference.primary}</h3>{reference.page ? <span className="text-xs text-slate-400">{reference.page}</span> : null}<StatusPill tone={question.status === 'MASTERED' ? 'green' : question.wrongCount >= 3 ? 'red' : 'blue'}>{question.wrongCount >= 3 && question.status === 'ACTIVE' ? '反复错误' : statusLabel[question.status]}</StatusPill></div><p className="mt-1 truncate text-sm text-slate-600">{question.title}</p><div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[11px] text-slate-400">{question.textbook.name} / {question.chapter.name}</span>{question.knowledgePoints.slice(0, 3).map(({ knowledgePoint }) => <span key={knowledgePoint.name} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-500">{knowledgePoint.name}</span>)}<span className="text-[10px] text-slate-300">编号 {question.code}</span></div></div>
    <div className="text-xs text-slate-500"><div>连续独立正确 <strong className="text-slate-800">{question.correctStreak}/3</strong></div><div className="mt-1">累计重做 {question.attemptCount} 次 · 错误 {question.wrongCount} 次</div>{question.latestResultLabel ? <div className="mt-1 font-medium text-slate-700">最近：{question.latestResultLabel}</div> : null}</div>
    <div className="text-xs text-slate-500"><div className="font-medium text-slate-700">下次复习</div><div className="mt-1">{question.nextReviewAt ? question.nextReviewAt.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未安排'}</div></div><ArrowRight className="size-4 text-slate-300" />
  </Link>;})}</div></div>;
}
