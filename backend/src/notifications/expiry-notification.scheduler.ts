import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { sanitizeSmtpErrorMessage } from '../mail/mail-safety.util';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class ExpiryNotificationScheduler implements OnModuleInit {
  private readonly log = new Logger(ExpiryNotificationScheduler.name);

  constructor(
    private readonly config: ConfigService,
    private readonly registry: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  onModuleInit(): void {
    const enabled =
      this.config.get<string>('NOTIFY_EXPIRY_ENABLED')?.toLowerCase() !==
      'false';
    if (!enabled) {
      this.log.log(
        'Notificaciones de vencimiento desactivadas (NOTIFY_EXPIRY_ENABLED=false).',
      );
      return;
    }

    const cronExpr =
      this.config.get<string>('NOTIFY_EXPIRY_CRON')?.trim() || '0 7 * * *';
    const jobName = 'sgd_document_expiry_notifications';
    const job = new CronJob(cronExpr, () => {
      void this.runExpiryNotifications().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.log.error(
          `Cron vencimientos falló: ${sanitizeSmtpErrorMessage(msg)}`,
        );
      });
    });
    this.registry.addCronJob(jobName, job);
    job.start();
    this.log.log(`Cron notificaciones de vencimiento activo — "${cronExpr}".`);
  }

  private parseDaysAhead(): number[] {
    const raw =
      this.config.get<string>('NOTIFY_EXPIRY_DAYS_AHEAD')?.trim() || '30,7,1';
    const parsed = raw
      .split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n >= 0);
    return parsed.length ? [...new Set(parsed)] : [30, 7, 1];
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  async runExpiryNotifications(): Promise<void> {
    const daysAhead = this.parseDaysAhead();
    const today = this.startOfDay(new Date());
    let processed = 0;

    for (const days of daysAhead) {
      const target = new Date(today);
      target.setDate(target.getDate() + days);
      const from = this.startOfDay(target);
      const to = this.endOfDay(target);

      const docs = await this.prisma.documento.findMany({
        where: {
          activo: true,
          fechaVencimiento: { gte: from, lte: to },
          estado: { notIn: ['ARCHIVADO', 'BORRADOR'] },
        },
        select: {
          id: true,
          codigo: true,
          asunto: true,
          fechaVencimiento: true,
          createdById: true,
          createdBy: { select: { email: true, activo: true } },
        },
        take: 500,
      });

      for (const doc of docs) {
        if (!doc.fechaVencimiento) continue;
        if (!doc.createdBy.activo) continue;
        await this.notifications.notifyDocumentExpiring({
          documentoId: doc.id,
          codigo: doc.codigo,
          asunto: doc.asunto,
          fechaVencimiento: doc.fechaVencimiento,
          diasRestantes: days,
          creatorUserId: doc.createdById,
        });
        processed += 1;
      }
    }

    await this.runSlaOverdueNotifications();
    this.log.log(`Cron vencimientos: ${processed} notificación(es) evaluadas.`);
  }

  private async runSlaOverdueNotifications(): Promise<void> {
    const now = new Date();
    const docs = await this.prisma.documento.findMany({
      where: {
        activo: true,
        estado: 'EN_REVISION',
        fechaLimiteSla: { lt: now },
      },
      select: {
        id: true,
        codigo: true,
        asunto: true,
        fechaLimiteSla: true,
      },
      take: 200,
    });

    if (!docs.length) return;

    const recipients = await this.prisma.user.findMany({
      where: {
        activo: true,
        roles: {
          some: { role: { codigo: { in: ['ADMIN', 'REVISOR'] } } },
        },
      },
      select: { id: true, email: true },
      take: 200,
    });
    const recipientUserIds = recipients.map((r) => r.id);

    for (const doc of docs) {
      if (!doc.fechaLimiteSla) continue;
      await this.notifications.notifySlaOverdue({
        documentoId: doc.id,
        codigo: doc.codigo,
        asunto: doc.asunto,
        fechaLimiteSla: doc.fechaLimiteSla,
        recipientUserIds,
      });
    }
  }
}
