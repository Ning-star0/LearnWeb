'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function value(formData: FormData, key: string) { return String(formData.get(key) || '').trim(); }

export async function updateBrandingAction(formData: FormData) {
  await requireUser();
  const siteName = value(formData, 'siteName').slice(0, 60);
  const siteSubtitle = value(formData, 'siteSubtitle').slice(0, 80);
  const siteDescription = value(formData, 'siteDescription').slice(0, 240);
  const accessTitle = value(formData, 'accessTitle').slice(0, 100);
  const accessDescription = value(formData, 'accessDescription').slice(0, 300);
  const homeGreeting = value(formData, 'homeGreeting').slice(0, 100);
  const rawColor = value(formData, 'brandColor');
  const brandColor = /^#[0-9a-fA-F]{6}$/.test(rawColor) ? rawColor : '#2458d3';
  if (!siteName || !siteSubtitle || !accessTitle) throw new Error('网站名称、副标题和访问页标题不能为空。');

  const data: {
    siteName: string; siteSubtitle: string; siteDescription: string; accessTitle: string;
    accessDescription: string; homeGreeting: string; brandColor: string;
    iconData?: Uint8Array<ArrayBuffer>; iconMimeType?: string;
  } = { siteName, siteSubtitle, siteDescription, accessTitle, accessDescription, homeGreeting, brandColor };
  const icon = formData.get('icon');
  if (icon instanceof File && icon.size) {
    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']);
    if (!allowed.has(icon.type) || icon.size > 1024 * 1024) throw new Error('网站图标仅支持 PNG、JPG、WEBP 或 ICO，最大 1MB。');
    data.iconData = new Uint8Array(await icon.arrayBuffer());
    data.iconMimeType = icon.type;
  }
  await prisma.siteSettings.upsert({ where: { id: 'site' }, update: data, create: { id: 'site', ...data } });
  await prisma.auditLog.create({ data: { action: 'BRANDING_UPDATED', entity: 'SiteSettings', entityId: 'site' } });
  revalidatePath('/', 'layout');
  redirect('/settings?brand=saved');
}

export async function updateLearningSettingsAction(formData: FormData) {
  await requireUser();
  const masteryThreshold = Math.min(10, Math.max(1, Number(formData.get('masteryThreshold')) || 3));
  const repeatedErrorThreshold = Math.min(20, Math.max(2, Number(formData.get('repeatedErrorThreshold')) || 3));
  const reviewIntervals = value(formData, 'reviewIntervals').split(/[,，\s]+/).map(Number).filter((item) => Number.isInteger(item) && item > 0 && item <= 365);
  await prisma.learningSettings.upsert({ where: { id: 'learning' }, update: { masteryThreshold, repeatedErrorThreshold, reviewIntervals: reviewIntervals.length ? reviewIntervals : [1, 3, 7, 14, 30] }, create: { masteryThreshold, repeatedErrorThreshold, reviewIntervals: reviewIntervals.length ? reviewIntervals : [1, 3, 7, 14, 30] } });
  revalidatePath('/settings');
  redirect('/settings?learning=saved');
}
