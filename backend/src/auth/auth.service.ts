import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../auditoria/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  private buildPasswordResetUrl(rawToken: string): string {
    const explicit =
      this.config.get<string>('PASSWORD_RESET_FRONTEND_URL')?.trim() ||
      this.config.get<string>('FRONTEND_PUBLIC_URL')?.trim();
    const corsFirst = this.config
      .get<string>('CORS_ORIGIN')
      ?.split(',')[0]
      ?.trim();
    const base = (explicit || corsFirst || 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
    const pathRaw =
      this.config.get<string>('PASSWORD_RESET_PATH')?.trim() ?? '/restablecer';
    const path = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
    return `${base}${path}?token=${encodeURIComponent(rawToken)}`;
  }

  private hashRefresh(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  private hashOpaqueToken(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  private accessSignOptions(): JwtSignOptions {
    return {
      expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES') ??
        '15m') as JwtSignOptions['expiresIn'],
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: true } },
      },
    });
    if (!user?.activo) {
      await this.audit.log({
        action: 'AUTH_LOGIN_FAIL',
        result: 'FAIL',
        resource: { type: 'User', id: null },
        context: { actorUserId: null, actorEmail: email },
        meta: { reason: 'USER_NOT_FOUND_OR_INACTIVE' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.audit.log({
        action: 'AUTH_LOGIN_FAIL',
        result: 'FAIL',
        resource: { type: 'User', id: user.id },
        context: { actorUserId: user.id, actorEmail: user.email },
        meta: { reason: 'BAD_PASSWORD' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      this.accessSignOptions(),
    );

    const rawRefresh = randomBytes(32).toString('hex');
    const tokenHash = this.hashRefresh(rawRefresh);
    const days = Number(this.config.get('JWT_REFRESH_DAYS', 7));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });

    await this.audit.log({
      action: 'AUTH_LOGIN_OK',
      result: 'OK',
      resource: { type: 'User', id: user.id },
      context: { actorUserId: user.id, actorEmail: user.email },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Intento de rotación de refresh. `auditOnMissingCookie`: true para POST /auth/refresh;
   * false para POST /auth/session/restore (evita ruido de auditoría en cada carga anónima).
   */
  private async restoreRefreshToken(
    refreshRaw: string | undefined,
    auditOnMissingCookie: boolean,
  ): Promise<
    | {
        ok: true;
        accessToken: string;
        refreshToken: string;
        user: ReturnType<AuthService['sanitizeUser']>;
      }
    | {
        ok: false;
        reason:
          | 'MISSING_COOKIE'
          | 'INVALID_REFRESH'
          | 'INACTIVITY_TIMEOUT'
          | 'ROTATION_CONFLICT';
      }
  > {
    if (!refreshRaw) {
      if (auditOnMissingCookie) {
        await this.audit.log({
          action: 'AUTH_REFRESH_FAIL',
          result: 'FAIL',
          meta: { reason: 'MISSING_COOKIE' },
        });
      }
      return { ok: false, reason: 'MISSING_COOKIE' };
    }
    const tokenHash = this.hashRefresh(refreshRaw);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
          },
        },
      },
    });
    if (
      !row ||
      row.revokedAt ||
      row.expiresAt < new Date() ||
      !row.user.activo
    ) {
      await this.audit.log({
        action: 'AUTH_REFRESH_FAIL',
        result: 'FAIL',
        resource: { type: 'User', id: row?.userId ?? null },
        context: {
          actorUserId: row?.userId ?? null,
          actorEmail: row?.user.email ?? null,
        },
        meta: { reason: 'INVALID_REFRESH' },
      });
      return { ok: false, reason: 'INVALID_REFRESH' };
    }

    // Control de inactividad (ASVS V3): si el refresh no se usa en X minutos, se revoca.
    const inactivityMinutes = Number(
      this.config.get('SESSION_INACTIVITY_MINUTES', 60 * 24 * 7),
    ); // default 7 días
    const last = row.lastUsedAt ?? row.createdAt;
    const inactiveMs = Date.now() - new Date(last).getTime();
    if (inactiveMs > inactivityMinutes * 60_000) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.log({
        action: 'AUTH_REFRESH_FAIL',
        result: 'FAIL',
        resource: { type: 'User', id: row.userId },
        context: { actorUserId: row.userId, actorEmail: row.user.email },
        meta: { reason: 'INACTIVITY_TIMEOUT' },
      });
      return { ok: false, reason: 'INACTIVITY_TIMEOUT' };
    }

    // Rotación de refresh (uso único): invalida el token presentado y emite uno nuevo
    // con la misma fecha de caducidad absoluta (`expires_at`).
    const rawRefreshNew = randomBytes(32).toString('hex');
    const tokenHashNew = this.hashRefresh(rawRefreshNew);

    try {
      await this.prisma.$transaction(async (tx) => {
        const revoked = await tx.refreshToken.updateMany({
          where: { id: row.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (revoked.count !== 1) {
          throw new Error('ROTATION_CONFLICT');
        }
        await tx.refreshToken.create({
          data: {
            userId: row.userId,
            tokenHash: tokenHashNew,
            expiresAt: row.expiresAt,
            lastUsedAt: new Date(),
          },
        });
      });
    } catch {
      await this.audit.log({
        action: 'AUTH_REFRESH_FAIL',
        result: 'FAIL',
        resource: { type: 'User', id: row.userId },
        context: { actorUserId: row.userId, actorEmail: row.user.email },
        meta: { reason: 'ROTATION_CONFLICT' },
      });
      return { ok: false, reason: 'ROTATION_CONFLICT' };
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: row.user.id, email: row.user.email },
      this.accessSignOptions(),
    );

    await this.audit.log({
      action: 'AUTH_REFRESH_OK',
      result: 'OK',
      resource: { type: 'User', id: row.userId },
      context: { actorUserId: row.userId, actorEmail: row.user.email },
      meta: { rotated: true },
    });

    return {
      ok: true,
      accessToken,
      refreshToken: rawRefreshNew,
      user: this.sanitizeUser(row.user),
    };
  }

  /** `POST /auth/session/restore`: siempre HTTP 200; evita 401 en consola del navegador al arranque sin cookie. */
  async restoreSessionBootstrap(refreshRaw: string | undefined) {
    return this.restoreRefreshToken(refreshRaw, false);
  }

  async refresh(refreshRaw: string | undefined) {
    const result = await this.restoreRefreshToken(refreshRaw, true);
    if (!result.ok) {
      throw new UnauthorizedException();
    }
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  async logout(refreshRaw: string | undefined) {
    if (!refreshRaw) {
      return;
    }
    const tokenHash = this.hashRefresh(refreshRaw);
    const updated = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      action: 'AUTH_LOGOUT',
      result: 'OK',
      meta: { revokedCount: updated.count },
    });
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    nombres: string | null;
    apellidos: string | null;
    activo: boolean;
    roles: { role: { codigo: string; nombre: string } }[];
  }) {
    return {
      id: user.id,
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      roles: user.roles.map((ur) => ({
        codigo: ur.role.codigo,
        nombre: ur.role.nombre,
      })),
    };
  }

  async requestPasswordReset(input: {
    email: string;
    requestedIp?: string;
    userAgent?: string;
  }): Promise<{ ok: true; debugToken?: string }> {
    const email = input.email.toLowerCase().trim();

    // Respuesta constante (no enumeración de cuentas).
    const ok: { ok: true; debugToken?: string } = { ok: true };

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, activo: true },
    });
    if (!user?.activo) {
      await this.audit.log({
        action: 'AUTH_PASSWORD_RESET_REQUEST',
        result: 'OK',
        context: {
          actorUserId: null,
          actorEmail: email,
          ip: input.requestedIp ?? null,
          userAgent: input.userAgent ?? null,
        },
        meta: { account: 'NOT_FOUND_OR_INACTIVE' },
      });
      return ok;
    }

    // Revocar tokens previos no usados para evitar múltiples enlaces válidos.
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashOpaqueToken(rawToken);
    const minutes = Number(this.config.get('PASSWORD_RESET_MINUTES', 30));
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestedIp: input.requestedIp,
        userAgent: input.userAgent,
      },
    });

    await this.audit.log({
      action: 'AUTH_PASSWORD_RESET_REQUEST',
      result: 'OK',
      resource: { type: 'User', id: user.id },
      context: {
        actorUserId: user.id,
        actorEmail: email,
        ip: input.requestedIp ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    if (this.mail.isConfigured()) {
      const resetUrl = this.buildPasswordResetUrl(rawToken);
      try {
        await this.mail.sendPasswordReset({
          to: email,
          resetUrl,
          expiresMinutes: minutes,
        });
      } catch {
        await this.audit.log({
          action: 'AUTH_PASSWORD_RESET_MAIL_FAIL',
          result: 'FAIL',
          resource: { type: 'User', id: user.id },
          context: {
            actorUserId: user.id,
            actorEmail: email,
            ip: input.requestedIp ?? null,
            userAgent: input.userAgent ?? null,
          },
          meta: { reason: 'SMTP_ERROR' },
        });
        if (this.config.get('NODE_ENV') !== 'production') {
          ok.debugToken = rawToken;
        }
      }
    } else {
      if (this.config.get('NODE_ENV') === 'production') {
        await this.audit.log({
          action: 'AUTH_PASSWORD_RESET_MAIL_SKIP',
          result: 'FAIL',
          resource: { type: 'User', id: user.id },
          context: {
            actorUserId: user.id,
            actorEmail: email,
            ip: input.requestedIp ?? null,
            userAgent: input.userAgent ?? null,
          },
          meta: { reason: 'SMTP_NOT_CONFIGURED' },
        });
      } else {
        const debugOff =
          String(
            this.config.get<string>('PASSWORD_RESET_DEBUG_TOKEN') ?? 'true',
          ).toLowerCase() === 'false';
        if (!debugOff) {
          ok.debugToken = rawToken;
        }
      }
    }

    return ok;
  }

  async confirmPasswordReset(input: {
    token: string;
    newPassword: string;
  }): Promise<{ ok: true }> {
    const token = input.token.trim();
    if (!token) {
      throw new UnauthorizedException();
    }

    const tokenHash = this.hashOpaqueToken(token);
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !row ||
      row.usedAt ||
      row.revokedAt ||
      row.expiresAt < new Date() ||
      !row.user.activo
    ) {
      await this.audit.log({
        action: 'AUTH_PASSWORD_RESET_CONFIRM_FAIL',
        result: 'FAIL',
        resource: { type: 'User', id: row?.userId ?? null },
        context: {
          actorUserId: row?.userId ?? null,
          actorEmail: row?.user.email ?? null,
        },
        meta: { reason: 'INVALID_TOKEN' },
      });
      throw new UnauthorizedException();
    }

    const passwordHash = await argon2.hash(input.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      // Invalida sesiones activas: fuerza re-login tras restablecer contraseña.
      this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      action: 'AUTH_PASSWORD_RESET_CONFIRM_OK',
      result: 'OK',
      resource: { type: 'User', id: row.userId },
      context: { actorUserId: row.userId, actorEmail: row.user.email },
    });

    return { ok: true };
  }
}
