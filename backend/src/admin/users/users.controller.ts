import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminUsersService } from './users.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private adminUsersService: AdminUsersService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminUsersService.findAll({
      search,
      role,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminUsersService.findOne(id);
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser('id') adminId: number,
    @CurrentUser('role') currentAdminRole: string,
    @Body('role') role: string,
  ) {
    return this.adminUsersService.updateRole(
      adminId,
      userId,
      role,
      currentAdminRole,
    );
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser('id') adminId: number,
    @Body('status') status: string,
  ) {
    return this.adminUsersService.updateStatus(adminId, userId, status);
  }

  @Post(':id/suspend')
  async suspend(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser('id') adminId: number,
    @Body('hours') hours?: number,
    @Body('reason') reason?: string,
  ) {
    return this.adminUsersService.suspend(adminId, userId, hours || 24, reason);
  }

  @Post(':id/unsuspend')
  async unsuspend(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser('id') adminId: number,
  ) {
    return this.adminUsersService.unsuspend(adminId, userId);
  }

  @Post(':id/disable')
  async disable(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser('id') adminId: number,
  ) {
    return this.adminUsersService.updateStatus(adminId, userId, 'DISABLED');
  }

  @Post(':id/ban')
  async ban(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser('id') adminId: number,
    @Body('reason') reason?: string,
  ) {
    return this.adminUsersService.ban(adminId, userId, reason);
  }

  @Post(':id/unban')
  async unban(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser('id') adminId: number,
  ) {
    return this.adminUsersService.unban(adminId, userId);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  async remove(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser('id') adminId: number,
  ) {
    return this.adminUsersService.remove(adminId, userId);
  }
}
