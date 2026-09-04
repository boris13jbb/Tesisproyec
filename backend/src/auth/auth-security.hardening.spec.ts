import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { AuthService } from './auth.service';
import { encryptMfaSecret } from './mfa-crypto.util';
import { MfaTotpService } from './mfa-totp.service';

const SECRET_MATERIAL = 'jwt-access-secret-test-32chars-min';
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

describe('Auth security hardening — MFA + reset + lockout', () => {
  describe('MfaTotpService', () => {
    const audit = { log: jest.fn() };
    const prisma = {
      userTotp: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      mfaLoginChallenge: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      securityPolicy: { findUnique: jest.fn() },
      userRole: { findFirst: jest.fn() },
    };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'APP_PUBLIC_NAME') return 'SGD-GADPR-LM';
        return undefined;
      }),
      getOrThrow: jest.fn(() => SECRET_MATERIAL),
    };

    let service: MfaTotpService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new MfaTotpService(
        prisma as never,
        config as never,
        audit as never,
      );
    });

    it('beginSetupForChallenge no expone campo secret en la respuesta', async () => {
      prisma.mfaLoginChallenge.findUnique.mockResolvedValue({
        id: 'ch-1',
        userId: 'u-1',
        purpose: 'SETUP',
        expiresAt: new Date(Date.now() + 60_000),
        user: { id: 'u-1', email: 'admin@local.test', activo: true },
      });
      prisma.userTotp.upsert.mockResolvedValue({});

      // resolveChallenge hashea el token; mockeamos findUnique por hash vía spy interno
      jest
        .spyOn(service as never, 'resolveChallenge' as never)
        .mockResolvedValue({
          id: 'ch-1',
          userId: 'u-1',
          purpose: 'SETUP',
          expiresAt: new Date(Date.now() + 60_000),
          user: {
            id: 'u-1',
            email: 'admin@local.test',
            roles: [],
            nombres: null,
            apellidos: null,
            activo: true,
          },
        } as never);

      const result = await service.beginSetupForChallenge(
        'opaque-challenge-token',
        'admin@local.test',
      );

      expect(result.otpauthUrl.startsWith('otpauth://totp/')).toBe(true);
      // El secreto TOTP va embebido en otpauth (estándar); no se imprime el valor.
      expect(result.otpauthUrl.includes('secret=')).toBe(true);
      expect(result.secretMasked.length).toBeGreaterThan(0);
      expect(Object.keys(result).sort()).toEqual(
        ['otpauthUrl', 'secretMasked'].sort(),
      );
      expect(Object.prototype.hasOwnProperty.call(result, 'secret')).toBe(
        false,
      );
    });

    it('verifyLoginChallenge consume el challenge de forma atómica (anti-replay)', async () => {
      const user = {
        id: 'u-1',
        email: 'admin@local.test',
        roles: [{ role: { codigo: 'ADMIN', nombre: 'Admin' } }],
        nombres: null,
        apellidos: null,
        activo: true,
      };
      jest
        .spyOn(service as never, 'resolveChallenge' as never)
        .mockResolvedValue({
          id: 'ch-login',
          userId: 'u-1',
          purpose: 'LOGIN',
          expiresAt: new Date(Date.now() + 60_000),
          user,
        } as never);
      prisma.userTotp.findUnique.mockResolvedValue({
        secretEnc: encryptMfaSecret(TOTP_SECRET, SECRET_MATERIAL),
        enabledAt: new Date(),
      });
      prisma.mfaLoginChallenge.deleteMany.mockResolvedValue({ count: 1 });

      const code = authenticator.generate(TOTP_SECRET);
      const first = await service.verifyLoginChallenge('tok', code);
      expect(first.challengeId).toBe('ch-login');
      const deleteCalls = prisma.mfaLoginChallenge.deleteMany.mock
        .calls as Array<[{ where: { id: string; expiresAt: { gt: Date } } }]>;
      const consumeArg = deleteCalls[0]?.[0];
      expect(consumeArg?.where.id).toBe('ch-login');
      expect(consumeArg?.where.expiresAt.gt).toBeInstanceOf(Date);

      prisma.mfaLoginChallenge.deleteMany.mockResolvedValue({ count: 0 });
      await expect(
        service.verifyLoginChallenge('tok', code),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('disableTotp bloquea a SUPERADMIN cuando la política exige MFA admin', async () => {
      prisma.userTotp.findUnique.mockResolvedValue({
        secretEnc: encryptMfaSecret(TOTP_SECRET, SECRET_MATERIAL),
        enabledAt: new Date(),
      });
      prisma.securityPolicy.findUnique.mockResolvedValue({
        desiredAdminStepUpAuth: true,
      });
      prisma.userRole.findFirst.mockResolvedValue({ id: 'ur-1' });

      await expect(
        service.disableTotp('sa-1', authenticator.generate(TOTP_SECRET), {
          email: 'superadmin@local.test',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.userRole.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'sa-1',
          role: { codigo: { in: ['ADMIN', 'SUPERADMIN'] } },
        },
      });
      expect(prisma.userTotp.delete).not.toHaveBeenCalled();
    });

    it('tras N fallos de código invalida el challenge MFA', async () => {
      const user = {
        id: 'u-1',
        email: 'admin@local.test',
        roles: [],
        nombres: null,
        apellidos: null,
        activo: true,
      };
      const resolveSpy = jest
        .spyOn(service as never, 'resolveChallenge' as never)
        .mockResolvedValue({
          id: 'ch-fail',
          userId: 'u-1',
          purpose: 'LOGIN',
          expiresAt: new Date(Date.now() + 60_000),
          user,
        } as never);
      prisma.userTotp.findUnique.mockResolvedValue({
        secretEnc: encryptMfaSecret(TOTP_SECRET, SECRET_MATERIAL),
        enabledAt: new Date(),
      });
      prisma.mfaLoginChallenge.deleteMany.mockResolvedValue({ count: 1 });

      for (let i = 0; i < 5; i += 1) {
        await expect(
          service.verifyLoginChallenge('tok', '000000'),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }

      expect(prisma.mfaLoginChallenge.deleteMany).toHaveBeenCalledWith({
        where: { id: 'ch-fail' },
      });

      resolveSpy.mockRejectedValue(new UnauthorizedException());
      await expect(
        service.verifyLoginChallenge(
          'tok',
          authenticator.generate(TOTP_SECRET),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('AuthService — reset claim + lockout policy', () => {
    const prisma = {
      passwordResetToken: {
        findUnique: jest.fn(),
      },
      securityPolicy: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const jwt = { signAsync: jest.fn() };
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'AUTH_LOCKOUT_MAX_ATTEMPTS') return 5;
        if (key === 'AUTH_LOCKOUT_MINUTES') return 15;
        if (key === 'JWT_ACCESS_EXPIRES') return '15m';
        if (key === 'JWT_REFRESH_DAYS') return 7;
        if (key === 'NODE_ENV') return 'test';
        return fallback;
      }),
      getOrThrow: jest.fn(() => SECRET_MATERIAL),
    };
    const audit = { log: jest.fn() };
    const mail = { sendMail: jest.fn() };
    const passwordPolicy = {
      assertPasswordNotReused: jest.fn().mockResolvedValue(undefined),
      recordPasswordChange: jest.fn().mockResolvedValue(undefined),
      getEffectivePasswordHistoryCount: jest.fn().mockResolvedValue(5),
    };
    const mfaTotp = {
      isAdminMfaRequiredByPolicy: jest.fn().mockResolvedValue(true),
    };

    let service: AuthService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new AuthService(
        prisma as never,
        jwt as never,
        config as never,
        audit as never,
        mail as never,
        passwordPolicy as never,
        mfaTotp as never,
      );
    });

    it('confirmPasswordReset usa claim atómico (updateMany usedAt null)', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        userId: 'u-1',
        usedAt: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: {
          id: 'u-1',
          email: 'user@local.test',
          activo: true,
          passwordHash: 'argon2-old',
        },
      });

      prisma.$transaction.mockImplementation(
        async (
          fn: (tx: {
            passwordResetToken: { updateMany: jest.Mock };
            user: { update: jest.Mock };
            refreshToken: { updateMany: jest.Mock };
          }) => Promise<void>,
        ) => {
          const tx = {
            passwordResetToken: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            user: { update: jest.fn().mockResolvedValue({}) },
            refreshToken: {
              updateMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
          };
          await fn(tx);
          const claimCalls = tx.passwordResetToken.updateMany.mock
            .calls as Array<
            [
              {
                where: {
                  id: string;
                  usedAt: null;
                  revokedAt: null;
                  expiresAt: { gt: Date };
                };
                data: { usedAt: Date };
              },
            ]
          >;
          const claimArg = claimCalls[0]?.[0];
          expect(claimArg?.where.id).toBe('prt-1');
          expect(claimArg?.where.usedAt).toBeNull();
          expect(claimArg?.where.revokedAt).toBeNull();
          expect(claimArg?.where.expiresAt.gt).toBeInstanceOf(Date);
          expect(claimArg?.data.usedAt).toBeInstanceOf(Date);
          expect(tx.refreshToken.updateMany).toHaveBeenCalled();
        },
      );

      await expect(
        service.confirmPasswordReset({
          token: 'opaque-reset-token-value-32chars!!',
          newPassword: 'NuevaClaveSegura1!',
        }),
      ).resolves.toEqual({ ok: true });
    });

    it('confirmPasswordReset falla si el claim concurrente pierde (count 0)', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-2',
        userId: 'u-2',
        usedAt: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: {
          id: 'u-2',
          email: 'user2@local.test',
          activo: true,
          passwordHash: 'argon2-old',
        },
      });

      prisma.$transaction.mockImplementation(
        async (
          fn: (tx: {
            passwordResetToken: { updateMany: jest.Mock };
            user: { update: jest.Mock };
            refreshToken: { updateMany: jest.Mock };
          }) => Promise<void>,
        ) => {
          const tx = {
            passwordResetToken: {
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            user: { update: jest.fn() },
            refreshToken: { updateMany: jest.fn() },
          };
          await fn(tx);
        },
      );

      await expect(
        service.confirmPasswordReset({
          token: 'opaque-reset-token-value-32chars!!',
          newPassword: 'NuevaClaveSegura1!',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(passwordPolicy.recordPasswordChange).not.toHaveBeenCalled();
    });

    it('resolveLoginLockout respeta desiredLockoutEnabled=false de SecurityPolicy', async () => {
      prisma.securityPolicy.findUnique.mockResolvedValue({
        desiredLockoutEnabled: false,
        desiredLockoutMaxAttempts: 3,
        desiredLockoutMinutes: 30,
      });

      const lockout = await (
        service as unknown as {
          resolveLoginLockout: () => Promise<{
            enabled: boolean;
            max: number;
            minutes: number;
          }>;
        }
      ).resolveLoginLockout();

      expect(lockout.enabled).toBe(false);
    });

    it('resolveLoginLockout usa max/minutes de SecurityPolicy cuando está habilitado', async () => {
      prisma.securityPolicy.findUnique.mockResolvedValue({
        desiredLockoutEnabled: true,
        desiredLockoutMaxAttempts: 7,
        desiredLockoutMinutes: 20,
      });

      const lockout = await (
        service as unknown as {
          resolveLoginLockout: () => Promise<{
            enabled: boolean;
            max: number;
            minutes: number;
          }>;
        }
      ).resolveLoginLockout();

      expect(lockout).toEqual({ enabled: true, max: 7, minutes: 20 });
    });
  });
});
