import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    smtpHost(): string | undefined;
    isConfigured(): boolean;
    private fromAddress;
    private createTransporter;
    private fromHeader;
    sendPasswordReset(input: {
        to: string;
        resetUrl: string;
        expiresMinutes: number;
    }): Promise<void>;
    sendUserInvitation(input: {
        to: string;
        setupUrl: string;
        expiresMinutes: number;
    }): Promise<void>;
}
