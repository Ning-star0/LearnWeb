import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminSupportersService } from './supporters.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin/supporters')
@UseGuards(AdminGuard)
export class AdminSupportersController {
  constructor(private supportersService: AdminSupportersService) {}

  @Get()
  async findAll() {
    return this.supportersService.findAll();
  }

  @Post()
  async grant(
    @CurrentUser('id') adminId: number,
    @Body()
    body: { userId: number; source?: string; amount?: number; note?: string },
  ) {
    return this.supportersService.grant(adminId, body);
  }

  @Delete(':userId')
  async revoke(
    @CurrentUser('id') adminId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.supportersService.revoke(adminId, userId);
  }
}
