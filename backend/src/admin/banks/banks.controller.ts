import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BanksService } from './banks.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SecurityService } from '../../common/security/security.service';
import { validateExcelFile } from '../../common/utils/file-validator';
import { RateLimit } from '../../common/rate-limit/rate-limit.guard';
import type { Request } from 'express';

@Controller('admin/banks')
@UseGuards(AdminGuard)
export class BanksController {
  constructor(
    private banksService: BanksService,
    private securityService: SecurityService,
  ) {}

  @Post('parse')
  @RateLimit({ points: 10, duration: 3600, keyPrefix: 'upload' })
  @UseInterceptors(FileInterceptor('file'))
  async parseFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('bookId', ParseIntPipe) bookId: number,
    @Req() req: Request,
  ) {
    validateExcelFile(file);
    return this.banksService.parseFile(file, bookId);
  }

  @Post('import')
  @RateLimit({ points: 10, duration: 3600, keyPrefix: 'import' })
  async importQuestions(@CurrentUser('id') adminId: number, @Body() body: any) {
    return this.banksService.importQuestions(adminId, body);
  }

  @Get()
  async findAll() {
    return this.banksService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.banksService.findOne(id);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
  ) {
    return this.banksService.remove(id, adminId);
  }
}
