import { CargosService } from './cargos.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';
export declare class CargosController {
    private readonly cargosService;
    constructor(cargosService: CargosService);
    findAll(incluirInactivos?: string): Promise<({
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
