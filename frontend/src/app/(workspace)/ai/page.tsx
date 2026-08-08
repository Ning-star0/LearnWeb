import { Check, Database, FileArchive, Hourglass, Settings2, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { decideAgentProposalAction, importChatGptMemoryAction } from '@/app/actions/agent-actions';
import { AiWorkbench } from '@/components/mistake-atlas/ai-workbench';
import { PageHeader, SectionTitle, StatusPill } from '@/components/mistake-atlas/ui';
import { getAiProviderConfig } from '@/lib/ai-provider';
import { prisma } from '@/lib/prisma';

export default async function AiPage({ searchParams }: { searchParams: Promise<{ memoryImported?: string }> }) {
  const [params, math, provider, memoryCount, proposals] = await Promise.all([
    searchParams,
    prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } }),
    getAiProviderConfig(),
    prisma.agentMemory.count({ where: { active: true } }),
    prisma.agentProposal.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  const questions = await prisma.question.findMany({
    where: { subjectId: math.id, status: { not: 'DELETED' } },
    include: {
      chapter: true,
      knowledgePoints: { include: { knowledgePoint: true } },
      errorTypes: { include: { errorType: true } },
      attempts: { orderBy: { attemptedAt: 'desc' }, take: 5 },
    },
    orderBy: [{ wrongCount: 'desc' }, { updatedAt: 'desc' }],
    take: 50,
  });
  const context = {
    subject: '数学',
    generatedAt: new Date().toISOString(),
    summary: {
      questions: questions.length,
      mastered: questions.filter((item) => item.status === 'MASTERED').length,
      repeatedErrors: questions.filter((item) => item.wrongCount >= 3).length,
    },
    questions: questions.map((item) => ({
      code: item.code,
      title: item.title,
      chapter: item.chapter.name,
      wrongReason: item.wrongReason,
      reflection: item.reflection,
      correctStreak: item.correctStreak,
      wrongCount: item.wrongCount,
      status: item.status,
      knowledgePoints: item.knowledgePoints.map((entry) => entry.knowledgePoint.name),
      errorTypes: item.errorTypes.map((entry) => entry.errorType.name),
      recentAttempts: item.attempts.map((attempt) => ({ result: attempt.result, attemptedAt: attempt.attemptedAt })),
    })),
  };
  const enabled = provider.enabled && Boolean(provider.apiKey);

  return <>
    <PageHeader eyebrow="Mathematics · Personal agent" title="AI 学习智能体" description="DeepSeek 负责推理；Hermes 式记忆让它跨会话理解你的目标和学习变化。读取操作可直接进行，任何写入都先进入待批准队列。" action={<div className="flex gap-2"><StatusPill tone={enabled ? 'green' : 'amber'}>{enabled ? `${provider.model} 已启用` : '等待 DeepSeek 配置'}</StatusPill><Link href="/settings" className="atlas-button-secondary"><Settings2 className="size-4" />设置</Link></div>} />
    {params.memoryImported !== undefined ? <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">已导入 {params.memoryImported} 个 ChatGPT 历史片段；重复片段已自动跳过。</div> : null}

    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <AiWorkbench enabled={enabled} context={context} />
      <aside className="space-y-5">
        <div className="atlas-card p-5">
          <SectionTitle title="记忆系统" description="核心记忆按会话注入；ChatGPT 历史按问题相关性检索。" action={<Database className="size-5 text-blue-500" />} />
          <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-blue-50 p-4"><div className="font-serif text-2xl font-semibold text-slate-900">{memoryCount}</div><div className="mt-1 text-[10px] text-slate-500">有效记忆片段</div></div><div className="rounded-xl bg-amber-50 p-4"><div className="font-serif text-2xl font-semibold text-slate-900">{proposals.length}</div><div className="mt-1 text-[10px] text-slate-500">待批准操作</div></div></div>
          <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-slate-700"><FileArchive className="size-4 text-blue-500" />导入 ChatGPT 记忆与历史</summary>
            <form action={importChatGptMemoryAction} className="mt-4 space-y-3"><p className="text-[11px] leading-5 text-slate-500">支持 ChatGPT 数据导出 ZIP（自动读取 conversations.json）、JSON、Markdown 或 TXT，最大 20MB。导入内容不会自动获得修改网站的权限。</p><input name="memoryFile" type="file" required accept=".zip,.json,.md,.txt,application/zip,application/json,text/markdown,text/plain" className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /><button className="atlas-button-primary w-full"><FileArchive className="size-4" />导入到长期记忆</button></form>
          </details>
        </div>

        <div className="atlas-card p-5">
          <SectionTitle title="待批准操作" description="只有明确批准后，受支持的操作才会执行。" action={<Hourglass className="size-5 text-amber-500" />} />
          <div className="mt-4 space-y-3">{proposals.map((proposal) => <article key={proposal.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><StatusPill tone="amber">{proposal.actionType}</StatusPill><time className="text-[10px] text-slate-400">{proposal.createdAt.toLocaleString('zh-CN')}</time></div><h3 className="mt-2 text-sm font-semibold text-slate-800">{proposal.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{proposal.summary}</p><div className="mt-3 grid grid-cols-2 gap-2"><form action={decideAgentProposalAction.bind(null, proposal.id, 'reject')}><button className="atlas-button-secondary w-full"><X className="size-4" />拒绝</button></form><form action={decideAgentProposalAction.bind(null, proposal.id, 'approve')}><button className="atlas-button-primary w-full"><Check className="size-4" />批准</button></form></div></article>)}{!proposals.length ? <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">目前没有等待你确认的修改。</div> : null}</div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-xs leading-6 text-blue-800"><ShieldCheck className="mb-2 size-5" /><strong>权限边界</strong><br />智能体可以分析全站学习数据；新增、编辑、删除与设置更改必须先形成提案。未支持的提案即使批准，也只记录方向，不会被伪装成已经执行。</div>
      </aside>
    </div>
  </>;
}
