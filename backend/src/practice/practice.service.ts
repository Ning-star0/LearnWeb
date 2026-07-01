import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { compareChapterNatural } from '../common/utils/chapter-sort';

const QUESTION_TYPES = new Set(['SINGLE', 'MULTIPLE', 'JUDGE', 'SHORT']);

@Injectable()
export class PracticeService {
  constructor(private prisma: PrismaService) {}

  async getQuestions(params: {
    userId: number;
    mode: string; // study | quiz
    scope: string; // all | book | wrong | review
    bookId?: number;
    chapter?: string;
    type?: string;
    order?: string;
    limit?: number;
    restart?: boolean;
    ids?: number[];
  }) {
    const { userId, mode, scope, bookId, chapter, type, order, limit, ids } = params;
    const take = limit ? Math.min(limit, 5000) : undefined;
    const normalizedType = this.normalizeQuestionType(type);

    const explicitIds = ids?.length ? ids : null;
    let questionIds: number[] | null = explicitIds;

    // 确定题目范围
    if (!questionIds) {
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
    }

    // 构建查询条件
    const where: any = { isPublished: true };
    if (bookId) where.bookId = bookId;
    if (chapter) where.chapter = chapter;
    if (normalizedType) where.type = normalizedType;
    if (questionIds !== null) where.id = { in: questionIds };

    // 背题模式保留已背过题目，与答题模式一致：前端显示状态标记，用户可回看

    // 查询题目
    let questions = await this.prisma.question.findMany({
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

    if (explicitIds) {
      const orderMap = new Map(explicitIds.map((id, index) => [id, index]));
      questions = questions.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    } else if (order === 'random') {
      this.shuffle(questions);
    } else {
      // 顺序模式：先题型（单选、多选、判断、大题），每个题型内部再按章节自然顺序和导入题序。
      const typeOrder: Record<string, number> = { SINGLE: 0, MULTIPLE: 1, JUDGE: 2, SHORT: 3 };
      questions.sort((a, b) => {
        const leftType = typeOrder[a.type] ?? 99;
        const rightType = typeOrder[b.type] ?? 99;
        if (leftType !== rightType) return leftType - rightType;
        const chapterOrder = compareChapterNatural(a.chapter, b.chapter);
        if (chapterOrder !== 0) return chapterOrder;
        const orderNo = (a.orderNo ?? 0) - (b.orderNo ?? 0);
        if (orderNo !== 0) return orderNo;
        return a.id - b.id;
      });
    }

    const questionIdsForStatus = questions.map((question) => question.id);
    const studyStatusMap =
      mode === 'study'
        ? await this.getStudyStatusMap(userId, questionIdsForStatus)
        : new Map<number, string>();
    const quizStatusMap =
      mode === 'quiz'
        ? await this.getQuizStatusMap(userId, questionIdsForStatus)
        : new Map<number, { status: 'correct' | 'wrong' | 'unanswered'; historicalCorrect: boolean }>();
    const historicalCorrectCount = [...quizStatusMap.values()].filter((item) => item.historicalCorrect).length;
    const historicalWrongCount = [...quizStatusMap.values()].filter((item) => item.status === 'wrong').length;

    // 背题模式：直接返回答案；答题模式：隐藏答案
    if (mode === 'quiz') {
      return {
        items: questions.map((q) => {
          const status = quizStatusMap.get(q.id) || { status: 'unanswered', historicalCorrect: false };
          return {
            ...q,
            answerRaw: undefined,
            answerJson: null,
            quizStatus: status.status,
            historicalCorrect: status.historicalCorrect,
          };
        }),
        stats: {
          totalCount: questions.length,
          historicalCorrectCount,
          historicalWrongCount,
          pendingCount: Math.max(0, questions.length - historicalCorrectCount),
        },
      };
    }

    return {
      items: questions.map((q) => ({
        ...q,
        studyStatus: studyStatusMap.get(q.id) || 'unmarked',
      })),
      stats: {
        totalCount: questions.length,
        historicalCorrectCount: 0,
        historicalWrongCount: 0,
        pendingCount: questions.length,
      },
    };
  }

  private normalizeQuestionType(type?: string) {
    if (!type || type === '_all' || type === 'all') return undefined;
    const normalized = type.toUpperCase();
    return QUESTION_TYPES.has(normalized) ? normalized : undefined;
  }

  private async getStudyStatusMap(userId: number, questionIds: number[]) {
    if (questionIds.length === 0) return new Map<number, string>();
    const records = await this.prisma.answerRecord.findMany({
      where: {
        userId,
        mode: 'STUDY',
        questionId: { in: questionIds },
      },
      orderBy: { createdAt: 'desc' },
      select: { questionId: true, action: true },
    });
    const map = new Map<number, string>();
    for (const record of records) {
      if (!map.has(record.questionId) && record.action) {
        map.set(record.questionId, record.action);
      }
    }
    return map;
  }

  private async getQuizStatusMap(userId: number, questionIds: number[]) {
    if (questionIds.length === 0) {
      return new Map<number, { status: 'correct' | 'wrong' | 'unanswered'; historicalCorrect: boolean }>();
    }
    const records = await this.prisma.answerRecord.findMany({
      where: {
        userId,
        mode: 'QUIZ',
        questionId: { in: questionIds },
        isCorrect: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { questionId: true, isCorrect: true },
    });

    const latestMap = new Map<number, boolean>();
    const correctSet = new Set<number>();
    for (const record of records) {
      if (!latestMap.has(record.questionId)) latestMap.set(record.questionId, record.isCorrect === true);
      if (record.isCorrect === true) correctSet.add(record.questionId);
    }

    const map = new Map<number, { status: 'correct' | 'wrong' | 'unanswered'; historicalCorrect: boolean }>();
    for (const questionId of questionIds) {
      if (latestMap.get(questionId) === false) {
        map.set(questionId, { status: 'wrong', historicalCorrect: false });
      } else if (correctSet.has(questionId)) {
        map.set(questionId, { status: 'correct', historicalCorrect: true });
      } else {
        map.set(questionId, { status: 'unanswered', historicalCorrect: false });
      }
    }
    return map;
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

  async getRememberedShortQuestions(userId: number) {
    const latestStudyRecords = await this.prisma.answerRecord.findMany({
      where: {
        userId,
        mode: 'STUDY',
        action: { in: ['remembered', 'not_remembered'] },
        question: {
          type: 'SHORT',
          isPublished: true,
        },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['questionId'],
      include: {
        question: {
          include: {
            book: { select: { id: true, name: true } },
            bank: { select: { id: true, name: true, sourceFile: true } },
          },
        },
      },
    });

    const items = latestStudyRecords.filter((record) => record.action === 'remembered');
    return {
      items,
      total: items.length,
    };
  }

  async submitQuiz(userId: number, questionId: number, userAnswer: any) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
    if (!question) throw new BadRequestException('题目不存在');

    const isUncertain = userAnswer === 'UNCERTAIN';
    let isCorrect: boolean | null;
    const type = question.type;

    if (isUncertain) {
      isCorrect = null;
    } else {
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
    if (isCorrect === false) {
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
    } else if (isCorrect === true) {
      await this.prisma.wrongQuestion.updateMany({
        where: { userId, questionId, mastered: false },
        data: { mastered: true },
      });
    }

    return {
      isCorrect,
      uncertain: isUncertain,
      correctAnswer:
        type === 'SHORT' ? question.answerRaw || question.answerJson : question.answerJson,
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
