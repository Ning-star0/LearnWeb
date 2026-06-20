import { Module } from '@nestjs/common';
import { AdminSecurityController } from './security.controller';

@Module({
  controllers: [AdminSecurityController],
})
export class AdminSecurityModule {}
