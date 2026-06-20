import { Module } from '@nestjs/common';
import { AdminPaymentController } from './payment.controller';

@Module({
  controllers: [AdminPaymentController],
})
export class AdminPaymentModule {}
