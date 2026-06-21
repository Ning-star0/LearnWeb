import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OLD_ANNOUNCEMENT_CONTENT =
  '背题模式适合考前快速记忆；答题模式会先作答再判题，答错自动进入错题本；AI 解析首次使用会提示付费说明，并提供 5 次试用。';

const ANNOUNCEMENT_DEFAULTS = {
  announcementEnabled: 'true',
  announcementTitle: '学习功能说明',
  announcementContent:
    '欢迎使用思政刷题系统。\n\n1. 今日学习会沿用当前选择教材，减少每次进入前的重复选择。\n2. 背题模式适合考前记忆，可用键盘 1 标记已记住、2 标记未记住。\n3. 答题模式支持按教材、章节、题型练习，单选题和判断题点击后会直接判断正误。\n4. 错题本和待背题会自动沉淀，方便后续集中复习。\n5. AI 解析首次使用会提示付费说明，并提供 5 次试用；同一道题的解析会复用缓存，减少重复等待。',
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

    const storedTitle = map.get('announcementTitle');
    const storedContent = map.get('announcementContent');

    return {
      enabled: (map.get('announcementEnabled') || ANNOUNCEMENT_DEFAULTS.announcementEnabled) !== 'false',
      title: storedTitle === '复习公告' ? ANNOUNCEMENT_DEFAULTS.announcementTitle : storedTitle || ANNOUNCEMENT_DEFAULTS.announcementTitle,
      content: storedContent === OLD_ANNOUNCEMENT_CONTENT
        ? ANNOUNCEMENT_DEFAULTS.announcementContent
        : storedContent || ANNOUNCEMENT_DEFAULTS.announcementContent,
    };
  }
}
