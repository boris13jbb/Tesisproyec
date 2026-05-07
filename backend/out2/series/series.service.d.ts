import { PrismaService } from '../prisma/prisma.service';
import { CreateSerieDto } from './dto/create-serie.dto';
import { UpdateSerieDto } from './dto/update-serie.dto';
export declare class SeriesService {
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
    create(dto: CreateSerieDto): Promise<{
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }>;
    update(id: string, dto: UpdateSerieDto): Promise<{
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }>;
}
