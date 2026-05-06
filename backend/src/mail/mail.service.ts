import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

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
    return em || undefined;
  }

  private createTransporter(): nodemailer.Transporter {
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const secureEnv = this.config.get<string>('SMTP_SECURE') ?? '';
    const secure =
      String(secureEnv).toLowerCase() === 'true' ||
      String(secureEnv) === '1' ||
      port === 465;

    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASSWORD')?.trim();

    return nodemailer.createTransport({
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
    const escaped = rawName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}" <${email}>`;
  }

  async sendPasswordReset(input: {
    to: string;
    resetUrl: string;
    expiresMinutes: number;
  }): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Mail not configured');
    }

    const transporter = this.createTransporter();

    const appName =
      this.config.get<string>('APP_PUBLIC_NAME')?.trim() ?? 'SGD GADPR-LM';
    const subject = `${appName} — Restablecimiento de contraseña`;

    const text = [
      `Recibió esta solicitud para restablecer la contraseña de su cuenta en ${appName}.`,
      '',
      `Enlace válido durante aproximadamente ${input.expiresMinutes} minutos:`,
      input.resetUrl,
      '',
      'Si usted no solicitó este cambio, ignore este mensaje.',
      '',
      'Este es un mensaje automático; no responda a este correo.',
    ].join('\n');

    const html = `
<p>Recibió una solicitud para restablecer la contraseña de su cuenta en <strong>${escapeHtml(appName)}</strong>.</p>
<p><a href="${escapeHref(input.resetUrl)}">Restablecer contraseña</a></p>
<p>Si no puede usar el enlace, copie y pegue la siguiente dirección en su navegador:</p>
<pre style="white-space:pre-wrap;word-break:break-all">${escapeHtml(input.resetUrl)}</pre>
<p>Este enlace caduca en aproximadamente ${input.expiresMinutes} minutos.</p>
<p>Si no realizó esta solicitud, ignore este mensaje.</p>`;

    try {
      await transporter.sendMail({
        from: this.fromHeader(),
        to: input.to,
        subject,
        text,
        html,
      });
    } catch (err: unknown) {
      this.logger.warn('Envío SMTP de recuperación de contraseña falló');
      throw err;
    }
  }

  /** Invitación tras alta administrativa: enlace a definir contraseña inicial. */
  async sendUserInvitation(input: {
    to: string;
    setupUrl: string;
    expiresMinutes: number;
  }): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Mail not configured');
    }

    const transporter = this.createTransporter();

    const appName =
      this.config.get<string>('APP_PUBLIC_NAME')?.trim() ?? 'SGD GADPR-LM';
    const subject = `${appName} — Activar su cuenta`;

    const text = [
      `Le han creado una cuenta en ${appName}.`,
      '',
      'Para establecer su contraseña y poder iniciar sesión, use el siguiente enlace:',
      input.setupUrl,
      '',
      `Este enlace caduca en aproximadamente ${input.expiresMinutes} minutos.`,
      '',
      'Si no esperaba este mensaje, puede ignorarlo.',
      '',
      'Este es un mensaje automático; no responda.',
    ].join('\n');

    const html = `
<p>Le han creado una cuenta en <strong>${escapeHtml(appName)}</strong>.</p>
<p>Para <strong>definir su contraseña</strong> e iniciar sesión, use este enlace:</p>
<p><a href="${escapeHref(input.setupUrl)}">Activar cuenta y definir contraseña</a></p>
<pre style="white-space:pre-wrap;word-break:break-all">${escapeHtml(input.setupUrl)}</pre>
<p>El enlace caduca en aproximadamente ${input.expiresMinutes} minutos.</p>
<p>Si no esperaba este mensaje, ignore este correo.</p>`;

    try {
      await transporter.sendMail({
        from: this.fromHeader(),
        to: input.to,
        subject,
        text,
        html,
      });
    } catch {
      this.logger.warn('Envío SMTP de invitación de usuario falló');
      throw new Error('SMTP invitation send failed');
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHref(url: string): string {
  return url.replace(/&/g, '&amp;');
}
