import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const OLD_ANNOUNCEMENT_CONTENT =
  '背题模式适合考前快速记忆；答题模式会先作答再判题，答错自动进入错题本；AI 解析首次使用会提示付费说明，并提供 5 次试用。';

const DEFAULT_SETTINGS = [
  { key: 'announcementEnabled', value: 'true' },
  { key: 'announcementTitle', value: '学习功能说明' },
  {
    key: 'announcementContent',
    value:
      '欢迎使用思政刷题系统。\n\n1. 今日学习会沿用当前选择教材，减少每次进入前的重复选择。\n2. 背题模式适合考前记忆，可用键盘 1 标记已记住、2 标记未记住。\n3. 答题模式支持按教材、章节、题型练习，单选题和判断题点击后会直接判断正误。\n4. 错题本和待背题会自动沉淀，方便后续集中复习。\n5. AI 解析首次使用会提示付费说明，并提供 5 次试用；同一道题的解析会复用缓存，减少重复等待。',
  },
];

@Injectable()
export class AdminSettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    for (const setting of DEFAULT_SETTINGS) {
      const existing = await this.prisma.systemSetting.findUnique({ where: { key: setting.key } });
      if (existing?.key === 'announcementTitle' && existing.value === '复习公告') {
        await this.prisma.systemSetting.update({ where: { key: setting.key }, data: { value: setting.value } });
        continue;
      }
      if (existing?.key === 'announcementContent' && existing.value === OLD_ANNOUNCEMENT_CONTENT) {
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
}
