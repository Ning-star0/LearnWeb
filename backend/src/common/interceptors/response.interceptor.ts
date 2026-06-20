import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StreamableFile } from '@nestjs/common';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 跳过文件流响应
        if (data instanceof StreamableFile) return data;

        // 如果响应体已包含 code 字段（如分页），直接透传
        if (data && typeof data === 'object' && 'code' in data) {
          return data;
        }

        return { code: 0, data };
      }),
    );
  }
}
