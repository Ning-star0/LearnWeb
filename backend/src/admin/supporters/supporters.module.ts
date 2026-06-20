import { Module } from '@nestjs/common';
import { AdminSupportersController } from './supporters.controller';
import { AdminSupportersService } from './supporters.service';

@Module({
  controllers: [AdminSupportersController],
  providers: [AdminSupportersService],
})
export class AdminSupportersModule {}
