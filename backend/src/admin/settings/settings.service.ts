import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const OLD_ANNOUNCEMENT_CONTENT =
  '背题模式适合考前快速记忆；答题模式会先作答再判题，答错自动进入错题本；AI 解析首次使用会提示付费说明，并提供 5 次试用。';

const PREVIOUS_ANNOUNCEMENT_CONTENT =
  '欢迎使用思政' + '刷题' + '系统。\n\n1. 今日学习会沿用当前选择教材，减少每次进入前的重复选择。\n2. 背题模式适合考前记忆，可用键盘 1 标记已记住、2 标记未记住。\n3. 答题模式支持按教材、章节、题型练习，单选题和判断题点击后会直接判断正误。\n4. 错题本和待背题会自动沉淀，方便后续集中复习。\n5. AI 解析首次使用会提示付费说明，并提供 5 次试用；同一道题的解析会复用缓存，减少重复等待。';

const DEFAULT_SETTINGS = [
  { key: 'announcementEnabled', value: 'true' },
  { key: 'announcementTitle', value: '关于思政学习系统' },
  {
    key: 'announcementContent',
    value:
      '大家好，我创建这个网站，是希望把政治、思政课程复习中分散的题目整理到一个更方便使用的学习平台里。\n\n很多同学复习时会在 Excel、截图、文档和纸质资料之间来回查找题目，效率比较低，也不容易持续整理错题和不熟悉的内容。所以我做了这个系统，希望大家可以更方便地选择教材、章节和题型，进行背题、答题、错题复习，并在需要时查看 AI 解析。\n\n这个网站能帮助大家减少重复翻资料的时间，把更多精力放在理解知识点和巩固记忆上。无论是平时复习，还是期末备考，都可以用它来更系统地安排学习。\n\n目前网站还在不断优化中，功能和体验都会继续完善。如果你在使用过程中发现任何问题，或者有更好的建议，请及时通过反馈入口告诉我。',
  },
];

@Injectable()
export class AdminSettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    for (const setting of DEFAULT_SETTINGS) {
      const existing = await this.prisma.systemSetting.findUnique({ where: { key: setting.key } });
      if (existing?.key === 'announcementTitle' && ['复习公告', '学习功能说明'].includes(existing.value)) {
        await this.prisma.systemSetting.update({ where: { key: setting.key }, data: { value: setting.value } });
        continue;
      }
      if (
        existing?.key === 'announcementContent'
        && [OLD_ANNOUNCEMENT_CONTENT, PREVIOUS_ANNOUNCEMENT_CONTENT].includes(existing.value)
      ) {
        await this.prisma.systemSetting.update({ where: { key: setting.key }, data: { value: setting.value } });
        continue;
      }

      await this.prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }

    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async update(adminId: number, key: string, value: string) {
    const updated = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_SETTING',
        target: `Setting:${key}`,
        detail: `修改系统设置: ${key} = ${value}`,
      },
    });

    return updated;
  }

  async publishAnnouncement(
    adminId: number,
    data: { title: string; content: string; enabled?: boolean; pinned?: boolean },
  ) {
    const title = data.title?.trim();
    const content = data.content?.trim();
    if (!title || !content) {
      throw new BadRequestException('公告标题和内容不能为空');
    }

    const current = await this.prisma.systemSetting.findUnique({
      where: { key: 'announcementItems' },
    });
    let items: any[] = [];
    if (current?.value) {
      try {
        const parsed = JSON.parse(current.value);
        if (Array.isArray(parsed)) items = parsed;
      } catch {}
    }

    const nextItem = {
      id: randomUUID(),
      title,
      content,
      enabled: data.enabled !== false,
      pinned: Boolean(data.pinned),
      createdAt: new Date().toISOString(),
    };
    const latest = items[0];
    if (
      latest &&
      latest.title === nextItem.title &&
      latest.content === nextItem.content &&
      Boolean(latest.enabled) === nextItem.enabled &&
      Boolean(latest.pinned) === nextItem.pinned &&
      latest.createdAt &&
      Date.now() - new Date(latest.createdAt).getTime() < 60_000
    ) {
      return latest;
    }

    const nextItems = [
      nextItem,
      ...items.map((item) => ({ ...item, pinned: data.pinned ? false : Boolean(item.pinned) })),
    ].slice(0, 100);

    await this.prisma.systemSetting.upsert({
      where: { key: 'announcementItems' },
      update: { value: JSON.stringify(nextItems) },
      create: { key: 'announcementItems', value: JSON.stringify(nextItems) },
    });

    await Promise.all([
      this.prisma.systemSetting.upsert({
        where: { key: 'announcementEnabled' },
        update: { value: String(nextItem.enabled) },
        create: { key: 'announcementEnabled', value: String(nextItem.enabled) },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'announcementTitle' },
        update: { value: title },
        create: { key: 'announcementTitle', value: title },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'announcementContent' },
        update: { value: content },
        create: { key: 'announcementContent', value: content },
      }),
    ]);

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'PUBLISH_ANNOUNCEMENT',
        target: `Announcement:${nextItem.id}`,
        detail: `发布公告: ${title}`,
      },
    });

    return nextItem;
  }
}
