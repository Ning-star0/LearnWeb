import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) throw new UnauthorizedException('用户不存在');

    // PENDING_VERIFY 用户可以登录但不能调用高消耗接口
    if (user.status === 'DELETED') {
      throw new UnauthorizedException('用户不存在');
    }
    if (user.status === 'DISABLED') {
      throw new UnauthorizedException('账号已被禁用');
    }

    const { password, ...result } = user;
    return result;
  }
}
