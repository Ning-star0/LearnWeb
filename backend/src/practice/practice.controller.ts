import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
  Body,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { PracticeService } from './practice.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PracticeController {
  constructor(
    private practiceService: PracticeService,
    private prisma: PrismaService,
  ) {}

  // 获取刷题题目列表
  @Get('practice/questions')
  async getQuestions(
    @CurrentUser('id') userId: number,
    @Query('mode') mode: string,
    @Query('scope') scope: string,
    @Query('bookId') bookId?: string,
    @Query('type') type?: string,
    @Query('order') order?: string,
    @Query('limit') limit?: string,
  ) {
    return this.practiceService.getQuestions({
      userId,
      mode: mode || 'study',
      scope: scope || 'all',
      bookId: bookId ? parseInt(bookId) : undefined,
      type,
      order: order || 'sequential',
      limit: limit ? parseInt(limit) : 50,
    });
  }

  // 背题模式操作
  @Post('practice/study-action')
  async studyAction(
    @CurrentUser('id') userId: number,
    @Body()
    body: { questionId: number; action: 'remembered' | 'not_remembered' },
  ) {
    return this.practiceService.studyAction(
      userId,
      body.questionId,
      body.action,
    );
  }

  // 答题模式提交
  @Post('practice/submit')
  async submit(
    @CurrentUser('id') userId: number,
    @Body() body: { questionId: number; userAnswer: any },
  ) {
    return this.practiceService.submitQuiz(
      userId,
      body.questionId,
      body.userAnswer,
    );
  }

  // 错题列表
  @Get('wrong')
  async getWrong(@CurrentUser('id') userId: number) {
    return this.prisma.wrongQuestion.findMany({
      where: { userId, mastered: false },
      include: {
        question: {
          include: {
            options: { orderBy: { orderNo: 'asc' } },
            book: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // 移除错题
  @Delete('wrong/:questionId')
  async removeWrong(
    @CurrentUser('id') userId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    await this.prisma.wrongQuestion.updateMany({
      where: { userId, questionId },
      data: { mastered: true },
    });
    return { success: true };
  }

  // 待背题列表
  @Get('review')
  async getReview(@CurrentUser('id') userId: number) {
    return this.prisma.reviewQuestion.findMany({
      where: { userId },
      include: {
        question: {
          include: {
            options: { orderBy: { orderNo: 'asc' } },
            book: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 移除待背题
  @Delete('review/:questionId')
  async removeReview(
    @CurrentUser('id') userId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    await this.prisma.reviewQuestion.deleteMany({
      where: { userId, questionId },
    });
    return { success: true };
  }
}
