import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ExpiryNotificationScheduler } from './expiry-notification.scheduler';
import { NotificationService } from './notification.service';

describe('ExpiryNotificationScheduler', () => {
  const findManyDocs = jest.fn();
  const findManyUsers = jest.fn();
  const notifyDocumentExpiring = jest.fn();
  const notifySlaOverdue = jest.fn();

  function scheduler() {
    const prisma = {
      documento: { findMany: findManyDocs },
      user: { findMany: findManyUsers },
    };
    const notifications = {
      notifyDocumentExpiring,
      notifySlaOverdue,
    };
    const config = {
      get: (k: string) => (k === 'NOTIFY_EXPIRY_DAYS_AHEAD' ? '1' : undefined),
    } as unknown as ConfigService;
    return new ExpiryNotificationScheduler(
      config,
      {} as SchedulerRegistry,
      prisma as never,
      notifications as unknown as NotificationService,
    );
  }

  beforeEach(() => {
    findManyDocs.mockReset();
    findManyUsers.mockReset();
    notifyDocumentExpiring.mockReset();
    notifySlaOverdue.mockReset();
    notifyDocumentExpiring.mockResolvedValue(undefined);
    notifySlaOverdue.mockResolvedValue(undefined);
    findManyUsers.mockResolvedValue([{ id: 'admin-1', email: 'a@local.test' }]);
  });

  it('omite creador inactivo y no usa email del caller como fuente', async () => {
    findManyDocs
      .mockResolvedValueOnce([
        {
          id: 'd1',
          codigo: 'C',
          asunto: 'A',
          fechaVencimiento: new Date('2030-01-02T12:00:00.000Z'),
          createdById: 'inactive-1',
          createdBy: { email: 'x@local.test', activo: false },
        },
      ])
      .mockResolvedValueOnce([]);
    await scheduler().runExpiryNotifications();
    expect(notifyDocumentExpiring).not.toHaveBeenCalled();
  });

  it('delegates SLA al servicio (dedup/idempotencia interna)', async () => {
    findManyDocs.mockImplementation(
      (args: { where?: { fechaLimiteSla?: unknown } }) => {
        if (args?.where?.fechaLimiteSla) {
          return Promise.resolve([
            {
              id: 'd-sla',
              codigo: 'C',
              asunto: 'A',
              fechaLimiteSla: new Date('2020-01-01T00:00:00.000Z'),
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );
    const s = scheduler();
    await s.runExpiryNotifications();
    await s.runExpiryNotifications();
    expect(notifySlaOverdue).toHaveBeenCalledTimes(2);
    const slaCall = notifySlaOverdue.mock.calls[0] as
      | [{ recipientUserIds: string[]; recipientEmails?: string[] }]
      | undefined;
    expect(slaCall?.[0].recipientUserIds).toEqual(['admin-1']);
    expect(slaCall?.[0].recipientEmails).toBeUndefined();
  });
});
