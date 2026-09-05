import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('MailService', () => {
  const sendMail = jest.fn();
  const cfg = new Map<string, string>([
    ['SMTP_HOST', 'smtp.local.test'],
    ['SMTP_PORT', '587'],
    ['SMTP_SECURE', 'false'],
    ['SMTP_FROM_EMAIL', 'no-reply@local.test'],
    ['SMTP_FROM_NAME', 'SGD'],
    ['SMTP_USER', 'svc'],
    ['SMTP_PASSWORD', 'not-a-real-secret'],
    ['APP_PUBLIC_NAME', 'SGD TEST'],
  ]);

  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: 'm1' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  function service() {
    const config = {
      get: (k: string) => cfg.get(k),
    } as unknown as ConfigService;
    return new MailService(config);
  }

  it('from y subject salen del servidor; CRLF en subject se sanitiza', async () => {
    await service().sendIfConfigured({
      to: 'user@local.test',
      subject: 'Hola\r\nBcc: attacker@evil.test',
      text: 'hola',
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const firstCall = sendMail.mock.calls[0] as
      | [{ from: string; to: string; subject: string }]
      | undefined;
    const payload = firstCall?.[0];
    expect(payload?.from).toContain('no-reply@local.test');
    expect(payload?.to).toBe('user@local.test');
    expect(payload?.subject).not.toMatch(/[\r\n]/);
    expect(payload?.subject.toLowerCase()).not.toContain('bcc:');
  });

  it('rechaza destinatario con CRLF y no llama sendMail', async () => {
    const { sent } = await service().sendIfConfigured({
      to: 'ok@local.test\r\nBcc: attacker@evil.test',
      subject: 'x',
      text: 'y',
    });
    expect(sent).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('envía de a uno (no lista To: compartida)', async () => {
    await service().sendIfConfigured({
      to: ['a@local.test', 'b@local.test'],
      subject: 'x',
      text: 'y',
    });
    expect(sendMail).toHaveBeenCalledTimes(2);
    const first = sendMail.mock.calls[0] as [{ to: string }] | undefined;
    const second = sendMail.mock.calls[1] as [{ to: string }] | undefined;
    expect(first?.[0].to).toBe('a@local.test');
    expect(second?.[0].to).toBe('b@local.test');
  });

  it('error SMTP no expone password ni host en el throw de sendIfConfigured', async () => {
    sendMail.mockRejectedValue(
      new Error('535 auth smtp.local.test password=not-a-real-secret'),
    );
    const { sent } = await service().sendIfConfigured({
      to: 'user@local.test',
      subject: 'x',
      text: 'y',
    });
    expect(sent).toBe(false);
  });

  it('sendPasswordReset exige URL http(s) y destinatario seguro', async () => {
    await expect(
      service().sendPasswordReset({
        to: 'user@local.test',
        resetUrl: 'javascript:alert(1)',
        expiresMinutes: 30,
      }),
    ).rejects.toThrow('Mail not configured');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('éxito SMTP parcial: smtpSent true y 3 intentos individuales', async () => {
    sendMail.mockImplementation((opts: { to: string }) => {
      if (opts.to === 'b@local.test') {
        return Promise.reject(new Error('535 password=not-a-real-secret'));
      }
      return Promise.resolve({ messageId: 'ok' });
    });
    const { sent } = await service().sendIfConfigured({
      to: ['a@local.test', 'b@local.test', 'c@local.test'],
      subject: 'x',
      text: 'y',
    });
    expect(sent).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(3);
  });

  it('sendPasswordReset conserva enlace http(s) y from server-side', async () => {
    const resetUrl =
      'https://app.local.test/restablecer?token=qa-reset-token-fixture';
    await service().sendPasswordReset({
      to: 'user@local.test',
      resetUrl,
      expiresMinutes: 30,
    });
    const firstCall = sendMail.mock.calls[0] as
      | [
          {
            from: string;
            to: string;
            text: string;
            html: string;
            subject: string;
          },
        ]
      | undefined;
    const payload = firstCall?.[0];
    expect(payload?.from).toContain('no-reply@local.test');
    expect(payload?.to).toBe('user@local.test');
    expect(payload?.text).toContain(resetUrl);
    expect(payload?.html).toContain('restablecer?token=qa-reset-token-fixture');
    expect(payload?.subject).not.toMatch(/[\r\n]/);
  });

  it('sendUserInvitation genera mail al destinatario con from server-side', async () => {
    const setupUrl =
      'https://app.local.test/restablecer?token=qa-invite-token-fixture';
    await service().sendUserInvitation({
      to: 'newuser@local.test',
      setupUrl,
      expiresMinutes: 60,
    });
    const firstCall = sendMail.mock.calls[0] as
      | [{ from: string; to: string; text: string; html: string }]
      | undefined;
    const payload = firstCall?.[0];
    expect(payload?.from).toContain('no-reply@local.test');
    expect(payload?.to).toBe('newuser@local.test');
    expect(payload?.text).toContain(setupUrl);
    expect(payload?.html).toContain('qa-invite-token-fixture');
  });

  it('sendPasswordReset no reexpone error SMTP crudo', async () => {
    sendMail.mockRejectedValue(new Error('535 password=not-a-real-secret'));
    await expect(
      service().sendPasswordReset({
        to: 'user@local.test',
        resetUrl: 'https://app.local.test/restablecer?token=abc',
        expiresMinutes: 30,
      }),
    ).rejects.toThrow('SMTP send failed');
  });
});
