import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../auditoria/audit.service';
import {
  escapeHtmlText,
  filterSafeEmailAddresses,
  isDocumentoUuid,
  isSafePublicHttpUrl,
  NOTIFICATION_DEDUP_MS,
  sanitizeEmailSubject,
} from '../mail/mail-safety.util';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

export type DocumentoNotificationTipo =
  | 'REVISION_PENDING'
  | 'REVISION_RESOLVED'
  | 'DOCUMENT_EXPIRING'
  | 'SLA_OVERDUE';

type NotifyRevisionSubmittedInput = {
  documentoId: string;
  codigo: string;
  asunto: string;
};

type NotifyRevisionResolvedInput = {
  documentoId: string;
  codigo: string;
  asunto: string;
  decision: 'APROBADO' | 'RECHAZADO';
  motivo?: string;
  creatorUserId: string;
  /** Ignorado: el correo se resuelve en BD. Se mantiene por compatibilidad de llamada. */
  creatorEmail?: string;
};

type NotifyDocumentExpiringInput = {
  documentoId: string;
  codigo: string;
  asunto: string;
  fechaVencimiento: Date;
  diasRestantes: number;
  creatorUserId: string;
  /** Ignorado: el correo se resuelve en BD. */
  creatorEmail?: string;
};

type NotifySlaOverdueInput = {
  documentoId: string;
  codigo: string;
  asunto: string;
  fechaLimiteSla: Date;
  recipientUserIds: string[];
  /** Ignorado: destinatarios se resuelven por userId activo en BD. */
  recipientEmails?: string[];
};

type ActiveRecipient = { id: string; email: string | null };

@Injectable()
export class NotificationService {
  private readonly log = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private appName(): string {
    return this.config.get<string>('APP_PUBLIC_NAME')?.trim() ?? 'SGD GADPR-LM';
  }

  private publicBaseUrl(): string | undefined {
    const raw = this.config.get<string>('APP_PUBLIC_URL')?.trim();
    return raw?.replace(/\/$/, '') || undefined;
  }

  private documentoUrl(documentoId: string): string | undefined {
    const base = this.publicBaseUrl();
    if (!base || !isSafePublicHttpUrl(base) || !isDocumentoUuid(documentoId)) {
      return undefined;
    }
    return `${base}/documentos/${documentoId}`;
  }

  private buildHtml(bodyLines: string[], link?: string): string {
    const paragraphs = bodyLines
      .filter((l) => l !== '')
      .map((l) => `<p>${escapeHtmlText(l)}</p>`)
      .join('');
    const safeLink = link && isSafePublicHttpUrl(link) ? link : undefined;
    const linkBlock = safeLink
      ? `<p><a href="${safeLink.replace(/&/g, '&amp;')}">Abrir en el sistema</a></p>`
      : '';
    return `${paragraphs}${linkBlock}<p style="color:#666;font-size:12px">Mensaje automático de ${escapeHtmlText(this.appName())}.</p>`;
  }

