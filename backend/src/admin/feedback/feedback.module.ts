import { Module } from '@nestjs/common';
import { AdminFeedbackController } from './feedback.controller';

@Module({
  controllers: [AdminFeedbackController],
})
export class AdminFeedbackModule {}
