import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoDocumentalDto } from './dto/create-tipo-documental.dto';
import { UpdateTipoDocumentalDto } from './dto/update-tipo-documental.dto';
export declare class TiposDocumentalesService {
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
    create(dto: CreateTipoDocumentalDto): Promise<{
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }>;
    update(id: string, dto: UpdateTipoDocumentalDto): Promise<{
        id: string;
        createdAt: Date;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        nombre: string;
        descripcion: string | null;
    }>;
}
