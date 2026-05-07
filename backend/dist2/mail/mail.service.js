"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer_1 = __importDefault(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    config;
    logger = new common_1.Logger(MailService_1.name);
    constructor(config) {
        this.config = config;
    }
    smtpHost() {
        const explicit = this.config.get('SMTP_HOST')?.trim();
        if (explicit)
            return explicit;
        const legacy = this.config.get('SMTP_SERVER')?.trim();
        return legacy || undefined;
    }
    isConfigured() {
        return Boolean(this.smtpHost() && this.fromAddress());
    }
    fromAddress() {
        const em = this.config.get('SMTP_FROM_EMAIL')?.trim();
        return em || undefined;
    }
    createTransporter() {
        const port = Number(this.config.get('SMTP_PORT') ?? '587');
        const secureEnv = this.config.get('SMTP_SECURE') ?? '';
        const secure = String(secureEnv).toLowerCase() === 'true' ||
            String(secureEnv) === '1' ||
            port === 465;
        const user = this.config.get('SMTP_USER')?.trim();
        const pass = this.config.get('SMTP_PASSWORD')?.trim();
        return nodemailer_1.default.createTransport({
            host: this.smtpHost(),
            port,
            secure,
            ...(user !== undefined && user !== '' && pass !== undefined && pass !== ''
                ? { auth: { user, pass } }
                : {}),
        });
    }
    fromHeader() {
        const email = this.fromAddress();
        const rawName = this.config.get('SMTP_FROM_NAME')?.trim() ??
            this.config.get('MAIL_FROM_NAME')?.trim();
        if (!rawName?.length)
            return email;
        const escaped = rawName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${escaped}" <${email}>`;
    }
    async sendPasswordReset(input) {
        if (!this.isConfigured()) {
            throw new Error('Mail not configured');
        }
        const transporter = this.createTransporter();
        const appName = this.config.get('APP_PUBLIC_NAME')?.trim() ?? 'SGD GADPR-LM';
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
        }
        catch (err) {
            this.logger.warn('Envío SMTP de recuperación de contraseña falló');
            throw err;
        }
    }
    async sendUserInvitation(input) {
        if (!this.isConfigured()) {
            throw new Error('Mail not configured');
        }
        const transporter = this.createTransporter();
        const appName = this.config.get('APP_PUBLIC_NAME')?.trim() ?? 'SGD GADPR-LM';
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
        }
        catch {
            this.logger.warn('Envío SMTP de invitación de usuario falló');
            throw new Error('SMTP invitation send failed');
        }
    }
    async sendIfConfigured(input) {
        if (!this.isConfigured()) {
            return { sent: false };
        }
        const transporter = this.createTransporter();
        const to = Array.isArray(input.to) ? input.to : [input.to];
        try {
            await transporter.sendMail({
                from: this.fromHeader(),
                to,
                subject: input.subject,
                text: input.text,
                ...(input.html ? { html: input.html } : {}),
            });
            return { sent: true };
        }
        catch (err) {
            this.logger.warn('Envío SMTP falló (notificación)');
            this.logger.debug(String(err));
            return { sent: false };
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function escapeHref(url) {
    return url.replace(/&/g, '&amp;');
}
//# sourceMappingURL=mail.service.js.map