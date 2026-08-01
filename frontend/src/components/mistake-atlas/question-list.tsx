import Link from 'next/link';
import { ArrowRight, Inbox } from 'lucide-react';
import { StatusPill } from './ui';

type QuestionListItem = {
  id: string; code: string; title: string; status: string; correctStreak: number; attemptCount: number;
  wrongCount: number; nextReviewAt: Date | null; priority: number;
  textbook: { name: string }; chapter: { name: string };
  knowledgePoints: { knowledgePoint: { name: string } }[];
  errorTypes: { errorType: { name: string } }[];
};

const statusLabel: Record<string, string> = { ACTIVE: '学习中', MASTERED: '已掌握', ARCHIVED: '已归档', DELETED: '已删除' };

export function QuestionList({ questions, emptyText = '暂时没有符合条件的错题。' }: { questions: QuestionListItem[]; emptyText?: string }) {
  if (!questions.length) return <div className="atlas-card grid min-h-56 place-items-center p-8 text-center"><div><Inbox className="mx-auto size-9 text-slate-300" /><p className="mt-3 text-sm text-slate-500">{emptyText}</p></div></div>;
  return <div className="atlas-card overflow-hidden"><div className="divide-y divide-slate-100">{questions.map((question) => <Link key={question.id} href={`/questions/${question.id}`} className="grid gap-4 p-5 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_190px_110px_30px] sm:items-center">
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold text-slate-400">{question.code}</span><StatusPill tone={question.status === 'MASTERED' ? 'green' : question.wrongCount >= 3 ? 'red' : 'blue'}>{question.wrongCount >= 3 && question.status === 'ACTIVE' ? '反复错误' : statusLabel[question.status]}</StatusPill>{question.priority === 3 ? <StatusPill tone="red">高优先级</StatusPill> : null}</div><h3 className="mt-2 truncate text-sm font-semibold text-slate-900">{question.title}</h3><p className="mt-1 truncate text-xs text-slate-400">{question.textbook.name} / {question.chapter.name}{question.knowledgePoints[0] ? ` · ${question.knowledgePoints[0].knowledgePoint.name}` : ''}{question.errorTypes[0] ? ` · ${question.errorTypes[0].errorType.name}` : ''}</p></div>
    <div className="text-xs text-slate-500"><div>连续独立正确 <strong className="text-slate-800">{question.correctStreak}/3</strong></div><div className="mt-1">累计重做 {question.attemptCount} 次 · 错误 {question.wrongCount} 次</div></div>
    <div className="text-xs text-slate-500"><div className="font-medium text-slate-700">下次复习</div><div className="mt-1">{question.nextReviewAt ? question.nextReviewAt.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未安排'}</div></div><ArrowRight className="size-4 text-slate-300" />
  </Link>)}</div></div>;
}
