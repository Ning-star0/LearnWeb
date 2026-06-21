import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OLD_ANNOUNCEMENT_CONTENT =
  '背题模式适合考前快速记忆；答题模式会先作答再判题，答错自动进入错题本；AI 解析首次使用会提示付费说明，并提供 5 次试用。';

const PREVIOUS_ANNOUNCEMENT_CONTENT =
  '欢迎使用思政' + '刷题' + '系统。\n\n1. 今日学习会沿用当前选择教材，减少每次进入前的重复选择。\n2. 背题模式适合考前记忆，可用键盘 1 标记已记住、2 标记未记住。\n3. 答题模式支持按教材、章节、题型练习，单选题和判断题点击后会直接判断正误。\n4. 错题本和待背题会自动沉淀，方便后续集中复习。\n5. AI 解析首次使用会提示付费说明，并提供 5 次试用；同一道题的解析会复用缓存，减少重复等待。';

const ANNOUNCEMENT_DEFAULTS = {
  announcementEnabled: 'true',
  announcementTitle: '关于思政学习系统',
  announcementContent:
    '大家好，我创建这个网站，是希望把政治、思政课程复习中分散的题目整理到一个更方便使用的学习平台里。\n\n很多同学复习时会在 Excel、截图、文档和纸质资料之间来回查找题目，效率比较低，也不容易持续整理错题和不熟悉的内容。所以我做了这个系统，希望大家可以更方便地选择教材、章节和题型，进行背题、答题、错题复习，并在需要时查看 AI 解析。\n\n这个网站能帮助大家减少重复翻资料的时间，把更多精力放在理解知识点和巩固记忆上。无论是平时复习，还是期末备考，都可以用它来更系统地安排学习。\n\n目前网站还在不断优化中，功能和体验都会继续完善。如果你在使用过程中发现任何问题，或者有更好的建议，请及时通过反馈入口告诉我。',
};

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  pinned: boolean;
  createdAt: string;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAnnouncement() {
    const announcements = await this.getAnnouncements();
    const visible = announcements.filter((item) => item.enabled);
    const pinned = visible.find((item) => item.pinned);
    return pinned || visible[0] || {
      enabled: false,
      title: '',
      content: '',
      pinned: false,
      id: '',
      createdAt: new Date().toISOString(),
    };
  }

  async getAnnouncements(): Promise<AnnouncementItem[]> {
    const history = await this.prisma.systemSetting.findUnique({
      where: { key: 'announcementItems' },
    });
    if (history?.value) {
      try {
        const parsed = JSON.parse(history.value);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item) => item?.title && item?.content)
            .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || String(b.createdAt).localeCompare(String(a.createdAt)));
        }
      } catch {}
    }

    const legacy = await this.getLegacyAnnouncement();
    if (!legacy.enabled) return [];
    return [{
      id: `legacy-${Buffer.from(`${legacy.title}:${legacy.content}`).toString('base64').slice(0, 16)}`,
      title: legacy.title,
      content: legacy.content,
      enabled: legacy.enabled,
      pinned: false,
      createdAt: legacy.createdAt,
    }];
  }

  private async getLegacyAnnouncement() {
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
    const latestUpdatedAt = settings
      .map((item) => item.updatedAt)
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      enabled: (map.get('announcementEnabled') || ANNOUNCEMENT_DEFAULTS.announcementEnabled) !== 'false',
      title: storedTitle === '复习公告' ? ANNOUNCEMENT_DEFAULTS.announcementTitle : storedTitle || ANNOUNCEMENT_DEFAULTS.announcementTitle,
      content: storedContent === OLD_ANNOUNCEMENT_CONTENT || storedContent === PREVIOUS_ANNOUNCEMENT_CONTENT
        ? ANNOUNCEMENT_DEFAULTS.announcementContent
        : storedContent || ANNOUNCEMENT_DEFAULTS.announcementContent,
      createdAt: (latestUpdatedAt || new Date()).toISOString(),
    };
  }
}
