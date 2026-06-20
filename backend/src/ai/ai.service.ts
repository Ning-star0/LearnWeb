import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { SecurityService } from '../common/security/security.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private securityService: SecurityService,
    private riskService: RiskService,
  ) {}

  async getOrGenerateExplanation(
    questionId: number,
    user: any,
    ip: string,
    userAgent: string,
    useTrial = false,
  ) {
    // 1. 检查用户状态
    if (user.status === 'DISABLED' || user.status === 'BANNED') {
      throw new ForbiddenException('账号状态异常，无法使用 AI 解析');
    }
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException(
        '当前账号因异常行为被临时限制，如有疑问请提交反馈或联系管理员',
      );
    }

    // 2. 检查 AI 解析是否开启
    const aiEnabled = await this.prisma.systemSetting.findUnique({
      where: { key: 'enableAiExplanation' },
    });
    if (aiEnabled?.value === 'false') {
      throw new ForbiddenException('AI 解析功能暂未开启');
    }

    // 3. PENDING_VERIFY 用户不允许
    if (user.status === 'PENDING_VERIFY') {
      throw new ForbiddenException('请先验证邮箱后再使用 AI 解析功能');
    }

    // 4. 权限检查（支持者/管理员/试用次数）
    const permission = await this.checkAiPermission(user.id, user.role, useTrial);
    if (!permission.allowed) {
      return {
        code: -1,
        message: permission.reason || 'NEED_SUPPORTER',
        data: {
          trialRemaining: permission.trialRemaining || 0,
          trialLimit: 5,
        },
      };
    }

    // 5. 查询数据库是否已有解析
    const existing = await this.prisma.questionAiExplanation.findUnique({
      where: { questionId },
    });

    // 6. 如果已有可见解析 → 直接返回（缓存命中）
    if (
      existing &&
      (['AUTO_APPROVED', 'APPROVED'].includes(existing.status) ||
        ['ADMIN', 'SUPER_ADMIN'].includes(user.role))
    ) {
      // 记录查看日志（fromCache = true，不调用 DeepSeek）
      await this.prisma.aiViewLog.create({
        data: {
          userId: user.id,
          questionId,
          explanationId: existing.id,
          fromCache: true,
          ip,
          userAgent,
        },
      });

      if (permission.consumesTrial) {
        await this.recordTrialUse(user.id);
      }

      // 异常检测
      await this.riskService.checkAiViewRisk(user.id, ip);

      return { code: 0, data: existing };
    }

    // 7. 数据库没有解析 → 需要生成
    // Redis 分布式锁：防止并发生成
    const lockKey = `ai:generate:question:${questionId}`;
    const locked = await this.redisService.lock(lockKey, 120);

    if (!locked) {
      // 其他请求正在生成中
      return { code: -1, message: 'AI 解析正在生成中，请稍后刷新', data: null };
    }

    try {
      // 双重检查
      const doubleCheck = await this.prisma.questionAiExplanation.findUnique({
        where: { questionId },
      });
      if (
        doubleCheck &&
        ['AUTO_APPROVED', 'APPROVED'].includes(doubleCheck.status)
      ) {
        await this.prisma.aiViewLog.create({
          data: {
            userId: user.id,
            questionId,
            explanationId: doubleCheck.id,
            fromCache: true,
            ip,
            userAgent,
          },
        });
        if (permission.consumesTrial) {
          await this.recordTrialUse(user.id);
        }
        return { code: 0, data: doubleCheck };
      }

      // 真正生成
      const explanation = await this.generateExplanation(
        questionId,
        user.id,
        ip,
      );

      if (permission.consumesTrial) {
        await this.recordTrialUse(user.id);
      }

      // 记录查看日志（fromCache = false，首次生成后查看）
      await this.prisma.aiViewLog.create({
        data: {
          userId: user.id,
          questionId,
          explanationId: explanation.id,
          fromCache: false,
          ip,
          userAgent,
        },
      });

      // 记录生成日志
      await this.prisma.aiGenerationLog.create({
        data: {
          userId: user.id,
          questionId,
          model: explanation.model,
          status: 'SUCCESS',
          fromCache: false,
        },
      });

      return { code: 0, data: explanation };
    } finally {
      await this.redisService.unlock(lockKey);
    }
  }

  async generateExplanation(questionId: number, userId?: number, ip?: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { options: { orderBy: { orderNo: 'asc' } }, book: true },
    });
    if (!question) throw new BadRequestException('题目不存在');

    const [providerSetting, modelSetting, autoApprove] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'aiProvider' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'aiModel' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'aiAutoApprove' } }),
    ]);

    const model = modelSetting?.value || 'deepseek-chat';
    const autoApproveValue = autoApprove?.value !== 'false';

    const optionsText = question.options
      .map((o) => `${o.label}. ${o.content}`)
      .join('\n');
    const typeMap: Record<string, string> = {
      SINGLE: '单选题',
      MULTIPLE: '多选题',
      JUDGE: '判断题',
      SHORT: '简答题',
    };
    const correctAnswer = this.formatCorrectAnswer(question);

    const prompt = `你是一名思政课老师，请为下面这道题生成适合学生复习的解析。

教材：${question.book.name}
题型：${typeMap[question.type] || question.type}
题目：${question.stem}
选项：
${optionsText}
正确答案：${correctAnswer}

请严格输出以下 JSON 格式（不要输出其他内容，只输出 JSON）：

{
  "knowledgePoint": "考察知识点（纯文本）",
  "correctReason": "正确答案为什么对（支持 Markdown：加粗、列表、换行）",
  "wrongReason": "错误选项为什么不选（支持 Markdown）",
  "memoryTip": "记忆方法（纯文本）",
  "similarJudge": "类似题怎么判断（纯文本）"
}

要求：用中文、适合学生复习、不要太长、不编造教材之外内容、不宣传押题包过必过、解析仅供学习参考。`;

    let content: string;
    let tokensIn = 0;
    let tokensOut = 0;
    try {
      const result = await this.callAiApi(model, prompt);
      content = result.content;
      tokensIn = result.tokensIn;
      tokensOut = result.tokensOut;
    } catch (e: any) {
      await this.prisma.questionAiExplanation.create({
        data: { questionId, content: '', model, status: 'FAILED' },
      });

      if (userId) {
        await this.prisma.aiGenerationLog.create({
          data: {
            userId,
            questionId,
            model,
            status: 'FAILED',
            error: e.message,
          },
        });
      }

      throw new ForbiddenException('AI 解析生成失败，请稍后重试');
    }

    const explanation = await this.prisma.questionAiExplanation.create({
      data: {
        questionId,
        content,
        model,
        status: autoApproveValue ? 'AUTO_APPROVED' : 'PENDING_REVIEW',
      },
    });

    return explanation;
  }

  async regenerateExplanation(questionId: number, adminId: number) {
    await this.prisma.questionAiExplanation.deleteMany({
      where: { questionId },
    });
    const explanation = await this.generateExplanation(questionId);

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'AI_解释_REGENERATE',
        target: `Question:${questionId}`,
        detail: '重新生成 AI 解析',
      },
    });

    return explanation;
  }

  async updateExplanation(
    questionId: number,
    adminId: number,
    data: { content?: string; status?: string },
  ) {
    const explanation = await this.prisma.questionAiExplanation.findUnique({
      where: { questionId },
    });
    if (!explanation) throw new BadRequestException('解析不存在');

    const updated = await this.prisma.questionAiExplanation.update({
      where: { questionId },
      data: {
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.status !== undefined
          ? {
              status: data.status as any,
              reviewedBy: adminId,
              reviewedAt: new Date(),
            }
          : {}),
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'AI_解释_UPDATE',
        target: `Question:${questionId}`,
        detail: `修改状态: ${data.status || '内容修改'}`,
      },
    });

    return updated;
  }

  async findAllExplanations(params: {
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const [items, total] = await Promise.all([
      this.prisma.questionAiExplanation.findMany({
        where,
        include: {
          question: {
            select: {
              id: true,
              stem: true,
              type: true,
              book: { select: { id: true, name: true } },
              _count: { select: { aiViewLogs: true } },
            },
          },
          reviewer: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.questionAiExplanation.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findQuestionsWithoutExplanation() {
    const withAi = await this.prisma.questionAiExplanation.findMany({
      select: { questionId: true },
    });
    const ids = withAi.map((e) => e.questionId);
    return this.prisma.question.findMany({
      where: { id: { notIn: ids }, isPublished: true },
      include: { book: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ======== 私有方法 ========

  /** 记录一次 AI 试用查看 */
  async recordTrialUse(userId: number) {
    await this.prisma.trialUsage.create({ data: { userId } });
  }

  private async checkAiPermission(
    userId: number,
    role: string,
    useTrial: boolean,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    trialRemaining?: number;
    consumesTrial?: boolean;
  }> {
    // ADMIN/SUPER_ADMIN 始终可用
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return { allowed: true };

    // 检查是否有有效订阅
    const approved = await this.prisma.paymentProof.findFirst({
      where: { userId, status: 'APPROVED' },
      orderBy: { reviewedAt: 'desc' },
    });
    if (approved?.reviewedAt) {
      const expiresAt = new Date(approved.reviewedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (expiresAt > new Date()) return { allowed: true };
    }

    // 检查老的支持者权限（兼容）
    const supporterAccess = await this.prisma.supporterAccess.findFirst({
      where: { userId, type: 'LIFETIME_AI_EXPLANATION' },
    });
    if (supporterAccess) return { allowed: true };

    // 首次点击先提示付费/试用说明，用户确认后才消耗试用次数。
    const trialCount = await this.prisma.trialUsage.count({ where: { userId } });
    const trialLimit = 5;
    if (trialCount === 0 && !useTrial) {
      return {
        allowed: false,
        reason: 'TRIAL_CONFIRM_REQUIRED',
        trialRemaining: trialLimit,
      };
    }
    if (trialCount < trialLimit) {
      return {
        allowed: true,
        trialRemaining: trialLimit - trialCount,
        consumesTrial: true,
      };
    }

    return { allowed: false, reason: 'NEED_SUPPORTER', trialRemaining: 0 };
  }

  private async canViewAiExplanation(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
    const access = await this.prisma.supporterAccess.findFirst({
      where: { userId, type: 'LIFETIME_AI_EXPLANATION' },
    });
    return !!access;
  }

  private formatCorrectAnswer(question: any): string {
    const { type, answerJson, answerRaw } = question;
    switch (type) {
      case 'SINGLE':
        return Array.isArray(answerJson)
          ? answerJson[0] || answerRaw
          : answerRaw;
      case 'MULTIPLE':
        return Array.isArray(answerJson) ? answerJson.join(', ') : answerRaw;
      case 'JUDGE':
        return answerJson ? '正确 (True)' : '错误 (False)';
      case 'SHORT':
        return answerRaw || '';
      default:
        return answerRaw || '';
    }
  }

  private async callAiApi(model: string, prompt: string) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured');

    const baseUrl = 'https://api.deepseek.com/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              '你是一名政治/思政课老师，帮助复习备考。回答专业、准确、简洁。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data: any = await response.json();
    return {
      content: data.choices[0].message.content,
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
    };
  }
}
