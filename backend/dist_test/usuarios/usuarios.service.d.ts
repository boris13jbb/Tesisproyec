import { ConfigService } from '@nestjs/config';
import type { AuditContext } from '../auditoria/audit.types';
import { AuditService } from '../auditoria/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
type UsuarioResponse = {
    id: string;
    email: string;
    nombres: string | null;
    apellidos: string | null;
    dependenciaId: string | null;
    cargoId: string | null;
    activo: boolean;
    createdAt: Date;
    updatedAt: Date;
    roles: {
        codigo: string;
        nombre: string;
    }[];
};
export type InvitacionCorreoInfo = {
    solicitada: boolean;
    enviada: boolean;
    motivoOmitido?: string;
};
export type CreateUsuarioResult = UsuarioResponse & {
    invitacionCorreo: InvitacionCorreoInfo;
};
export declare class UsuariosService {
    private readonly prisma;
    private readonly audit;
    private readonly config;
    private readonly mail;
    constructor(prisma: PrismaService, audit: AuditService, config: ConfigService, mail: MailService);
    private hashOpaqueToken;
    private buildPasswordSetupUrl;
    private sanitize;
    findAll(): Promise<UsuarioResponse[]>;
    findOne(id: string): Promise<UsuarioResponse>;
    create(dto: CreateUsuarioDto, ctx?: AuditContext): Promise<CreateUsuarioResult>;
    update(id: string, dto: UpdateUsuarioDto, ctx?: AuditContext): Promise<UsuarioResponse>;
    resetPassword(id: string, newPassword: string, ctx?: AuditContext): Promise<{
        ok: true;
    }>;
}
export {};