  private async resolveActiveUsers(
    userIds: string[],
  ): Promise<ActiveRecipient[]> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) return [];
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique }, activo: true },
      select: { id: true, email: true },
    });
    return rows.map((r) => ({
      id: r.id,
      email: r.email?.trim().toLowerCase() || null,
    }));
  }

  private emailsOf(users: ActiveRecipient[]): string[] {
    return filterSafeEmailAddresses(
      users.map((u) => u.email).filter((e): e is string => Boolean(e)),
    );
  }

  private async createInAppMany(
    userIds: string[],
    input: {
      tipo: DocumentoNotificationTipo;
      titulo: string;
      mensaje?: string;
      resourceType?: string;
      resourceId?: string;
    },
  ): Promise<void> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) return;
    await this.prisma.userNotification.createMany({
      data: unique.map((userId) => ({
        userId,
        tipo: input.tipo,
        titulo: input.titulo.slice(0, 200),
        mensaje: input.mensaje?.slice(0, 1000) ?? null,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
      })),
    });
  }

  private async logNotification(
    result: 'OK' | 'SKIP' | 'FAIL',
    meta: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.log({
      action: 'NOTIFICATION_DISPATCHED',
      result: result === 'FAIL' ? 'FAIL' : 'OK',
      meta: { ...meta, dispatchResult: result },
    });
  }

  private async recentDedup(where: {
    tipo: DocumentoNotificationTipo;
    resourceId: string;
    userId?: string;
  }): Promise<boolean> {
    const found = await this.prisma.userNotification.findFirst({
      where: {
        tipo: where.tipo,
        resourceId: where.resourceId,
        ...(where.userId ? { userId: where.userId } : {}),
        createdAt: { gte: new Date(Date.now() - NOTIFICATION_DEDUP_MS) },
      },
      select: { id: true },
    });
    return Boolean(found);
  }

  async notifyRevisionSubmitted(
    input: NotifyRevisionSubmittedInput,
  ): Promise<void> {
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
    const users: ActiveRecipient[] = recipients.map((r) => ({
      id: r.id,
      email: r.email?.trim().toLowerCase() || null,
    }));
    const emails = this.emailsOf(users);
    const userIds = users.map((r) => r.id);

    const link = this.documentoUrl(input.documentoId);
    const subject = sanitizeEmailSubject(
      `${this.appName()} — Pendiente de revisión: ${input.codigo}`,
    );
    const textLines = [
      'Se ha enviado un documento a revisión.',
      '',
      `Código: ${input.codigo}`,
      `Asunto: ${input.asunto}`,
      ...(link ? ['', `Enlace: ${link}`] : []),
      '',
      'Acción: revise la bandeja de trámites o filtre Documentos por estado «En revisión».',
    ];

    const { sent } = emails.length
      ? await this.mail.sendIfConfigured({
          to: emails,
          subject,
          text: textLines.join('\n'),
          html: this.buildHtml(textLines, link),
        })
      : { sent: false };

    await this.createInAppMany(userIds, {
      tipo: 'REVISION_PENDING',
      titulo: `Pendiente de revisión: ${input.codigo}`,
      mensaje: input.asunto,
      resourceType: 'Documento',
      resourceId: input.documentoId,
    });

    await this.logNotification(sent ? 'OK' : 'SKIP', {
      channel: 'email+in_app',
      tipo: 'REVISION_PENDING',
      documentoId: input.documentoId,
      recipientCount: userIds.length,
      smtpSent: sent,
    });
  }

  async notifyRevisionResolved(
    input: NotifyRevisionResolvedInput,
  ): Promise<void> {
    const users = await this.resolveActiveUsers([input.creatorUserId]);
    if (!users.length) {
      this.log.warn('Notificación omitida: destinatario no elegible');
      return;
    }
    const emails = this.emailsOf(users);

    const link = this.documentoUrl(input.documentoId);
    const subject = sanitizeEmailSubject(
      `${this.appName()} — Revisión resuelta: ${input.codigo} (${input.decision})`,
    );
    const textLines = [
      'Se resolvió la revisión de su documento.',
      '',
      `Código: ${input.codigo}`,
      `Asunto: ${input.asunto}`,
      `Decisión: ${input.decision}`,
      ...(input.decision === 'RECHAZADO' && input.motivo
        ? ['', `Motivo: ${input.motivo}`]
        : []),
      ...(link ? ['', `Enlace: ${link}`] : []),
    ];

    const { sent } = emails.length
      ? await this.mail.sendIfConfigured({
          to: emails,
          subject,
          text: textLines.join('\n'),
          html: this.buildHtml(textLines, link),
        })
      : { sent: false };

    await this.createInAppMany(
      users.map((u) => u.id),
      {
        tipo: 'REVISION_RESOLVED',
        titulo: `Revisión ${input.decision.toLowerCase()}: ${input.codigo}`,
        mensaje:
          input.decision === 'RECHAZADO' && input.motivo
            ? input.motivo
            : input.asunto,
        resourceType: 'Documento',
        resourceId: input.documentoId,
      },
    );

    await this.logNotification(sent ? 'OK' : 'SKIP', {
      channel: 'email+in_app',
      tipo: 'REVISION_RESOLVED',
      documentoId: input.documentoId,
      decision: input.decision,
      smtpSent: sent,
    });
  }

  async notifyDocumentExpiring(
    input: NotifyDocumentExpiringInput,
  ): Promise<void> {
    const users = await this.resolveActiveUsers([input.creatorUserId]);
    if (!users.length) {
      this.log.warn('Notificación omitida: destinatario no elegible');
      return;
    }
    if (
      await this.recentDedup({
        tipo: 'DOCUMENT_EXPIRING',
        resourceId: input.documentoId,
        userId: users[0].id,
      })
    ) {
      return;
    }

    const emails = this.emailsOf(users);
    const link = this.documentoUrl(input.documentoId);
    const fv = input.fechaVencimiento.toISOString().slice(0, 10);
    const subject = sanitizeEmailSubject(
      `${this.appName()} — Vencimiento próximo: ${input.codigo}`,
    );
    const textLines = [
      `El documento vence en ${input.diasRestantes} día(s).`,
      '',
      `Código: ${input.codigo}`,
      `Asunto: ${input.asunto}`,
      `Fecha de vencimiento: ${fv}`,
      ...(link ? ['', `Enlace: ${link}`] : []),
    ];

    const { sent } = emails.length
      ? await this.mail.sendIfConfigured({
          to: emails,
          subject,
          text: textLines.join('\n'),
          html: this.buildHtml(textLines, link),
        })
      : { sent: false };

    await this.createInAppMany(
      users.map((u) => u.id),
      {
        tipo: 'DOCUMENT_EXPIRING',
        titulo: `Vence en ${input.diasRestantes}d: ${input.codigo}`,
        mensaje: `Vencimiento ${fv}`,
        resourceType: 'Documento',
        resourceId: input.documentoId,
      },
    );

    await this.logNotification(sent ? 'OK' : 'SKIP', {
      channel: 'email+in_app',
      tipo: 'DOCUMENT_EXPIRING',
      documentoId: input.documentoId,
      diasRestantes: input.diasRestantes,
      smtpSent: sent,
    });
  }

  async notifySlaOverdue(input: NotifySlaOverdueInput): Promise<void> {
    if (
      await this.recentDedup({
        tipo: 'SLA_OVERDUE',
        resourceId: input.documentoId,
      })
    ) {
      return;
    }

    const users = await this.resolveActiveUsers(input.recipientUserIds);
    if (!users.length) return;

    const emails = this.emailsOf(users);
    const link = this.documentoUrl(input.documentoId);
    const limite = input.fechaLimiteSla.toISOString().slice(0, 10);
    const subject = sanitizeEmailSubject(
      `${this.appName()} — SLA vencido: ${input.codigo}`,
    );
    const textLines = [
      'Un documento en revisión superó el plazo operativo de SLA.',
      '',
      `Código: ${input.codigo}`,
      `Asunto: ${input.asunto}`,
      `Fecha límite SLA: ${limite}`,
      ...(link ? ['', `Enlace: ${link}`] : []),
    ];

    const { sent } = emails.length
      ? await this.mail.sendIfConfigured({
          to: emails,
          subject,
          text: textLines.join('\n'),
          html: this.buildHtml(textLines, link),
        })
      : { sent: false };

    await this.createInAppMany(
      users.map((u) => u.id),
      {
        tipo: 'SLA_OVERDUE',
        titulo: `SLA vencido: ${input.codigo}`,
        mensaje: input.asunto,
        resourceType: 'Documento',
        resourceId: input.documentoId,
      },
    );

    await this.logNotification(sent ? 'OK' : 'SKIP', {
      channel: 'email+in_app',
      tipo: 'SLA_OVERDUE',
      documentoId: input.documentoId,
      recipientCount: users.length,
      smtpSent: sent,
    });
  }

  async listForUser(userId: string, limit = 30) {
    const items = await this.prisma.userNotification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      take: Math.min(100, Math.max(1, limit)),
    });
    const unread = await this.prisma.userNotification.count({
      where: { userId, leido: false },
    });
    return { unread, items };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.userNotification.updateMany({
      where: { id: notificationId, userId },
      data: { leido: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.userNotification.updateMany({
      where: { userId, leido: false },
      data: { leido: true },
    });
  }
}
