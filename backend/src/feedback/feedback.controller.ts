import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateLimit } from '../common/rate-limit/rate-limit.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @Post()
  @RateLimit({ points: 1, duration: 10, keyPrefix: 'feedback-submit' })
  async create(
    @CurrentUser('id') userId: number,
    @Body()
    body: {
      questionId?: number;
      type: string;
      title: string;
      content: string;
    },
  ) {
    return this.feedbackService.create({
      userId,
      questionId: body.questionId,
      type: body.type || 'OTHER',
      title: body.title,
      content: body.content,
    });
  }

  @Get('my')
  async findMyFeedbacks(@CurrentUser('id') userId: number) {
    return this.feedbackService.findMyFeedbacks(userId);
  }
}
