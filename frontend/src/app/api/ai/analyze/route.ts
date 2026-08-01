import { NextResponse } from 'next/server';
import { getCurrentUser, requestIdentity } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || '').replace(/\/$/, '');
  const model = process.env.AI_MODEL;
  if (!apiKey || !baseUrl || !model) return NextResponse.json({ error: '服务器尚未配置 AI_API_KEY、AI_BASE_URL 和 AI_MODEL。' }, { status: 503 });
  const body = await request.json().catch(() => null) as { prompt?: string; context?: unknown } | null;
  if (!body?.prompt || body.prompt.length > 2000) return NextResponse.json({ error: '分析问题不能为空且不能超过 2000 字。' }, { status: 400 });
  const serializedContext = JSON.stringify(body.context ?? {}).slice(0, 80000);
  const identity = await requestIdentity();
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: 'system', content: '你是一名严谨的个人学习分析助手。只分析用户提供的数学错题数据，不编造未提供的成绩。用中文给出可执行建议。' }, { role: 'user', content: `${body.prompt}\n\n学习上下文：\n${serializedContext}` }] }), signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS) || 60000) });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    const result = await response.json();
    const answer = result?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string') throw new Error('Provider 返回格式不兼容');
    await prisma.auditLog.create({ data: { action: 'AI_ANALYSIS_SUCCEEDED', entity: 'User', entityId: user.id, ip: identity.ip, detail: { model, contextChars: serializedContext.length } } });
    return NextResponse.json({ answer });
  } catch (error) {
    await prisma.auditLog.create({ data: { action: 'AI_ANALYSIS_FAILED', entity: 'User', entityId: user.id, ip: identity.ip, detail: { message: error instanceof Error ? error.message.slice(0, 200) : 'unknown' } } });
    return NextResponse.json({ error: 'AI Provider 请求失败，请检查服务器配置。' }, { status: 502 });
  }
}
