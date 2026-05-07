import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../auditoria/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly config;
    private readonly audit;
    private readonly mail;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService, audit: AuditService, mail: MailService);
    private buildPasswordResetUrl;
    private hashRefresh;
    private hashOpaqueToken;
    private accessSignOptions;
    private loginLockoutMaxAttempts;
    private loginLockoutMinutes;
    login(dto: LoginDto, client?: {
        ip?: string | null;
        userAgent?: string | null;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            nombres: string | null;
            apellidos: string | null;
            dependenciaId: string | null;
            roles: {
                codigo: string;
                nombre: string;
            }[];
        };
    }>;
    private restoreRefreshToken;
    restoreSessionBootstrap(refreshRaw: string | undefined): Promise<{
        ok: true;
        accessToken: string;
        refreshToken: string;
        user: ReturnType<AuthService["sanitizeUser"]>;
    } | {
        ok: false;
        reason: "MISSING_COOKIE" | "INVALID_REFRESH" | "INACTIVITY_TIMEOUT" | "ROTATION_CONFLICT";
    }>;
    refresh(refreshRaw: string | undefined): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            nombres: string | null;
            apellidos: string | null;
            dependenciaId: string | null;
            roles: {
                codigo: string;
                nombre: string;
            }[];
        };
    }>;
    logout(refreshRaw: string | undefined): Promise<void>;
    private sanitizeUser;
    requestPasswordReset(input: {
        email: string;
        requestedIp?: string;
        userAgent?: string;
    }): Promise<{
        ok: true;
        debugToken?: string;
    }>;
    confirmPasswordReset(input: {
        token: string;
        newPassword: string;
    }): Promise<{
        ok: true;
    }>;
}
