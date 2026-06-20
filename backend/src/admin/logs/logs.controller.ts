import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/logs')
@UseGuards(AdminGuard)
export class AdminLogsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
  ) {
    const where: any = {};
    if (action) where.action = action;

    const p = page ? parseInt(page) : 1;
    const ps = Math.min(pageSize ? parseInt(pageSize) : 50, 200);

    const [items, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        include: {
          admin: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.adminLog.count({ where }),
    ]);

    return { items, total, page: p, pageSize: ps };
  }
}
