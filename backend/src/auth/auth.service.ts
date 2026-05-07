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
import type { JwtRequestUser } from './request-user';

export type AdminSecuritySummary = {
  schemaVersion: 1;
  passwordPolicy: {
    minLength: number;
    enforcedOnUserCreate: boolean;
  };
  accountLockout: {
    enabled: boolean;
    maxFailedAttempts: number;
    lockoutMinutes: number;
  };
  /** Caducidad del access token JWT (p. ej. `15m`, `1h`). No sustituye política de idle en servidor stateless. */
  jwtAccessExpiresIn: string;
  refreshSessionDays: number;
  passwordReuseHistory: {
    implemented: boolean;
    /** Placeholder si existiera política de reuso. */
    lastPasswordsRemembered: number;
  };
  adminStepUpAuth: { implemented: boolean };
  applicationControls: {
    helmetEnabled: boolean;
    globalValidationPipe: boolean;
    corsWithCredentials: boolean;
    loginThrottle: { limitPerIp: number; windowMinutes: number };
    fileUpload: { maxMegabytes: number; mimeAllowlistEnforced: boolean };
  };
};

export type SecurityPolicyRecord = {
  schemaVersion: 1;
  desired: {
    passwordMinLength: number;
    lockoutEnabled: boolean;
    lockoutMaxAttempts: number;
    lockoutMinutes: number;
    jwtAccessExpiresIn: string;
    refreshSessionDays: number;
    passwordHistoryCount: number;
    adminStepUpAuth: boolean;
  };
  notes: string | null;
  updatedAt: string | null;
  updatedBy: { userId: string | null; email: string | null } | null;
};

