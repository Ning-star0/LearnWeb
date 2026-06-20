import { Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile, Body, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private prisma: PrismaService) {}

  /** 用户上传付款截图 */
  @Post('proof')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProof(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('note') note?: string,
  ) {
    if (!file) return { code: -1, message: '请上传付款截图' };

    // 保存文件到 uploads 目录
    const uploadDir = path.join(process.cwd(), 'uploads', 'payments');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filename = `${userId}-${Date.now()}.png`;
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);

    const proof = await this.prisma.paymentProof.create({
      data: {
        userId,
        imageUrl: `/uploads/payments/${filename}`,
        note: note || '',
        status: 'PENDING',
      },
    });

    return { code: 0, data: { id: proof.id, message: '付款截图已提交，请等待管理员审核' } };
  }

  /** 查看自己的付款记录 */
  @Get('proofs')
  async myProofs(@CurrentUser('id') userId: number) {
    return this.prisma.paymentProof.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 获取收款二维码（公开，登录即可访问） */
  @Get('qrcode')
  async getQrCode() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'paymentQrCode' },
    });
    return { code: 0, data: { url: setting?.value || '' } };
  }

  /** 检查试用次数和订阅状态 */
  @Get('status')
  async checkStatus(@CurrentUser('id') userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // 管理员不受限
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      return { code: 0, data: { canUseAi: true, isAdmin: true } };
    }

    // 检查是否有有效订阅（通过 PaymentProof APPROVED）
    const approved = await this.prisma.paymentProof.findFirst({
      where: { userId, status: 'APPROVED' },
      orderBy: { reviewedAt: 'desc' },
    });

    if (approved) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      if (approved.reviewedAt && approved.reviewedAt > oneMonthAgo) {
        return { code: 0, data: { canUseAi: true, subscribed: true, expiresAt: new Date(approved.reviewedAt.getTime() + 30 * 24 * 60 * 60 * 1000) } };
      }
    }

    // 检查试用次数
    const trialCount = await this.prisma.trialUsage.count({ where: { userId } });
    const maxTrials = 5;
    if (trialCount < maxTrials) {
      return { code: 0, data: { canUseAi: true, trial: true, used: trialCount, remaining: maxTrials - trialCount } };
    }

    return { code: 0, data: { canUseAi: false, trialUsedUp: true } };
  }
}
