import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/feedback')
@UseGuards(AdminGuard)
export class AdminFeedbackController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const p = page ? parseInt(page) : 1;
    const ps = Math.min(pageSize ? parseInt(pageSize) : 20, 100);

    const [items, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, username: true } },
          question: { select: { id: true, stem: true, type: true } },
          handler: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return { items, total, page: p, pageSize: ps };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, username: true, status: true },
        },
        question: {
          select: {
            id: true,
            stem: true,
            type: true,
            book: { select: { name: true } },
          },
        },
        handler: { select: { id: true, username: true } },
      },
    });
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminId: number,
    @Body('status') status: string,
  ) {
    const feedback = await this.prisma.feedback.update({
      where: { id },
      data: {
        status: status as any,
        handledBy: adminId,
        handledAt: new Date(),
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'FEEDBACK_UPDATE_STATUS',
        target: `Feedback:${id}`,
        detail: `状态更新为: ${status}`,
      },
    });

    return feedback;
  }

  @Patch(':id/priority')
  async updatePriority(
    @Param('id') id: string,
    @Body('priority') priority: string,
  ) {
    return this.prisma.feedback.update({
      where: { id },
      data: { priority: priority as any },
    });
  }

  @Post(':id/reply')
  async reply(
    @Param('id') id: string,
    @CurrentUser('id') adminId: number,
    @Body('reply') reply: string,
  ) {
    const feedback = await this.prisma.feedback.update({
      where: { id },
      data: {
        adminReply: reply,
        status: 'RESOLVED',
        handledBy: adminId,
        handledAt: new Date(),
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'FEEDBACK_REPLY',
        target: `Feedback:${id}`,
        detail: `回复反馈`,
      },
    });

    return feedback;
  }
}
