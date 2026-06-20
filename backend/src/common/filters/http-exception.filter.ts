import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    let message = exception.message;

    // 提取 ValidationPipe 的第一条错误信息
    if (exception instanceof BadRequestException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        if (Array.isArray(resp.message) && resp.message.length > 0) {
          message = resp.message[0];
        } else if (typeof resp.message === 'string') {
          message = resp.message;
        }
      }
    }

    response.status(status).json({
      code: -1,
      message,
    });
  }
}
