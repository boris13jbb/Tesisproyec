import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import {
  escapeHtmlText,
  filterSafeEmailAddresses,
  isSafeEmailAddress,
  isSafePublicHttpUrl,
  sanitizeEmailSubject,
  stripHeaderInjection,
} from './mail-safety.util';

/** Nodemailer 10 omite `types` en exports; nodenext no resuelve `Transporter`. */
type SmtpTransport = {
  sendMail: (mail: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) => Promise<unknown>;
};

type SmtpFactory = {
  createTransport: (opts: {
    host?: string;
    port: number;
    secure: boolean;
    auth?: { user: string; pass: string };
  }) => SmtpTransport;
};

const smtp = nodemailer as unknown as SmtpFactory;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  smtpHost(): string | undefined {
    const explicit = this.config.get<string>('SMTP_HOST')?.trim();
    if (explicit) return explicit;
    const legacy = this.config.get<string>('SMTP_SERVER')?.trim();
    return legacy || undefined;
  }

  /** SMTP listo si hay servidor y dirección From (evitar envíos rotos sin remitente). */
  isConfigured(): boolean {
    return Boolean(this.smtpHost() && this.fromAddress());
  }

  private fromAddress(): string | undefined {
    const em = this.config.get<string>('SMTP_FROM_EMAIL')?.trim();
    if (!em || !isSafeEmailAddress(em)) return undefined;
    return em;
  }

  private createTransporter(): SmtpTransport {
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const secureEnv = this.config.get<string>('SMTP_SECURE') ?? '';
    const secure =
      String(secureEnv).toLowerCase() === 'true' ||
      String(secureEnv) === '1' ||
      port === 465;

    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASSWORD')?.trim();

    return smtp.createTransport({
      host: this.smtpHost(),
      port,
      secure,
      ...(user !== undefined && user !== '' && pass !== undefined && pass !== ''
        ? { auth: { user, pass } }
        : {}),
    });
  }

  private fromHeader(): string {
    const email = this.fromAddress()!;
    const rawName =
      this.config.get<string>('SMTP_FROM_NAME')?.trim() ??
      this.config.get<string>('MAIL_FROM_NAME')?.trim();
    if (!rawName?.length) return email;
    const name = stripHeaderInjection(rawName).replace(/"/g, '');
    if (!name) return email;
    return `"${name}" <${email}>`;
  }

  async sendPasswordReset(input: {
    to: string;
    resetUrl: string;
    expiresMinutes: number;
  }): Promise<void> {
    await this.sendTransactionalLinkMail({
      to: input.to,
      linkUrl: input.resetUrl,
      expiresMinutes: input.expiresMinutes,
      subjectSuffix: 'Restablecimiento de contraseña',
      failLog: 'Envío SMTP de recuperación de contraseña falló',
      textIntro:
        'Recibió esta solicitud para restablecer la contraseña de su cuenta',
      htmlIntro:
        'Recibió una solicitud para restablecer la contraseña de su cuenta',
      linkLabel: 'Restablecer contraseña',
      ignoreHint: 'Si usted no solicitó este cambio, ignore este mensaje.',
    });
  }

  /** Invitación tras alta administrativa: enlace a definir contraseña inicial. */
  async sendUserInvitation(input: {
    to: string;
    setupUrl: string;
    expiresMinutes: number;
  }): Promise<void> {
    await this.sendTransactionalLinkMail({
      to: input.to,
      linkUrl: input.setupUrl,
      expiresMinutes: input.expiresMinutes,
      subjectSuffix: 'Activar su cuenta',
      failLog: 'Envío SMTP de invitación de usuario falló',
      textIntro: 'Le han creado una cuenta',
      htmlIntro: 'Le han creado una cuenta',
      linkLabel: 'Activar cuenta y definir contraseña',
      ignoreHint: 'Si no esperaba este mensaje, puede ignorarlo.',
    });
  }

  /**
   * Envío genérico best-effort: si SMTP no está configurado, no hace nada.
   * Útil para notificaciones (R-44) sin romper flujos de negocio.
   * Un destinatario por sendMail (no lista To: compartida).
   */
  async sendIfConfigured(input: {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ sent: boolean }> {
    if (!this.isConfigured()) {
      return { sent: false };
    }
    const recipients = filterSafeEmailAddresses(input.to);
    if (!recipients.length) {
      return { sent: false };
    }
    const transporter = this.createTransporter();
    const subject = sanitizeEmailSubject(input.subject);
    const from = this.fromHeader();
    let sentAny = false;
    for (const to of recipients) {
      try {
        await transporter.sendMail({
          from,
          to,
          subject,
          text: input.text,
          ...(input.html ? { html: input.html } : {}),
        });
        sentAny = true;
      } catch {
        this.logger.warn('Envío SMTP falló (notificación)');
      }
    }
    return { sent: sentAny };
  }

  private async sendTransactionalLinkMail(input: {
    to: string;
    linkUrl: string;
    expiresMinutes: number;
    subjectSuffix: string;
    failLog: string;
    textIntro: string;
    htmlIntro: string;
    linkLabel: string;
    ignoreHint: string;
  }): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Mail not configured');
    }
    const to = filterSafeEmailAddresses(input.to)[0];
    if (!to || !isSafePublicHttpUrl(input.linkUrl)) {
      throw new Error('Mail not configured');
    }

    const transporter = this.createTransporter();
    const appName = stripHeaderInjection(
      this.config.get<string>('APP_PUBLIC_NAME')?.trim() ?? 'SGD GADPR-LM',
    );
    const subject = sanitizeEmailSubject(`${appName} — ${input.subjectSuffix}`);
    const href = escapeHref(input.linkUrl);

    const text = [
      `${input.textIntro} en ${appName}.`,
      '',
      `Enlace válido durante aproximadamente ${input.expiresMinutes} minutos:`,
      input.linkUrl,
      '',
      input.ignoreHint,
      '',
      'Este es un mensaje automático; no responda a este correo.',
    ].join('\n');

    const html = `
<p>${escapeHtmlText(input.htmlIntro)} en <strong>${escapeHtmlText(appName)}</strong>.</p>
<p><a href="${href}">${escapeHtmlText(input.linkLabel)}</a></p>
<p>Si no puede usar el enlace, copie y pegue la siguiente dirección en su navegador:</p>
<pre style="white-space:pre-wrap;word-break:break-all">${escapeHtmlText(input.linkUrl)}</pre>
<p>Este enlace caduca en aproximadamente ${input.expiresMinutes} minutos.</p>
<p>${escapeHtmlText(input.ignoreHint)}</p>`;

    try {
      await transporter.sendMail({
        from: this.fromHeader(),
        to,
        subject,
        text,
        html,
      });
    } catch {
      this.logger.warn(input.failLog);
      throw new Error('SMTP send failed');
    }
  }
}

function escapeHref(url: string): string {
  if (!isSafePublicHttpUrl(url)) return '#';
  return url.replace(/&/g, '&amp;');
}
