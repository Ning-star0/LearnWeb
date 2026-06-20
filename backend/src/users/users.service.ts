import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const { password, ...result } = user;
    return result;
  }

  async updateMe(userId: number, dto: UpdateUserDto) {
    // 如果修改 email，检查是否已被占用
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: userId } },
      });
      if (existing) {
        throw new ConflictException('该邮箱已被使用');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });

    const { password, ...result } = user;
    return result;
  }
}
