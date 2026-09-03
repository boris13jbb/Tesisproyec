import { MfaTotpService } from './mfa-totp.service';

describe('MfaTotpService — política MFA administrativa', () => {
  const prisma = {
    securityPolicy: { findUnique: jest.fn() },
  };
  const config = { get: jest.fn(), getOrThrow: jest.fn() };
  let service: MfaTotpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MfaTotpService(
      prisma as never,
      config as never,
      { log: jest.fn() } as never,
    );
  });

  it('userIsAdmin incluye SUPERADMIN (política de step-up)', () => {
    expect(
      service.userIsAdmin({
        roles: [{ role: { codigo: 'SUPERADMIN' } }],
      }),
    ).toBe(true);
    expect(
      service.userIsAdmin({
        roles: [{ role: { codigo: 'ADMIN' } }],
      }),
    ).toBe(true);
    expect(
      service.userIsAdmin({
        roles: [{ role: { codigo: 'USUARIO' } }],
      }),
    ).toBe(false);
  });

  it('adminMustUseMfa aplica a SUPERADMIN cuando la política lo exige', async () => {
    prisma.securityPolicy.findUnique.mockResolvedValue({
      desiredAdminStepUpAuth: true,
    });
    await expect(
      service.adminMustUseMfa({
        id: 'sa',
        roles: [{ role: { codigo: 'SUPERADMIN' } }],
      }),
    ).resolves.toBe(true);
  });
});
