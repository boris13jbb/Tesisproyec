import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieName(): string {
    return this.config.get<string>('REFRESH_COOKIE_NAME', 'sgd_refresh');
  }

  private refreshMaxAgeMs(): number {
    const days = Number(this.config.get('JWT_REFRESH_DAYS', 7));
    return days * 24 * 60 * 60 * 1000;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    const name = this.cookieName();
    res.cookie(name, result.refreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.refreshMaxAgeMs(),
    });
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request) {
    const raw = req.cookies?.[this.cookieName()] as string | undefined;
    return this.authService.refresh(raw);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const name = this.cookieName();
    const raw = req.cookies?.[name] as string | undefined;
    await this.authService.logout(raw);
    res.clearCookie(name, {
      path: '/',
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: unknown }) {
    return req.user;
  }

  @Post('password-reset/request')
  @HttpCode(202)
  async requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
    @Req() req: Request,
  ) {
    const requestedIp =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] ??
      req.ip ??
      undefined;
    const userAgent = req.headers['user-agent'] ?? undefined;
    return this.authService.requestPasswordReset({
      email: dto.email,
      requestedIp,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    });
  }

  @Post('password-reset/confirm')
  @HttpCode(200)
  async confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset({
      token: dto.token,
      newPassword: dto.newPassword,
    });
  }
}
