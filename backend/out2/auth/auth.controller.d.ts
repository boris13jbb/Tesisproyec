import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
export declare class AuthController {
    private readonly authService;
    private readonly config;
    constructor(authService: AuthService, config: ConfigService);
    private cookieName;
    private refreshMaxAgeMs;
    login(dto: LoginDto, req: Request, res: Response): Promise<{
        accessToken: string;
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
    refresh(req: Request, res: Response): Promise<{
        accessToken: string;
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
    restoreSession(req: Request, res: Response): Promise<{
        restored: false;
        accessToken?: undefined;
        user?: undefined;
    } | {
        restored: true;
        accessToken: string;
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
    logout(req: Request, res: Response): Promise<void>;
    me(req: Request & {
        user: unknown;
    }): Express.User | undefined;
    requestPasswordReset(dto: PasswordResetRequestDto, req: Request): Promise<{
        ok: true;
        debugToken?: string;
    }>;
    confirmPasswordReset(dto: PasswordResetConfirmDto): Promise<{
        ok: true;
    }>;
}
