import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupporterGuard extends JwtAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const base = await super.canActivate(context);
    if (!base) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ADMIN 和 SUPER_ADMIN 自动拥有支持者权限
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;

    // 检查是否有有效的 LIFETIME_AI_EXPLANATION 支持者记录
    const access = await this.prisma.supporterAccess.findFirst({
      where: {
        userId: user.id,
        type: 'LIFETIME_AI_EXPLANATION',
      },
    });

    return !!access;
  }
}
