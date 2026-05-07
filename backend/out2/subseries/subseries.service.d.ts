import { PrismaService } from '../prisma/prisma.service';
import { CreateSubserieDto } from './dto/create-subserie.dto';
import { UpdateSubserieDto } from './dto/update-subserie.dto';
export declare class SubseriesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(incluirInactivos: boolean, serieId?: string): Promise<({
        serie: {
            id: string;
            codigo: string;
            nombre: string;
        };
    } & {
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
        serieId: string;
    })[]>;
    findOne(id: string): Promise<{
        serie: {
            id: string;
            codigo: string;
            nombre: string;
        };
    } & {
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
        serieId: string;
    }>;
    private assertSerieExists;
    create(dto: CreateSubserieDto): Promise<{
        serie: {
            id: string;
            codigo: string;
            nombre: string;
        };
    } & {
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
        serieId: string;
    }>;
    update(id: string, dto: UpdateSubserieDto): Promise<{
        serie: {
            id: string;
            codigo: string;
            nombre: string;
        };
    } & {
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
        serieId: string;
    }>;
}
