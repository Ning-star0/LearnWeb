import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const message = this.getFriendlyMessage(exception);

    response.status(HttpStatus.BAD_REQUEST).json({
      code: -1,
      message,
    });
  }

  private getFriendlyMessage(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    switch (exception.code) {
      case 'P2002':
        return '该记录已存在';
      case 'P2025':
        return '记录不存在';
      case 'P2003':
        return '外键约束失败：关联数据不存在';
      case 'P2014':
        return '关系约束失败：数据存在关联，无法删除';
      default:
        return '数据库操作失败';
    }
  }
}
