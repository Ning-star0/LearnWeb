import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId: number;
    questionId?: number;
    type: string;
    title: string;
    content: string;
  }) {
    if (data.title.length > 100)
      throw new BadRequestException('标题不能超过 100 字');
    if (data.content.length > 2000)
      throw new BadRequestException('内容不能超过 2000 字');

    const feedback = await this.prisma.feedback.create({
      data: {
        userId: data.userId,
        questionId: data.questionId || null,
        type: data.type as any,
        title: data.title,
        content: data.content,
        status: 'PENDING',
        priority: 'NORMAL',
      },
    });

    return { id: feedback.id, message: '反馈已提交，我们会尽快处理' };
  }

  async findMyFeedbacks(userId: number) {
    return this.prisma.feedback.findMany({
      where: { userId },
      include: {
        question: { select: { id: true, stem: true, type: true } },
        handler: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
