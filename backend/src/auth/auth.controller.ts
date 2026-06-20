import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SecurityService } from '../common/security/security.service';
import {
  RateLimit,
  RateLimitGuard,
} from '../common/rate-limit/rate-limit.guard';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private securityService: SecurityService,
  ) {}

  @Post('register')
  @RateLimit({ points: 5, duration: 3600, keyPrefix: 'register' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(
      dto,
      this.securityService.getClientIp(req),
      req.headers['user-agent'] || '',
    );
  }

  @Post('login')
  @RateLimit({ points: 10, duration: 60, keyPrefix: 'login' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(
      dto,
      this.securityService.getClientIp(req),
      req.headers['user-agent'] || '',
    );
  }

  @Post('verify-email')
  async verifyEmail(@Body('token') token: string, @Req() req: Request) {
    return this.authService.verifyEmail(
      token,
      this.securityService.getClientIp(req),
      req.headers['user-agent'] || '',
    );
  }

  @Post('resend-verification')
  @RateLimit({ points: 3, duration: 3600, keyPrefix: 'resend-verify' })
  async resendVerification(@Body('email') email: string, @Req() req: Request) {
    return this.authService.resendVerification(
      email,
      this.securityService.getClientIp(req),
      req.headers['user-agent'] || '',
    );
  }

  @Post('refresh')
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Req() req: Request,
  ) {
    return this.authService.refreshToken(
      refreshToken,
      this.securityService.getClientIp(req),
      req.headers['user-agent'] || '',
    );
  }

  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser('id') userId: number) {
    return this.authService.logoutAll(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser('id') userId: number) {
    return this.authService.getMe(userId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser('id') userId: number) {
    return this.authService.getSessions(userId);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @CurrentUser('id') userId: number,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(userId, sessionId);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() body: { oldPassword: string; newPassword: string },
    @Req() req: Request,
  ) {
    return this.authService.changePassword(
      userId,
      body.oldPassword,
      body.newPassword,
      this.securityService.getClientIp(req),
    );
  }

  @Post('forgot-password')
  @RateLimit({ points: 3, duration: 3600, keyPrefix: 'forgot-pwd' })
  async forgotPassword(@Body('email') email: string, @Req() req: Request) {
    return this.authService.requestPasswordReset(
      email,
      this.securityService.getClientIp(req),
    );
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
    @Req() req: Request,
  ) {
    return this.authService.resetPassword(
      body.token,
      body.newPassword,
      this.securityService.getClientIp(req),
    );
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@CurrentUser('id') userId: number, @Req() req: Request) {
    return this.authService.deleteAccount(
      userId,
      this.securityService.getClientIp(req),
    );
  }
}
