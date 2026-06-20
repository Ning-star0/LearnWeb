import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  handleRequest(err: any, user: any) {
    if (
      err ||
      !user ||
      (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')
    ) {
      throw new UnauthorizedException('需要管理员权限');
    }
    return user;
  }
}
