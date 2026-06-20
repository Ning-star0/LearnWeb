import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ANNOUNCEMENT_DEFAULTS = {
  announcementEnabled: 'true',
  announcementTitle: '复习公告',
  announcementContent:
    '背题模式适合考前快速记忆；答题模式会先作答再判题，答错自动进入错题本；AI 解析首次使用会提示付费说明，并提供 5 次试用。',
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAnnouncement() {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: Object.keys(ANNOUNCEMENT_DEFAULTS),
        },
      },
    });
    const map = new Map(settings.map((item) => [item.key, item.value]));

    return {
      enabled: (map.get('announcementEnabled') || ANNOUNCEMENT_DEFAULTS.announcementEnabled) !== 'false',
      title: map.get('announcementTitle') || ANNOUNCEMENT_DEFAULTS.announcementTitle,
      content: map.get('announcementContent') || ANNOUNCEMENT_DEFAULTS.announcementContent,
    };
  }
}
