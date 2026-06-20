import { Controller, Get, Put, Post, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminSettingsService } from './settings.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Controller('admin/settings')
@UseGuards(AdminGuard)
export class AdminSettingsController {
  constructor(
    private settingsService: AdminSettingsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async findAll() {
    return this.settingsService.findAll();
  }

  @Put(':key')
  async update(
    @Param('key') key: string,
    @CurrentUser('id') adminId: number,
    @Body('value') value: string,
  ) {
    return this.settingsService.update(adminId, key, value);
  }

  /** 上传收款二维码 */
  @Post('qrcode')
  @UseInterceptors(FileInterceptor('file'))
  async uploadQrCode(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') adminId: number,
  ) {
    if (!file) return { code: -1, message: '请上传图片' };

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = 'payment-qrcode.png';
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);

    // 更新或创建系统设置
    await this.prisma.systemSetting.upsert({
      where: { key: 'paymentQrCode' },
      update: { value: `/uploads/${filename}` },
      create: { key: 'paymentQrCode', value: `/uploads/${filename}` },
    });

    await this.prisma.adminLog.create({
      data: { adminId, action: 'UPDATE_QRCODE', target: 'PaymentQR', detail: '更新收款二维码' },
    });

    return { code: 0, data: { url: `/uploads/${filename}` } };
  }
}
