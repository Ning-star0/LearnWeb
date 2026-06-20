import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { BanksModule } from './banks/banks.module';
import { AdminUsersModule } from './users/users.module';
import { AdminSettingsModule } from './settings/settings.module';
import { AdminSupportersModule } from './supporters/supporters.module';
import { AdminLogsModule } from './logs/logs.module';
import { AdminFeedbackModule } from './feedback/feedback.module';
import { AdminSecurityModule } from './security/security.module';

@Module({
  imports: [
    BanksModule,
    AdminUsersModule,
    AdminSettingsModule,
    AdminSupportersModule,
    AdminLogsModule,
    AdminFeedbackModule,
    AdminSecurityModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
