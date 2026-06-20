import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { SecurityModule } from './common/security/security.module';
import { RiskModule } from './risk/risk.module';
import { MailModule } from './common/mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { AdminModule } from './admin/admin.module';
import { PracticeModule } from './practice/practice.module';
import { AiModule } from './ai/ai.module';
import { FeedbackModule } from './feedback/feedback.module';
import { PaymentModule } from './payment/payment.module';
import { QuestionsModule } from './questions/questions.module';
import { SettingsModule } from './settings/settings.module';
import { RateLimitGuard } from './common/rate-limit/rate-limit.guard';

@Module({
  imports: [
    PrismaModule, RedisModule, SecurityModule, RiskModule, MailModule,
    AuthModule, UsersModule, BooksModule, AdminModule,
    PracticeModule, AiModule, FeedbackModule,
    PaymentModule, QuestionsModule, SettingsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class AppModule {}
