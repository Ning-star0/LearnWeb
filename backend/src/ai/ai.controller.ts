import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SecurityService } from '../common/security/security.service';
import { RateLimit } from '../common/rate-limit/rate-limit.guard';
import type { Request } from 'express';

@Controller()
export class AiController {
  constructor(
    private aiService: AiService,
    private securityService: SecurityService,
  ) {}

  @Post('questions/:questionId/ai-explanation')
  @UseGuards(JwtAuthGuard)
  @RateLimit({ points: 5, duration: 60, keyPrefix: 'ai-gen' })
  async getExplanation(
    @Param('questionId', ParseIntPipe) questionId: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.aiService.getOrGenerateExplanation(
      questionId,
      user,
      this.securityService.getClientIp(req),
      req.headers['user-agent'] || '',
    );
  }

  @Get('admin/ai-explanations')
  @UseGuards(AdminGuard)
  async findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.aiService.findAllExplanations({
      status,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  @Get('admin/ai-explanations/missing')
  @UseGuards(AdminGuard)
  async findMissing() {
    return this.aiService.findQuestionsWithoutExplanation();
  }

  @Post('admin/ai-explanations/:questionId/regenerate')
  @UseGuards(AdminGuard)
  async regenerate(
    @Param('questionId', ParseIntPipe) questionId: number,
    @CurrentUser('id') adminId: number,
  ) {
    return this.aiService.regenerateExplanation(questionId, adminId);
  }

  @Post('admin/ai-explanations/:questionId')
  @UseGuards(AdminGuard)
  async updateExplanation(
    @Param('questionId', ParseIntPipe) questionId: number,
    @CurrentUser('id') adminId: number,
    @Body() body: { content?: string; status?: string },
  ) {
    return this.aiService.updateExplanation(questionId, adminId, body);
  }
}
