import { cache } from 'react';
import { prisma } from '@/lib/prisma';

export const defaultSiteSettings = {
  id: 'site',
  siteName: 'Mistake Atlas',
  siteSubtitle: '个人学习档案',
  siteDescription: '记录错因、管理重做、看见知识薄弱处',
  accessTitle: '这是一个私人学习空间',
  accessDescription: '只有获得主人授权的设备才能进入。',
  homeGreeting: '今天也从一道错题开始',
  brandColor: '#2458d3',
  iconMimeType: null as string | null,
  iconData: null as Uint8Array<ArrayBufferLike> | null,
  updatedAt: new Date(0),
};

export const getSiteSettings = cache(async () => {
  try {
    return await prisma.siteSettings.upsert({
      where: { id: 'site' },
      update: {},
      create: {},
    });
  } catch {
    return defaultSiteSettings;
  }
});
