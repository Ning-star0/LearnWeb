import { Module } from '@nestjs/common';
import { AdminLogsController } from './logs.controller';

@Module({
  controllers: [AdminLogsController],
})
export class AdminLogsModule {}
