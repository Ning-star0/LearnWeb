import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [subjects, questions, siteSettings, learningSettings] = await Promise.all([
    prisma.subject.findMany({ include: { textbooks: { include: { chapters: { include: { knowledgePoints: true } } } }, errorTypes: true } }),
    prisma.question.findMany({ include: { attempts: true, knowledgePoints: true, errorTypes: true, attachments: { select: { id: true, originalName: true, mimeType: true, size: true, sha256: true } } } }),
    prisma.siteSettings.findUnique({ where: { id: 'site' }, select: { siteName: true, siteSubtitle: true, siteDescription: true, accessTitle: true, accessDescription: true, homeGreeting: true, brandColor: true, updatedAt: true } }),
    prisma.learningSettings.findUnique({ where: { id: 'learning' } }),
  ]);
  const body = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), subjects, questions, siteSettings, learningSettings }, null, 2);
  await prisma.auditLog.create({ data: { action: 'FULL_JSON_EXPORTED', entity: 'System', detail: { subjects: subjects.length, questions: questions.length } } });
  return new NextResponse(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="mistake-atlas-${new Date().toISOString().slice(0, 10)}.json"`, 'Cache-Control': 'no-store' } });
}
