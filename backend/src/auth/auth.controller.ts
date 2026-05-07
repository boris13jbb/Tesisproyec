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
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Roles } from './decorators/roles.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { UpdateSecurityPolicyDto } from './dto/security-policy.dto';
import { Permissions } from './decorators/permissions.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { PERM } from './permission-codes';
import type { JwtRequestUser } from './request-user';

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
  @Throttle({ default: { limit: 8, ttl: 10 * 60_000 } }) // 8 / 10 min por IP
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const ipFromForwarded =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : undefined;
    const ua = req.headers['user-agent'];
    const result = await this.authService.login(dto, {
      ip: ipFromForwarded ?? req.ip,
      userAgent: typeof ua === 'string' ? ua : undefined,
    });
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
  @Throttle({ default: { limit: 60, ttl: 10 * 60_000 } }) // opcional: más laxo
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const name = this.cookieName();
    const raw = req.cookies?.[name] as string | undefined;
    const result = await this.authService.refresh(raw);
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

  /**
   * Bootstrap de sesión desde cookie (misma lógica que `/auth/refresh`).
   * Respuesta siempre 200: sin cookie o token inválido → `{ restored: false }` (sin HTTP 401).
   * Útil para evitar ruido en la consola del navegador en la carga inicial sin sesión.
   */
  @Post('session/restore')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 10 * 60_000 } })
  async restoreSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const name = this.cookieName();
    const secure = this.config.get('NODE_ENV') === 'production';
    const cookieOpts = {
      path: '/' as const,
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
    };
    const raw = req.cookies?.[name] as string | undefined;
    const result = await this.authService.restoreSessionBootstrap(raw);
    if (!result.ok) {
      if (raw) {
        res.clearCookie(name, cookieOpts);
      }
      return { restored: false as const };
    }
    res.cookie(name, result.refreshToken, {
      ...cookieOpts,
      maxAge: this.refreshMaxAgeMs(),
    });
    return {
      restored: true as const,
      accessToken: result.accessToken,
      user: result.user,
    };
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

  /** Perfil institucional del usuario autenticado (datos de cuenta + actividad auditada reciente). */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@Req() req: Request & { user: JwtRequestUser }) {
    return this.authService.getMyProfile(req.user);
  }

  /** Transparencia de políticas para UI “Configuración de seguridad” (ADMIN, sin secretos). */
  @Get('admin/security-summary')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions(PERM.SECURITY_POLICY_READ)
  adminSecuritySummary() {
    return this.authService.getAdminSecuritySummary();
  }

  /** Política institucional persistida (ISO 15489): editable por ADMIN, sin secretos. */
  @Get('admin/security-policy')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions(PERM.SECURITY_POLICY_READ)
  adminSecurityPolicy() {
    return this.authService.getSecurityPolicyRecord();
  }

  @Post('admin/security-policy')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions(PERM.SECURITY_POLICY_WRITE)
  async updateAdminSecurityPolicy(
    @Body() dto: UpdateSecurityPolicyDto,
    @Req() req: Request & { user: JwtRequestUser },
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const ipFromForwarded =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : undefined;
    const ua = req.headers['user-agent'];
    return this.authService.updateSecurityPolicyRecord(dto, req.user, {
      ip: ipFromForwarded ?? req.ip,
      userAgent: typeof ua === 'string' ? ua : undefined,
    });
  }

  @Post('password-reset/request')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
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
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  async confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset({
      token: dto.token,
      newPassword: dto.newPassword,
    });
  }
}
