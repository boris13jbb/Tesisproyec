import { CreateSubserieDto } from './dto/create-subserie.dto';
import { UpdateSubserieDto } from './dto/update-subserie.dto';
import { SubseriesService } from './subseries.service';
export declare class SubseriesController {
    private readonly service;
    constructor(service: SubseriesService);
    findAll(incluirInactivos?: string, serieId?: string): Promise<({
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