@Injectable()
export class AuthService {
  /** Coincide con `CreateUsuarioDto` / `PasswordResetConfirmDto` (MinLength). */
  private static readonly USER_PASSWORD_MIN_LENGTH = 8 as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  private clampInt(
    v: unknown,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(n)));
  }

  private normalizeExpiresIn(
    v: string | undefined | null,
    fallback: string,
  ): string {
    const t = (v ?? '').trim();
    return t.length > 0 && t.length <= 16 ? t : fallback;
  }

  async getSecurityPolicyRecord(): Promise<SecurityPolicyRecord> {
    const row = await this.prisma.securityPolicy.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        desiredPasswordMinLength: AuthService.USER_PASSWORD_MIN_LENGTH,
        desiredLockoutEnabled: true,
        desiredLockoutMaxAttempts: this.loginLockoutMaxAttempts(),
        desiredLockoutMinutes: this.loginLockoutMinutes(),
        desiredJwtAccessExpiresIn:
          this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m',
        desiredRefreshSessionDays: this.clampInt(
          this.config.get('JWT_REFRESH_DAYS', 7),
          7,
          1,
          365,
        ),
        desiredPasswordHistoryCount: 0,
        desiredAdminStepUpAuth: false,
        notes: null,
        updatedByUserId: null,
      },
      update: {},
      select: {
        desiredPasswordMinLength: true,
        desiredLockoutEnabled: true,
        desiredLockoutMaxAttempts: true,
        desiredLockoutMinutes: true,
        desiredJwtAccessExpiresIn: true,
        desiredRefreshSessionDays: true,
        desiredPasswordHistoryCount: true,
        desiredAdminStepUpAuth: true,
        notes: true,
        updatedAt: true,
        updatedBy: { select: { id: true, email: true } },
      },
    });

    return {
      schemaVersion: 1,
      desired: {
        passwordMinLength: row.desiredPasswordMinLength,
        lockoutEnabled: row.desiredLockoutEnabled,
        lockoutMaxAttempts: row.desiredLockoutMaxAttempts,
        lockoutMinutes: row.desiredLockoutMinutes,
        jwtAccessExpiresIn: row.desiredJwtAccessExpiresIn,
        refreshSessionDays: row.desiredRefreshSessionDays,
        passwordHistoryCount: row.desiredPasswordHistoryCount,
        adminStepUpAuth: row.desiredAdminStepUpAuth,
      },
      notes: row.notes ?? null,
      updatedAt: row.updatedAt?.toISOString() ?? null,
      updatedBy: row.updatedBy
        ? { userId: row.updatedBy.id, email: row.updatedBy.email }
        : null,
    };
  }

  async updateSecurityPolicyRecord(
    dto: {
      desiredPasswordMinLength: number;
      desiredLockoutEnabled: boolean;
      desiredLockoutMaxAttempts: number;
      desiredLockoutMinutes: number;
      desiredJwtAccessExpiresIn: string;
      desiredRefreshSessionDays: number;
      desiredPasswordHistoryCount: number;
      desiredAdminStepUpAuth: boolean;
      notes?: string;
    },
    actor: JwtRequestUser,
    context?: { ip?: string; userAgent?: string },
  ): Promise<SecurityPolicyRecord> {
    const updated = await this.prisma.securityPolicy.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        desiredPasswordMinLength: this.clampInt(
          dto.desiredPasswordMinLength,
          8,
          8,
          128,
        ),
        desiredLockoutEnabled: !!dto.desiredLockoutEnabled,
        desiredLockoutMaxAttempts: this.clampInt(
          dto.desiredLockoutMaxAttempts,
          5,
          1,
          50,
        ),
        desiredLockoutMinutes: this.clampInt(
          dto.desiredLockoutMinutes,
          20,
          1,
          1440,
        ),
        desiredJwtAccessExpiresIn: this.normalizeExpiresIn(
          dto.desiredJwtAccessExpiresIn,
          '15m',
        ),
        desiredRefreshSessionDays: this.clampInt(
          dto.desiredRefreshSessionDays,
          7,
          1,
          365,
        ),
        desiredPasswordHistoryCount: this.clampInt(
          dto.desiredPasswordHistoryCount,
          0,
          0,
          24,
        ),
        desiredAdminStepUpAuth: !!dto.desiredAdminStepUpAuth,
        notes: dto.notes?.trim() ? dto.notes.trim().slice(0, 800) : null,
        updatedByUserId: actor.id,
      },
      update: {
        desiredPasswordMinLength: this.clampInt(
          dto.desiredPasswordMinLength,
          8,
          8,
          128,
        ),
        desiredLockoutEnabled: !!dto.desiredLockoutEnabled,
        desiredLockoutMaxAttempts: this.clampInt(
          dto.desiredLockoutMaxAttempts,
          5,
          1,
          50,
        ),
        desiredLockoutMinutes: this.clampInt(
          dto.desiredLockoutMinutes,
          20,
          1,
          1440,
        ),
        desiredJwtAccessExpiresIn: this.normalizeExpiresIn(
          dto.desiredJwtAccessExpiresIn,
          '15m',
        ),
        desiredRefreshSessionDays: this.clampInt(
          dto.desiredRefreshSessionDays,
          7,
          1,
          365,
        ),
        desiredPasswordHistoryCount: this.clampInt(
          dto.desiredPasswordHistoryCount,
          0,
          0,
          24,
        ),
        desiredAdminStepUpAuth: !!dto.desiredAdminStepUpAuth,
        notes: dto.notes?.trim() ? dto.notes.trim().slice(0, 800) : null,
        updatedByUserId: actor.id,
      },
      select: {
        desiredPasswordMinLength: true,
        desiredLockoutEnabled: true,
        desiredLockoutMaxAttempts: true,
        desiredLockoutMinutes: true,
        desiredJwtAccessExpiresIn: true,
        desiredRefreshSessionDays: true,
        desiredPasswordHistoryCount: true,
        desiredAdminStepUpAuth: true,
        notes: true,
        updatedAt: true,
        updatedBy: { select: { id: true, email: true } },
      },
    });

    await this.audit.log({
      action: 'SECURITY_POLICY_UPDATED',
      result: 'OK',
      context: {
        actorUserId: actor.id,
        actorEmail: actor.email ?? null,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
      },
      resource: { type: 'SecurityPolicy', id: 'default' },
      meta: {
        desiredPasswordMinLength: updated.desiredPasswordMinLength,
        desiredLockoutEnabled: updated.desiredLockoutEnabled,
        desiredLockoutMaxAttempts: updated.desiredLockoutMaxAttempts,
        desiredLockoutMinutes: updated.desiredLockoutMinutes,
        desiredJwtAccessExpiresIn: updated.desiredJwtAccessExpiresIn,
        desiredRefreshSessionDays: updated.desiredRefreshSessionDays,
        desiredPasswordHistoryCount: updated.desiredPasswordHistoryCount,
        desiredAdminStepUpAuth: updated.desiredAdminStepUpAuth,
      },
    });

    return {
      schemaVersion: 1,
      desired: {
        passwordMinLength: updated.desiredPasswordMinLength,
        lockoutEnabled: updated.desiredLockoutEnabled,
        lockoutMaxAttempts: updated.desiredLockoutMaxAttempts,
        lockoutMinutes: updated.desiredLockoutMinutes,
        jwtAccessExpiresIn: updated.desiredJwtAccessExpiresIn,
        refreshSessionDays: updated.desiredRefreshSessionDays,
        passwordHistoryCount: updated.desiredPasswordHistoryCount,
        adminStepUpAuth: updated.desiredAdminStepUpAuth,
      },
      notes: updated.notes ?? null,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
      updatedBy: updated.updatedBy
        ? { userId: updated.updatedBy.id, email: updated.updatedBy.email }
        : null,
    };
  }

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

  private loginLockoutMaxAttempts(): number {
    const n = Number(this.config.get('AUTH_LOCKOUT_MAX_ATTEMPTS', 5));
    return Number.isFinite(n) ? Math.min(30, Math.max(3, Math.floor(n))) : 5;
  }

  private loginLockoutMinutes(): number {
    const n = Number(this.config.get('AUTH_LOCKOUT_MINUTES', 15));
    return Number.isFinite(n)
      ? Math.min(24 * 60, Math.max(5, Math.floor(n)))
      : 15;
  }

  async login(
    dto: LoginDto,
    client?: { ip?: string | null; userAgent?: string | null },
  ) {
    const email = dto.email.toLowerCase().trim();
    const now = new Date();
    const auditCtxBase = {
      ip: client?.ip ?? null,
      userAgent: client?.userAgent ?? null,
    };

    let user = await this.prisma.user.findUnique({
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
        context: { actorUserId: null, actorEmail: email, ...auditCtxBase },
        meta: { reason: 'USER_NOT_FOUND_OR_INACTIVE' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.lockedUntil) {
      if (user.lockedUntil > now) {
        await this.audit.log({
          action: 'AUTH_LOGIN_FAIL',
          result: 'FAIL',
          resource: { type: 'User', id: user.id },
          context: {
            actorUserId: user.id,
            actorEmail: user.email,
            ...auditCtxBase,
          },
          meta: { reason: 'ACCOUNT_LOCKED' },
        });
        throw new UnauthorizedException('Credenciales inválidas');
      }
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lockedUntil: null, failedLoginAttempts: 0 },
        include: { roles: { include: { role: true } } },
      });
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      const max = this.loginLockoutMaxAttempts();
      const lockMinutes = this.loginLockoutMinutes();
      const nextAttempt = user.failedLoginAttempts + 1;
      const shouldLock = nextAttempt >= max;
      const lockedUntil = shouldLock
        ? new Date(now.getTime() + lockMinutes * 60_000)
        : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : nextAttempt,
          lockedUntil,
        },
      });

      await this.audit.log({
        action: 'AUTH_LOGIN_FAIL',
        result: 'FAIL',
        resource: { type: 'User', id: user.id },
        context: {
          actorUserId: user.id,
          actorEmail: user.email,
          ...auditCtxBase,
        },
        meta: {
          reason: 'BAD_PASSWORD',
          attempt: nextAttempt,
          ...(shouldLock && lockedUntil
            ? { lockedUntil: lockedUntil.toISOString() }
            : {}),
        },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        ultimoLoginAt: new Date(),
      },
    });

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
      context: {
        actorUserId: user.id,
        actorEmail: user.email,
        ...auditCtxBase,
      },
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
    dependenciaId: string | null;
    activo: boolean;
    roles: { role: { codigo: string; nombre: string } }[];
  }) {
    return {
      id: user.id,
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      dependenciaId: user.dependenciaId,
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
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
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

  private static parseAuditMetaJson(
    metaJson: string | null,
  ): Record<string, unknown> {
    if (!metaJson) {
      return {};
    }
    try {
      const v = JSON.parse(metaJson) as unknown;
      return v !== null && typeof v === 'object'
        ? (v as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private profileDocumentoIdFromRow(
    meta: Record<string, unknown>,
  ): string | null {
    const raw = meta.documentoId;
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }

  private profileReportKindLabel(kind: unknown): string {
    if (kind === 'documentos') return 'documentos';
    if (kind === 'auditoria') return 'auditoría';
    if (kind === 'pendientes_revision') return 'pendientes de revisión';
    return 'informe';
  }

  private profileActivityLabel(
    row: {
      action: string;
      resourceType: string | null;
      resourceId: string | null;
      metaJson: string | null;
    },
    codigoById: Map<string, string>,
  ): string {
    const meta = AuthService.parseAuditMetaJson(row.metaJson);
    const docIdDirect =
      this.profileDocumentoIdFromRow(meta) ??
      (row.resourceType === 'Documento' && row.resourceId
        ? row.resourceId
        : null);
    const codigo = docIdDirect ? codigoById.get(docIdDirect) : undefined;

    switch (row.action) {
      case 'AUTH_LOGIN_OK':
        return 'Inició sesión correctamente';
      case 'AUTH_LOGOUT':
        return 'Cerró sesión';
      case 'DOC_FILE_UPLOADED':
        return codigo
          ? `Cargó documento ${codigo}`
          : 'Cargó un archivo en un documento';
      case 'DOC_FILE_DOWNLOADED':
        return codigo
          ? `Consultó documento ${codigo}`
          : 'Consultó un documento (descarga/visualización)';
      case 'DOC_FILE_DELETED':
        return codigo
          ? `Eliminó un archivo del documento ${codigo}`
          : 'Eliminó un archivo documental';
      case 'DOC_STATE_CHANGED':
        return codigo
          ? `Actualizó documento ${codigo}`
          : 'Actualizó un documento';
      case 'DOC_SUBMITTED_FOR_REVIEW':
        return codigo
          ? `Envió a revisión el documento ${codigo}`
          : 'Envió un documento a revisión';
      case 'DOC_REVIEW_RESOLVED':
        return codigo
          ? `Resolvió la revisión del documento ${codigo}`
          : 'Resolvió una revisión documental';
      case 'REPORT_EXPORTED':
        return `Exportó reporte (${this.profileReportKindLabel(meta.kind)})`;
      case 'USER_UPDATED':
        return 'Su cuenta fue actualizada por un administrador';
      case 'USER_PASSWORD_RESET':
        return 'Contraseña restablecida por administración';
      case 'AUTH_PASSWORD_RESET_CONFIRM_OK':
        return 'Restableció su contraseña';
      case 'AUTH_PASSWORD_RESET_REQUEST':
        return 'Solicitó restablecer contraseña';
      case 'BACKUP_VERIFIED':
        return 'Registró verificación de respaldo institucional';
      default:
        return row.action;
    }
  }

  /**
   * Perfil enriquecido del usuario autenticado + actividad reciente desde auditoría
   * (solo lecturas propias, sin exponer IPs ni metadatos sensibles más allá del necesario para la etiqueta).
   */
  async getMyProfile(viewer: JwtRequestUser) {
    const PROFILE_AUDIT_SKIP = [
      'AUTH_REFRESH_OK',
      'AUTH_REFRESH_FAIL',
      'AUTH_RATE_LIMITED',
    ] as const;

    const user = await this.prisma.user.findUnique({
      where: { id: viewer.id },
      select: {
        id: true,
        email: true,
        nombres: true,
        apellidos: true,
        activo: true,
        ultimoLoginAt: true,
        dependencia: { select: { codigo: true, nombre: true } },
        cargo: { select: { nombre: true } },
        roles: {
          include: { role: { select: { codigo: true, nombre: true } } },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    const lastLogin = await this.prisma.auditLog.findFirst({
      where: {
        actorUserId: viewer.id,
        action: 'AUTH_LOGIN_OK',
        result: 'OK',
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const rawLogs = await this.prisma.auditLog.findMany({
      where: {
        AND: [
          {
            OR: [{ actorUserId: viewer.id }, { actorEmail: viewer.email }],
          },
          { result: 'OK' },
          { action: { notIn: [...PROFILE_AUDIT_SKIP] } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 16,
      select: {
        id: true,
        createdAt: true,
        action: true,
        result: true,
        resourceType: true,
        resourceId: true,
        metaJson: true,
      },
    });

    const docIds = new Set<string>();
    for (const row of rawLogs) {
      const meta = AuthService.parseAuditMetaJson(row.metaJson);
      const fromMeta = this.profileDocumentoIdFromRow(meta);
      if (fromMeta) {
        docIds.add(fromMeta);
      }
      if (row.resourceType === 'Documento' && row.resourceId) {
        docIds.add(row.resourceId);
      }
    }

    const docs =
      docIds.size > 0
        ? await this.prisma.documento.findMany({
            where: { id: { in: [...docIds] } },
            select: { id: true, codigo: true },
          })
        : [];
    const codigoById = new Map(docs.map((d) => [d.id, d.codigo]));

    const activity = rawLogs.slice(0, 8).map((row) => ({
      id: row.id,
      at: row.createdAt.toISOString(),
      action: row.action,
      label: this.profileActivityLabel(row, codigoById),
    }));

    return {
      schemaVersion: 1 as const,
      usuario: {
        id: user.id,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        activo: user.activo,
        dependencia: user.dependencia,
        cargoNombre: user.cargo?.nombre ?? null,
        roles: user.roles.map((ur) => ({
          codigo: ur.role.codigo,
          nombre: ur.role.nombre,
        })),
      },
      lastLoginAt:
        user.ultimoLoginAt?.toISOString() ??
        lastLogin?.createdAt.toISOString() ??
        null,
      activity,
    };
  }

  /**
   * Lectura de políticas operativas efectivas (sin secretos). Solo consumo UI ADMIN.
   */
  getAdminSecuritySummary(): AdminSecuritySummary {
    const refreshDaysRaw = Number(this.config.get('JWT_REFRESH_DAYS', 7));
    const refreshSessionDays = Number.isFinite(refreshDaysRaw)
      ? Math.min(365, Math.max(1, Math.floor(refreshDaysRaw)))
      : 7;

    return {
      schemaVersion: 1,
      passwordPolicy: {
        minLength: AuthService.USER_PASSWORD_MIN_LENGTH,
        enforcedOnUserCreate: true,
      },
      accountLockout: {
        enabled: true,
        maxFailedAttempts: this.loginLockoutMaxAttempts(),
        lockoutMinutes: this.loginLockoutMinutes(),
      },
      jwtAccessExpiresIn:
        this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m',
      refreshSessionDays,
      passwordReuseHistory: {
        implemented: false,
        lastPasswordsRemembered: 0,
      },
      adminStepUpAuth: { implemented: false },
      applicationControls: {
        helmetEnabled: true,
        globalValidationPipe: true,
        corsWithCredentials: true,
        loginThrottle: { limitPerIp: 8, windowMinutes: 10 },
        fileUpload: { maxMegabytes: 50, mimeAllowlistEnforced: true },
      },
    };
  }
}
