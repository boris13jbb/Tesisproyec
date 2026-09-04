import { UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { encryptMfaSecret } from './mfa-crypto.util';
import { MfaTotpService } from './mfa-totp.service';

const SECRET_MATERIAL = 'jwt-access-secret-test-32chars-min';
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

describe('MfaTotpService', () => {
  type AuditPayload = {
    action: string;
    result?: string;
    meta?: Record<string, unknown>;
  };

  const audit = {
    log: jest.fn<void, [AuditPayload]>(),
  };
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
    securityPolicy: {
      findUnique: jest.fn(),
    },
    userRole: {
      findFirst: jest.fn(),
    },
  };

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'APP_PUBLIC_NAME') {
        return 'SGD-GADPR-LM';
      }
      if (key === 'MFA_ENCRYPTION_KEY') {
        return undefined;
      }
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

  it('buildOtpAuthUrl genera URI otpauth estándar con issuer y cuenta', () => {
    const url = service.buildOtpAuthUrl(
      'admin.operativo@local.test',
      TOTP_SECRET,
    );
    expect(url.startsWith('otpauth://totp/')).toBe(true);
    expect(url).toContain('SGD-GADPR-LM');
    expect(url).toContain('admin.operativo%40local.test');
    expect(url).toContain(`secret=${TOTP_SECRET}`);
    expect(url).toContain('issuer=SGD-GADPR-LM');
    expect(url).not.toContain('chart.googleapis.com');
  });

  it('verifyCode rechaza códigos no numéricos o incompletos', () => {
    expect(service.verifyCode(TOTP_SECRET, 'abcdef')).toBe(false);
    expect(service.verifyCode(TOTP_SECRET, '12345')).toBe(false);
  });

  it('verifyCode acepta un token válido generado con el mismo secreto', () => {
    const token = authenticator.generate(TOTP_SECRET);
    expect(service.verifyCode(TOTP_SECRET, token)).toBe(true);
  });

  it('confirmSetup no habilita MFA con código incorrecto', async () => {
    prisma.userTotp.findUnique.mockResolvedValue({
      secretEnc: encryptMfaSecret(TOTP_SECRET, SECRET_MATERIAL),
      enabledAt: null,
    });

    await expect(
      service.confirmSetup('user-1', '000000', { email: 'a@test' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.userTotp.update).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH_MFA_VERIFY_FAIL',
        meta: { phase: 'SETUP' },
      }),
    );
    const auditPayload = audit.log.mock.calls[0]?.[0];
    expect(auditPayload).toBeDefined();
    expect(JSON.stringify(auditPayload)).not.toMatch(/secret|otpauth/i);
  });

  it('confirmSetup habilita MFA solo con código válido', async () => {
    prisma.userTotp.findUnique.mockResolvedValue({
      secretEnc: encryptMfaSecret(TOTP_SECRET, SECRET_MATERIAL),
      enabledAt: null,
    });
    prisma.userTotp.update.mockResolvedValue({});

    const token = authenticator.generate(TOTP_SECRET);
    await service.confirmSetup('user-1', token, { email: 'a@test' });

    expect(prisma.userTotp.update).toHaveBeenCalled();
    const updateCalls = prisma.userTotp.update.mock.calls as Array<
      [{ where: { userId: string }; data: { enabledAt: Date } }]
    >;
    const updateCall = updateCalls[0]?.[0];
    expect(updateCall?.where.userId).toBe('user-1');
    expect(updateCall?.data.enabledAt).toBeInstanceOf(Date);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'AUTH_MFA_ENABLED', result: 'OK' }),
    );
  });
});
