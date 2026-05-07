import { PrismaService } from '../prisma/prisma.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';
export declare class CargosService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(incluirInactivos: boolean): Promise<({
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        dependenciaId: string | null;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    })[]>;
    findOne(id: string): Promise<{
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        dependenciaId: string | null;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }>;
    private assertDependenciaExists;
    create(dto: CreateCargoDto): Promise<{
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        dependenciaId: string | null;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }>;
    update(id: string, dto: UpdateCargoDto): Promise<{
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        dependenciaId: string | null;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }>;
}
