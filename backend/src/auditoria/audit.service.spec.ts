import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService.log (persistencia segura)', () => {
  it('persiste meta ya redactada (sin password/token)', async () => {
    const create = jest.fn().mockResolvedValue({ id: '1' });
    const prisma = {
      auditLog: { create },
    } as unknown as PrismaService;

    const svc = new AuditService(prisma);
    await svc.log({
      action: 'AUTH_LOGIN_FAIL',
      result: 'FAIL',
      context: {
        actorUserId: 'u1',
        actorEmail: 'u1@local.test',
        ip: null,
        userAgent: null,
        correlationId: null,
      },
      meta: {
        reason: 'INVALID_PASSWORD',
        password: 'secret',
        resetToken: 'r1',
        totpSecret: 'BASE32',
      },
    });

    expect(create).toHaveBeenCalledTimes(1);
    const createCalls = create.mock.calls as Array<
      [{ data: { action: string; metaJson: string } }]
    >;
    const data = createCalls[0]?.[0]?.data;
    expect(data).toBeDefined();
    if (!data) {
      throw new Error('auditLog.create no recibió data');
    }
    expect(data.action).toBe('AUTH_LOGIN_FAIL');
    const meta = JSON.parse(data.metaJson) as Record<string, unknown>;
    expect(meta.reason).toBe('INVALID_PASSWORD');
    expect(meta.password).toBe('[REDACTED]');
    expect(meta.resetToken).toBe('[REDACTED]');
    expect(meta.totpSecret).toBe('[REDACTED]');
  });

  it('no acepta actor/action/timestamp desde meta del cliente', async () => {
    const create = jest.fn().mockResolvedValue({ id: '1' });
    const prisma = {
      auditLog: { create },
    } as unknown as PrismaService;

    const svc = new AuditService(prisma);
    await svc.log({
      action: 'USER_UPDATED',
      result: 'OK',
      context: {
        actorUserId: 'admin-1',
        actorEmail: 'admin@local.test',
        ip: null,
        userAgent: null,
        correlationId: null,
      },
      meta: {
        actorUserId: 'spoofed-user',
        createdAt: '1999-01-01T00:00:00.000Z',
        action: 'AUTH_LOGIN_OK',
        otpauthUrl: 'otpauth://totp/x?secret=ABC',
      },
    });

    const createCalls = create.mock.calls as Array<
      [
        {
          data: {
            action: string;
            actorUserId: string | null;
            createdAt?: unknown;
            metaJson: string;
          };
        },
      ]
    >;
    const data = createCalls[0]?.[0]?.data;
    expect(data?.action).toBe('USER_UPDATED');
    expect(data?.actorUserId).toBe('admin-1');
    expect(data).not.toHaveProperty('createdAt');
    const meta = JSON.parse(data.metaJson) as Record<string, unknown>;
    expect(meta.otpauthUrl).toBe('[REDACTED]');
    expect(meta.action).toBe('AUTH_LOGIN_OK');
  });
});
