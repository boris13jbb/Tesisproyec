import { PrismaService } from '../prisma/prisma.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';
export declare class DependenciasService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(incluirInactivos: boolean): Promise<{
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }>;
    create(dto: CreateDependenciaDto): Promise<{
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }>;
    update(id: string, dto: UpdateDependenciaDto): Promise<{
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }>;
}
