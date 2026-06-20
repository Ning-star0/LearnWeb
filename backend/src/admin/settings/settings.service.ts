import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminSettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async update(adminId: number, key: string, value: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    if (!setting) throw new NotFoundException('设置项不存在');

    const updated = await this.prisma.systemSetting.update({
      where: { key },
      data: { value },
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
