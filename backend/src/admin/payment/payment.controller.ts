import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/payments')
@UseGuards(AdminGuard)
export class AdminPaymentController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.paymentProof.findMany({
      include: { user: { select: { id: true, email: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') adminId: number,
    @Body('months') months?: number,
  ) {
    const proof = await this.prisma.paymentProof.update({
      where: { id },
      data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date() },
    });

    await this.prisma.adminLog.create({
      data: { adminId, action: 'APPROVE_PAYMENT', target: `Payment:${id}`, detail: `审核通过用户 ${proof.userId} 的付款` },
    });

    return proof;
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: number,
  ) {
    const proof = await this.prisma.paymentProof.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: adminId, reviewedAt: new Date() },
    });

    await this.prisma.adminLog.create({
      data: { adminId, action: 'REJECT_PAYMENT', target: `Payment:${id}`, detail: `拒绝用户 ${proof.userId} 的付款` },
    });

    return proof;
  }
}
