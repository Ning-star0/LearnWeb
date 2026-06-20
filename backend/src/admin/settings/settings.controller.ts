import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { AdminSettingsService } from './settings.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin/settings')
@UseGuards(AdminGuard)
export class AdminSettingsController {
  constructor(private settingsService: AdminSettingsService) {}

  @Get()
  async findAll() {
    return this.settingsService.findAll();
  }

  @Put(':key')
  async update(
    @Param('key') key: string,
    @CurrentUser('id') adminId: number,
    @Body('value') value: string,
  ) {
    return this.settingsService.update(adminId, key, value);
  }
}
