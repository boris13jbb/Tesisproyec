import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import { AuditService } from '../auditoria/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { decryptMfaSecret, encryptMfaSecret } from './mfa-crypto.util';

const CHALLENGE_TTL_MS = 5 * 60_000;

export type MfaChallengePurpose = 'LOGIN' | 'SETUP';

@Injectable()
export class MfaTotpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    authenticator.options = { window: 1 };
  }

  private encryptionMaterial(): string {
    const dedicated = this.config.get<string>('MFA_ENCRYPTION_KEY')?.trim();
    if (dedicated && dedicated.length >= 16) {
      return dedicated;
    }
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private issuerLabel(): string {
    return this.config.get<string>('APP_PUBLIC_NAME')?.trim() || 'SGD GADPR-LM';
  }

  private hashChallengeToken(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  private generateSecret(): string {
    return authenticator.generateSecret();
  }

  buildOtpAuthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, this.issuerLabel(), secret);
  }

  verifyCode(secret: string, code: string): boolean {
    const normalized = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(normalized)) {
      return false;
    }
    return authenticator.verify({ token: normalized, secret });
  }

  async isAdminMfaRequiredByPolicy(): Promise<boolean> {
    const row = await this.prisma.securityPolicy.findUnique({
      where: { id: 'default' },
      select: { desiredAdminStepUpAuth: true },
    });
    return !!row?.desiredAdminStepUpAuth;
  }

  userIsAdmin(user: { roles: { role: { codigo: string } }[] }): boolean {
    return user.roles.some((r) => r.role.codigo === 'ADMIN');
  }

  async getTotpState(userId: string): Promise<{
    enabled: boolean;
    pending: boolean;
  }> {
    const row = await this.prisma.userTotp.findUnique({
      where: { userId },
      select: { enabledAt: true },
    });
    if (!row) {
      return { enabled: false, pending: false };
    }
    return {
      enabled: row.enabledAt != null,
      pending: row.enabledAt == null,
    };
  }

  async adminMustUseMfa(user: {
    id: string;
    roles: { role: { codigo: string } }[];
  }): Promise<boolean> {
    if (!this.userIsAdmin(user)) {
      return false;
    }
    return this.isAdminMfaRequiredByPolicy();
  }

  async createLoginChallenge(
    userId: string,
    purpose: MfaChallengePurpose,
    context?: { ip?: string | null; userAgent?: string | null },
  ): Promise<{ challengeToken: string; expiresAt: Date }> {
    const raw = randomBytes(32).toString('hex');
    const tokenHash = this.hashChallengeToken(raw);
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    await this.prisma.mfaLoginChallenge.create({
      data: {
        userId,
        tokenHash,
        purpose,
        expiresAt,
      },
    });

    await this.audit.log({
      action: 'AUTH_MFA_CHALLENGE_ISSUED',
      result: 'OK',
      resource: { type: 'User', id: userId },
      context: {
        actorUserId: userId,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
      },
      meta: { purpose },
    });

    return { challengeToken: raw, expiresAt };
  }

  private async resolveChallenge(
    challengeToken: string,
    expectedPurpose?: MfaChallengePurpose,
  ) {
    const token = challengeToken.trim();
    if (!token) {
      throw new UnauthorizedException();
    }
    const tokenHash = this.hashChallengeToken(token);
    const row = await this.prisma.mfaLoginChallenge.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { roles: { include: { role: true } } },
        },
      },
    });
    if (!row || row.expiresAt < new Date() || !row.user.activo) {
      throw new UnauthorizedException(
        'Código o sesión de verificación expirados',
      );
    }
    if (expectedPurpose && row.purpose !== expectedPurpose) {
      throw new UnauthorizedException();
    }
    return row;
  }

  async consumeChallenge(challengeId: string): Promise<void> {
    await this.prisma.mfaLoginChallenge.delete({ where: { id: challengeId } });
  }

  async beginSetupForChallenge(
    challengeToken: string,
    email: string,
  ): Promise<{ otpauthUrl: string; secretMasked: string; secret: string }> {
    const row = await this.resolveChallenge(challengeToken, 'SETUP');
    const secret = this.generateSecret();
    const secretEnc = encryptMfaSecret(secret, this.encryptionMaterial());

    await this.prisma.userTotp.upsert({
      where: { userId: row.userId },
      create: {
        userId: row.userId,
        secretEnc,
        enabledAt: null,
      },
      update: {
        secretEnc,
        enabledAt: null,
      },
    });

    const otpauthUrl = this.buildOtpAuthUrl(email, secret);
    const secretMasked = `${secret.slice(0, 4)}…${secret.slice(-4)}`;
    return { otpauthUrl, secretMasked, secret };
  }

  async beginSetupForAuthenticatedUser(
    userId: string,
    email: string,
  ): Promise<{ otpauthUrl: string; secretMasked: string; secret: string }> {
    const secret = this.generateSecret();
    const secretEnc = encryptMfaSecret(secret, this.encryptionMaterial());

    await this.prisma.userTotp.upsert({
      where: { userId },
      create: { userId, secretEnc, enabledAt: null },
      update: { secretEnc, enabledAt: null },
    });

    return {
      otpauthUrl: this.buildOtpAuthUrl(email, secret),
      secretMasked: `${secret.slice(0, 4)}…${secret.slice(-4)}`,
      secret,
    };
  }

  private async getDecryptedSecret(userId: string): Promise<string> {
    const row = await this.prisma.userTotp.findUnique({
      where: { userId },
      select: { secretEnc: true, enabledAt: true },
    });
    if (!row) {
      throw new BadRequestException('No hay enrolamiento TOTP iniciado');
    }
    return decryptMfaSecret(row.secretEnc, this.encryptionMaterial());
  }

  async confirmSetup(
    userId: string,
    code: string,
    context?: { ip?: string | null; userAgent?: string | null; email?: string },
  ): Promise<void> {
    const secret = await this.getDecryptedSecret(userId);
    if (!this.verifyCode(secret, code)) {
      await this.audit.log({
        action: 'AUTH_MFA_VERIFY_FAIL',
        result: 'FAIL',
        resource: { type: 'User', id: userId },
        context: {
          actorUserId: userId,
          actorEmail: context?.email ?? null,
          ip: context?.ip ?? null,
          userAgent: context?.userAgent ?? null,
        },
        meta: { phase: 'SETUP' },
      });
      throw new UnauthorizedException('Código de verificación incorrecto');
    }

    await this.prisma.userTotp.update({
      where: { userId },
      data: { enabledAt: new Date() },
    });

    await this.audit.log({
      action: 'AUTH_MFA_ENABLED',
      result: 'OK',
      resource: { type: 'User', id: userId },
      context: {
        actorUserId: userId,
        actorEmail: context?.email ?? null,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
      },
    });
  }

  async verifyLoginChallenge(
    challengeToken: string,
    code: string,
    context?: { ip?: string | null; userAgent?: string | null },
  ): Promise<{
    user: {
      id: string;
      email: string;
      roles: { role: { codigo: string; nombre: string } }[];
      nombres: string | null;
      apellidos: string | null;
      activo: boolean;
    };
    challengeId: string;
  }> {
    const row = await this.resolveChallenge(challengeToken, 'LOGIN');
    const totp = await this.prisma.userTotp.findUnique({
      where: { userId: row.userId },
    });
    if (!totp?.enabledAt) {
      throw new UnauthorizedException();
    }

    const secret = decryptMfaSecret(totp.secretEnc, this.encryptionMaterial());
    if (!this.verifyCode(secret, code)) {
      await this.audit.log({
        action: 'AUTH_MFA_VERIFY_FAIL',
        result: 'FAIL',
        resource: { type: 'User', id: row.userId },
        context: {
          actorUserId: row.userId,
          actorEmail: row.user.email,
          ip: context?.ip ?? null,
          userAgent: context?.userAgent ?? null,
        },
        meta: { phase: 'LOGIN' },
      });
      throw new UnauthorizedException('Código de verificación incorrecto');
    }

    await this.audit.log({
      action: 'AUTH_MFA_VERIFY_OK',
      result: 'OK',
      resource: { type: 'User', id: row.userId },
      context: {
        actorUserId: row.userId,
        actorEmail: row.user.email,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
      },
    });

    return { user: row.user, challengeId: row.id };
  }

  async confirmSetupLogin(
    challengeToken: string,
    code: string,
    context?: { ip?: string | null; userAgent?: string | null },
  ): Promise<{
    user: {
      id: string;
      email: string;
      roles: { role: { codigo: string; nombre: string } }[];
      nombres: string | null;
      apellidos: string | null;
      activo: boolean;
    };
    challengeId: string;
  }> {
    const row = await this.resolveChallenge(challengeToken, 'SETUP');
    await this.confirmSetup(row.userId, code, {
      ip: context?.ip,
      userAgent: context?.userAgent,
      email: row.user.email,
    });
    return { user: row.user, challengeId: row.id };
  }

  async disableTotp(
    userId: string,
    code: string,
    context?: { ip?: string | null; userAgent?: string | null; email?: string },
  ): Promise<void> {
    const totp = await this.prisma.userTotp.findUnique({
      where: { userId },
    });
    if (!totp?.enabledAt) {
      throw new BadRequestException(
        'La verificación en dos pasos no está activa',
      );
    }

    const mustKeep =
      (await this.isAdminMfaRequiredByPolicy()) &&
      (await this.prisma.userRole.findFirst({
        where: { userId, role: { codigo: 'ADMIN' } },
      })) != null;

    if (mustKeep) {
      throw new BadRequestException(
        'La política institucional exige verificación en dos pasos para administradores',
      );
    }

    const secret = decryptMfaSecret(totp.secretEnc, this.encryptionMaterial());
    if (!this.verifyCode(secret, code)) {
      throw new UnauthorizedException('Código de verificación incorrecto');
    }

    await this.prisma.userTotp.delete({ where: { userId } });

    await this.audit.log({
      action: 'AUTH_MFA_DISABLED',
      result: 'OK',
      resource: { type: 'User', id: userId },
      context: {
        actorUserId: userId,
        actorEmail: context?.email ?? null,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
      },
    });
  }
}
