import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../auditoria/audit.service';
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
  creatorEmail: string;
};

type NotifyDocumentExpiringInput = {
  documentoId: string;
  codigo: string;
  asunto: string;
  fechaVencimiento: Date;
  diasRestantes: number;
  creatorUserId: string;
  creatorEmail: string;
};

type NotifySlaOverdueInput = {
  documentoId: string;
  codigo: string;
  asunto: string;
  fechaLimiteSla: Date;
  recipientUserIds: string[];
  recipientEmails: string[];
};

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
    if (!base) return undefined;
    return `${base}/documentos/${documentoId}`;
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private buildHtml(bodyLines: string[], link?: string): string {
    const paragraphs = bodyLines
      .filter((l) => l !== '')
      .map((l) => `<p>${this.escapeHtml(l)}</p>`)
      .join('');
    const linkBlock = link
      ? `<p><a href="${link.replace(/&/g, '&amp;')}">Abrir en el sistema</a></p>`
      : '';
    return `${paragraphs}${linkBlock}<p style="color:#666;font-size:12px">Mensaje automático de ${this.escapeHtml(this.appName())}.</p>`;
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
    const emails = recipients
      .map((r) => r.email.trim().toLowerCase())
      .filter(Boolean);
    const userIds = recipients.map((r) => r.id);

    const link = this.documentoUrl(input.documentoId);
    const subject = `${this.appName()} — Pendiente de revisión: ${input.codigo}`;
    const textLines = [
      'Se ha enviado un documento a revisión.',
      '',
      `Código: ${input.codigo}`,
      `Asunto: ${input.asunto}`,
      ...(link ? ['', `Enlace: ${link}`] : []),
      '',
      'Acción: revise la bandeja de trámites o filtre Documentos por estado «En revisión».',
    ];

    const { sent } = await this.mail.sendIfConfigured({
      to: emails,
      subject,
      text: textLines.join('\n'),
      html: this.buildHtml(textLines, link),
    });

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
      recipientCount: emails.length,
      smtpSent: sent,
    });
  }

  async notifyRevisionResolved(
    input: NotifyRevisionResolvedInput,
  ): Promise<void> {
    const link = this.documentoUrl(input.documentoId);
    const subject = `${this.appName()} — Revisión resuelta: ${input.codigo} (${input.decision})`;
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

    const { sent } = await this.mail.sendIfConfigured({
      to: input.creatorEmail,
      subject,
      text: textLines.join('\n'),
      html: this.buildHtml(textLines, link),
    });

    await this.createInAppMany([input.creatorUserId], {
      tipo: 'REVISION_RESOLVED',
      titulo: `Revisión ${input.decision.toLowerCase()}: ${input.codigo}`,
      mensaje:
        input.decision === 'RECHAZADO' && input.motivo
          ? input.motivo
          : input.asunto,
      resourceType: 'Documento',
      resourceId: input.documentoId,
    });

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
    const dedup = await this.prisma.userNotification.findFirst({
      where: {
        userId: input.creatorUserId,
        tipo: 'DOCUMENT_EXPIRING',
        resourceId: input.documentoId,
        createdAt: { gte: new Date(Date.now() - 23 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (dedup) return;

    const link = this.documentoUrl(input.documentoId);
    const fv = input.fechaVencimiento.toISOString().slice(0, 10);
    const subject = `${this.appName()} — Vencimiento próximo: ${input.codigo}`;
    const textLines = [
      `El documento vence en ${input.diasRestantes} día(s).`,
      '',
      `Código: ${input.codigo}`,
      `Asunto: ${input.asunto}`,
      `Fecha de vencimiento: ${fv}`,
      ...(link ? ['', `Enlace: ${link}`] : []),
    ];

    const { sent } = await this.mail.sendIfConfigured({
      to: input.creatorEmail,
      subject,
      text: textLines.join('\n'),
      html: this.buildHtml(textLines, link),
    });

    await this.createInAppMany([input.creatorUserId], {
      tipo: 'DOCUMENT_EXPIRING',
      titulo: `Vence en ${input.diasRestantes}d: ${input.codigo}`,
      mensaje: `Vencimiento ${fv}`,
      resourceType: 'Documento',
      resourceId: input.documentoId,
    });

    await this.logNotification(sent ? 'OK' : 'SKIP', {
      channel: 'email+in_app',
      tipo: 'DOCUMENT_EXPIRING',
      documentoId: input.documentoId,
      diasRestantes: input.diasRestantes,
      smtpSent: sent,
    });
  }

  async notifySlaOverdue(input: NotifySlaOverdueInput): Promise<void> {
    if (!input.recipientUserIds.length) return;

    const link = this.documentoUrl(input.documentoId);
    const limite = input.fechaLimiteSla.toISOString().slice(0, 10);
    const subject = `${this.appName()} — SLA vencido: ${input.codigo}`;
    const textLines = [
      'Un documento en revisión superó el plazo operativo de SLA.',
      '',
      `Código: ${input.codigo}`,
      `Asunto: ${input.asunto}`,
      `Fecha límite SLA: ${limite}`,
      ...(link ? ['', `Enlace: ${link}`] : []),
    ];

    const { sent } = await this.mail.sendIfConfigured({
      to: input.recipientEmails,
      subject,
      text: textLines.join('\n'),
      html: this.buildHtml(textLines, link),
    });

    await this.createInAppMany(input.recipientUserIds, {
      tipo: 'SLA_OVERDUE',
      titulo: `SLA vencido: ${input.codigo}`,
      mensaje: input.asunto,
      resourceType: 'Documento',
      resourceId: input.documentoId,
    });

    await this.logNotification(sent ? 'OK' : 'SKIP', {
      channel: 'email+in_app',
      tipo: 'SLA_OVERDUE',
      documentoId: input.documentoId,
      recipientCount: input.recipientEmails.length,
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
