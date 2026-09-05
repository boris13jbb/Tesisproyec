import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';

const DOC_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('NotificationService', () => {
  const sendIfConfigured = jest.fn();
  const auditLog = jest.fn();
  const findManyUsers = jest.fn();
  const findFirstNotif = jest.fn();
  const createMany = jest.fn();
  const findManyNotif = jest.fn();
  const countNotif = jest.fn();
  const updateMany = jest.fn();

  function service() {
    const prisma = {
      user: { findMany: findManyUsers },
      userNotification: {
        findFirst: findFirstNotif,
        createMany,
        findMany: findManyNotif,
        count: countNotif,
        updateMany,
      },
    };
    const mail = { sendIfConfigured };
    const config = {
      get: (k: string) =>
        k === 'APP_PUBLIC_URL'
          ? 'https://sgd.local.test'
          : k === 'APP_PUBLIC_NAME'
            ? 'SGD'
            : undefined,
    } as unknown as ConfigService;
    const audit = { log: auditLog };
    return new NotificationService(
      prisma as never,
      mail as never,
      config,
      audit as never,
    );
  }

  beforeEach(() => {
    sendIfConfigured.mockReset();
    sendIfConfigured.mockResolvedValue({ sent: true });
    auditLog.mockReset();
    auditLog.mockResolvedValue(undefined);
    findManyUsers.mockReset();
    findFirstNotif.mockReset();
    findFirstNotif.mockResolvedValue(null);
    createMany.mockReset();
    createMany.mockResolvedValue({ count: 1 });
    findManyNotif.mockReset();
    countNotif.mockReset();
    updateMany.mockReset();
  });

  it('notifyRevisionResolved ignora creatorEmail spoof y usa email de BD', async () => {
    findManyUsers.mockResolvedValue([
      { id: 'creator-1', email: 'owner@local.test' },
    ]);
    await service().notifyRevisionResolved({
      documentoId: DOC_ID,
      codigo: 'DOC-1',
      asunto: 'Asunto <script>alert(1)</script>',
      decision: 'RECHAZADO',
      motivo: '<img src=x onerror=alert(1)>',
      creatorUserId: 'creator-1',
      creatorEmail: 'attacker@evil.test',
    });
    expect(sendIfConfigured).toHaveBeenCalledTimes(1);
    const mailCall = sendIfConfigured.mock.calls[0] as
      | [{ to: string[]; html: string }]
      | undefined;
    const args = mailCall?.[0];
    expect(args?.to).toEqual(['owner@local.test']);
    expect(args?.to).not.toContain('attacker@evil.test');
    expect(args?.html).not.toContain('<script>');
    expect(args?.html).toContain('&lt;script&gt;');
    expect(args?.html).toContain('&lt;img');
    const auditCall = auditLog.mock.calls[0] as [unknown] | undefined;
    const meta = JSON.stringify(auditCall?.[0]);
    expect(meta).not.toContain('attacker@evil.test');
    expect(meta).not.toContain('owner@local.test');
    expect(meta).not.toContain('<script>');
  });

  it('usuario inactivo no recibe resolución', async () => {
    findManyUsers.mockResolvedValue([]);
    await service().notifyRevisionResolved({
      documentoId: DOC_ID,
      codigo: 'DOC-1',
      asunto: 'x',
      decision: 'APROBADO',
      creatorUserId: 'inactive-1',
      creatorEmail: 'gone@local.test',
    });
    expect(sendIfConfigured).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it('usuario activo sin email no explota: in-app sí, SMTP no', async () => {
    findManyUsers.mockResolvedValue([{ id: 'u1', email: '' }]);
    await service().notifyDocumentExpiring({
      documentoId: DOC_ID,
      codigo: 'DOC-1',
      asunto: 'x',
      fechaVencimiento: new Date('2026-12-01T00:00:00.000Z'),
      diasRestantes: 7,
      creatorUserId: 'u1',
      creatorEmail: 'ignored@evil.test',
    });
    expect(sendIfConfigured).not.toHaveBeenCalled();
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it('SLA_OVERDUE primera ejecución notifica a todos los ADMIN/REVISOR; segunda no duplica', async () => {
    findManyUsers.mockResolvedValue([
      { id: 'admin-a', email: 'a@local.test' },
      { id: 'admin-b', email: 'b@local.test' },
      { id: 'revisor-c', email: 'c@local.test' },
    ]);
    const svc = service();
    const payload = {
      documentoId: DOC_ID,
      codigo: 'DOC-1',
      asunto: 'x',
      fechaLimiteSla: new Date('2020-01-01T00:00:00.000Z'),
      recipientUserIds: ['admin-a', 'admin-b', 'revisor-c'],
      recipientEmails: ['spoof@evil.test'],
    };
    await svc.notifySlaOverdue(payload);
    const slaMail = sendIfConfigured.mock.calls[0] as
      | [{ to: string[] }]
      | undefined;
    expect(slaMail?.[0].to).toEqual([
      'a@local.test',
      'b@local.test',
      'c@local.test',
    ]);
    const created = createMany.mock.calls[0] as
      | [{ data: Array<{ userId: string }> }]
      | undefined;
    expect(created?.[0].data.map((r) => r.userId)).toEqual([
      'admin-a',
      'admin-b',
      'revisor-c',
    ]);

    findFirstNotif.mockResolvedValue({ id: 'n-existing' });
    await svc.notifySlaOverdue(payload);
    expect(sendIfConfigured).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it('SMTP ausente: in-app se crea y audit es SKIP (no 500)', async () => {
    sendIfConfigured.mockResolvedValue({ sent: false });
    findManyUsers.mockResolvedValue([{ id: 'admin-a', email: 'a@local.test' }]);
    await service().notifyRevisionSubmitted({
      documentoId: DOC_ID,
      codigo: 'DOC-1',
      asunto: '<a href="javascript:alert(1)">x</a>',
    });
    expect(createMany).toHaveBeenCalledTimes(1);
    const auditCall = auditLog.mock.calls[0] as
      | [{ meta?: { dispatchResult?: string; smtpSent?: boolean } }]
      | undefined;
    expect(auditCall?.[0].meta?.dispatchResult).toBe('SKIP');
    expect(auditCall?.[0].meta?.smtpSent).toBe(false);
    const mailCall = sendIfConfigured.mock.calls[0] as
      | [{ html: string }]
      | undefined;
    expect(mailCall?.[0].html).toContain('&lt;a href=');
    expect(mailCall?.[0].html).not.toContain('<a href="javascript:');
  });

  it('DOCUMENT_EXPIRING dedup es por usuario+recurso (otro usuario no queda bloqueado)', async () => {
    findManyUsers
      .mockResolvedValueOnce([{ id: 'u1', email: 'u1@local.test' }])
      .mockResolvedValueOnce([{ id: 'u2', email: 'u2@local.test' }]);
    const svc = service();
    const base = {
      documentoId: DOC_ID,
      codigo: 'DOC-1',
      asunto: 'x',
      fechaVencimiento: new Date('2026-12-01T00:00:00.000Z'),
      diasRestantes: 7,
    };
    await svc.notifyDocumentExpiring({ ...base, creatorUserId: 'u1' });
    await svc.notifyDocumentExpiring({ ...base, creatorUserId: 'u2' });
    expect(createMany).toHaveBeenCalledTimes(2);
    const firstDedup = findFirstNotif.mock.calls[0] as
      | [{ where: { userId?: string } }]
      | undefined;
    const secondDedup = findFirstNotif.mock.calls[1] as
      | [{ where: { userId?: string } }]
      | undefined;
    expect(firstDedup?.[0].where.userId).toBe('u1');
    expect(secondDedup?.[0].where.userId).toBe('u2');
  });

  it('SLA_OVERDUE ignora recipientEmails y deduplica en segunda ejecución', async () => {
    findManyUsers.mockResolvedValue([
      { id: 'admin-1', email: 'admin@local.test' },
    ]);
    const svc = service();
    const payload = {
      documentoId: DOC_ID,
      codigo: 'DOC-1',
      asunto: 'x',
      fechaLimiteSla: new Date('2020-01-01T00:00:00.000Z'),
      recipientUserIds: ['admin-1'],
      recipientEmails: ['spoof@evil.test'],
    };
    await svc.notifySlaOverdue(payload);
    const slaMail = sendIfConfigured.mock.calls[0] as
      | [{ to: string[] }]
      | undefined;
    expect(slaMail?.[0].to).toEqual(['admin@local.test']);
    expect(slaMail?.[0].to).not.toContain('spoof@evil.test');

    findFirstNotif.mockResolvedValue({ id: 'n1' });
    await svc.notifySlaOverdue(payload);
    expect(sendIfConfigured).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it('list/markRead/unread usan solo userId del llamador', async () => {
    findManyNotif.mockResolvedValue([]);
    countNotif.mockResolvedValue(2);
    updateMany.mockResolvedValue({ count: 0 });
    const svc = service();
    await svc.listForUser('user-a', 20);
    expect(findManyNotif).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-a' } }),
    );
    expect(countNotif).toHaveBeenCalledWith({
      where: { userId: 'user-a', leido: false },
    });
    await svc.markRead('user-a', 'notif-b');
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'notif-b', userId: 'user-a' },
      data: { leido: true },
    });
    await svc.markAllRead('user-a');
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-a', leido: false },
      data: { leido: true },
    });
  });

  it('no construye enlace si APP_PUBLIC_URL no es http(s)', async () => {
    findManyUsers.mockResolvedValue([{ id: 'u1', email: 'u@local.test' }]);
    const prisma = {
      user: { findMany: findManyUsers },
      userNotification: {
        findFirst: findFirstNotif,
        createMany,
        findMany: findManyNotif,
        count: countNotif,
        updateMany,
      },
    };
    const badConfig = {
      get: (k: string) =>
        k === 'APP_PUBLIC_URL' ? 'javascript:alert(1)' : 'SGD',
    } as unknown as ConfigService;
    const svc = new NotificationService(
      prisma as never,
      { sendIfConfigured } as never,
      badConfig,
      { log: auditLog } as never,
    );
    await svc.notifyRevisionResolved({
      documentoId: DOC_ID,
      codigo: 'DOC-1',
      asunto: 'x',
      decision: 'APROBADO',
      creatorUserId: 'u1',
    });
    const linkMail = sendIfConfigured.mock.calls[0] as
      | [{ text: string }]
      | undefined;
    const text = linkMail?.[0].text ?? '';
    expect(text).not.toContain('javascript:');
    expect(text).not.toContain('Enlace:');
  });
});
