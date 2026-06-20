import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_SETTINGS = [
  { key: 'announcementEnabled', value: 'true' },
  { key: 'announcementTitle', value: '复习公告' },
  {
    key: 'announcementContent',
    value:
      '背题模式适合考前快速记忆；答题模式会先作答再判题，答错自动进入错题本；AI 解析首次使用会提示付费说明，并提供 5 次试用。',
  },
];

@Injectable()
export class AdminSettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    for (const setting of DEFAULT_SETTINGS) {
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
