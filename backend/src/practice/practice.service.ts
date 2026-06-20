import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const QUESTION_TYPES = new Set(['SINGLE', 'MULTIPLE', 'JUDGE', 'SHORT']);

@Injectable()
export class PracticeService {
  constructor(private prisma: PrismaService) {}

  async getQuestions(params: {
    userId: number;
    mode: string; // study | quiz
    scope: string; // all | book | wrong | review
    bookId?: number;
    type?: string;
    order?: string;
    limit?: number;
  }) {
    const { userId, mode, scope, bookId, type, order, limit } = params;
    const take = Math.min(limit || 50, 100);
    const normalizedType = this.normalizeQuestionType(type);

    let questionIds: number[] | null = null;

    // 确定题目范围
    switch (scope) {
      case 'book':
        if (!bookId) throw new BadRequestException('请选择教材');
        break;
      case 'wrong':
        const wrongs = await this.prisma.wrongQuestion.findMany({
          where: { userId, mastered: false },
          select: { questionId: true },
        });
        questionIds = wrongs.map((w) => w.questionId);
        if (questionIds.length === 0) return [];
        break;
      case 'review':
        const reviews = await this.prisma.reviewQuestion.findMany({
          where: { userId },
          select: { questionId: true },
        });
        questionIds = reviews.map((r) => r.questionId);
        if (questionIds.length === 0) return [];
        break;
      default:
        // all
        break;
    }

    // 构建查询条件
    const where: any = { isPublished: true };
    if (bookId) where.bookId = bookId;
    if (normalizedType) where.type = normalizedType;
    if (questionIds !== null) where.id = { in: questionIds };

    // 查询题目
    const questions = await this.prisma.question.findMany({
      where,
      include: {
        options: { orderBy: { orderNo: 'asc' } },
        book: { select: { id: true, name: true } },
        aiExplanation:
          mode === 'study' ? { select: { id: true, status: true } } : undefined,
      },
      orderBy: order === 'random' ? undefined : { orderNo: 'asc' },
      take,
    });

    // 随机排序
    if (order === 'random') {
      this.shuffle(questions);
    }

    // 背题模式：直接返回答案；答题模式：隐藏答案
    if (mode === 'quiz') {
      return questions.map((q) => ({
        ...q,
        answerRaw: undefined,
        answerJson: null,
      }));
    }

    return questions;
  }

  private normalizeQuestionType(type?: string) {
    if (!type || type === '_all' || type === 'all') return undefined;
    const normalized = type.toUpperCase();
    return QUESTION_TYPES.has(normalized) ? normalized : undefined;
  }

  async studyAction(
    userId: number,
    questionId: number,
    action: 'remembered' | 'not_remembered',
  ) {
    // 记录答题
    await this.prisma.answerRecord.create({
      data: {
        userId,
        questionId,
        mode: 'STUDY',
        action,
      },
    });

    // 如果没记住，加入待背题
    if (action === 'not_remembered') {
      await this.prisma.reviewQuestion.upsert({
        where: {
          userId_questionId: { userId, questionId },
        },
        create: {
          userId,
          questionId,
          reason: '背题模式中标记为没记住',
        },
        update: {},
      });
    } else {
      // 记住了，从待背题中移除
      await this.prisma.reviewQuestion.deleteMany({
        where: { userId, questionId },
      });
    }

    return { success: true, action };
  }

  async submitQuiz(userId: number, questionId: number, userAnswer: any) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
    if (!question) throw new BadRequestException('题目不存在');

    let isCorrect: boolean;
    const type = question.type;

    switch (type) {
      case 'SINGLE':
        isCorrect = this.checkSingle(question.answerJson, userAnswer);
        break;
      case 'MULTIPLE':
        isCorrect = this.checkMultiple(question.answerJson, userAnswer);
        break;
      case 'JUDGE':
        isCorrect = this.checkJudge(question.answerJson, userAnswer);
        break;
      case 'SHORT':
        // 简答题不自动判题，由用户自行判断
        isCorrect = userAnswer === true; // 用户提交时传 true 表示自己判断正确
        break;
      default:
        isCorrect = false;
    }

    // 记录答题
    await this.prisma.answerRecord.create({
      data: {
        userId,
        questionId,
        mode: 'QUIZ',
        userAnswer: JSON.stringify(userAnswer),
        isCorrect,
      },
    });

    // 答错自动加入错题本
    if (!isCorrect) {
      await this.prisma.wrongQuestion.upsert({
        where: {
          userId_questionId: { userId, questionId },
        },
        create: {
          userId,
          questionId,
          wrongCount: 1,
        },
        update: {
          wrongCount: { increment: 1 },
          mastered: false,
        },
      });
    }

    return {
      isCorrect,
      correctAnswer:
        type === 'SHORT' ? question.answerJson : question.answerJson,
      explanation: question.explanation,
    };
  }

  // ======== 判题逻辑 ========

  private checkSingle(correctAnswer: any, userAnswer: any): boolean {
    if (Array.isArray(correctAnswer)) {
      return correctAnswer[0] === userAnswer;
    }
    return correctAnswer === userAnswer;
  }

  private checkMultiple(correctAnswer: any, userAnswer: any): boolean {
    if (!Array.isArray(correctAnswer) || !Array.isArray(userAnswer))
      return false;
    const correct = [...correctAnswer].sort();
    const user = [...userAnswer].sort();
    if (correct.length !== user.length) return false;
    return correct.every((v, i) => v === user[i]);
  }

  private checkJudge(correctAnswer: any, userAnswer: any): boolean {
    return Boolean(correctAnswer) === Boolean(userAnswer);
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
