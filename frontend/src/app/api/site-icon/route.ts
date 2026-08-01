import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'site' } }).catch(() => null);
  if (settings?.iconData && settings.iconMimeType) {
    return new NextResponse(new Uint8Array(settings.iconData), {
      headers: {
        'Content-Type': settings.iconMimeType,
        'Cache-Control': 'public, max-age=300, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const color = /^#[0-9a-fA-F]{6}$/.test(settings?.brandColor || '') ? settings!.brandColor : '#2458d3';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${color}"/><path d="M18 17h28M21 47h22M23 18l9 14-9 14M41 18 32 32l9 14" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' },
  });
}
