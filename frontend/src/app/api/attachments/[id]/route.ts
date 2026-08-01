import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const attachment = await prisma.attachment.findFirst({ where: { id, deletedAt: null, question: { status: { not: 'DELETED' } } } });
  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const uploadRoot = process.env.UPLOAD_ROOT;
  if (!uploadRoot) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  try {
    const buffer = await readFile(path.join(/* turbopackIgnore: true */ uploadRoot, attachment.storageName));
    return new NextResponse(buffer, { headers: { 'Content-Type': attachment.mimeType, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return NextResponse.json({ error: 'File missing' }, { status: 404 });
  }
}
