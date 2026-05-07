import type { Request } from 'express';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ResetUsuarioPasswordDto } from './dto/reset-usuario-password.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuariosService } from './usuarios.service';
export declare class UsuariosController {
    private readonly usuariosService;
    constructor(usuariosService: UsuariosService);
    findAll(): Promise<{
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
    }[]>;
    findOne(id: string): Promise<{
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
    }>;
    create(dto: CreateUsuarioDto, req: Request & {
        user?: {
            id?: string;
            email?: string;
        };
    }): Promise<import("./usuarios.service").CreateUsuarioResult>;
    update(id: string, dto: UpdateUsuarioDto, req: Request & {
        user?: {
            id?: string;
            email?: string;
        };
    }): Promise<{
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
    }>;
    resetPassword(id: string, dto: ResetUsuarioPasswordDto, req: Request & {
        user?: {
            id?: string;
            email?: string;
        };
    }): Promise<{
        ok: true;
    }>;
}
