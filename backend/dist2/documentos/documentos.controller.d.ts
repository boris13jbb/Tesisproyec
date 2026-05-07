import type { Request, Response } from 'express';
import { JwtRequestUser } from '../auth/request-user';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { ResolverRevisionDto } from './dto/resolver-revision.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { DocumentosService } from './documentos.service';
export declare class DocumentosController {
    private readonly service;
    constructor(service: DocumentosService);
    findAll(req: Request & {
        user: JwtRequestUser;
    }, incluirInactivos?: string, q?: string, archivoNombre?: string, archivoMime?: string, archivoSha256?: string, estado?: string, tipoDocumentalId?: string, serieId?: string, subserieId?: string, fechaDesde?: string, fechaHasta?: string, sortBy?: 'codigo' | 'fechaDocumento' | 'estado', sortDir?: 'asc' | 'desc', page?: string, pageSize?: string): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: ({
            tipoDocumental: {
                id: string;
                codigo: string;
                nombre: string;
            };
            subserie: {
                id: string;
                codigo: string;
                nombre: string;
                serie: {
                    id: string;
                    codigo: string;
                    nombre: string;
                };
            };
            dependencia: {
                id: string;
                codigo: string;
                nombre: string;
            } | null;
            createdBy: {
                id: string;
                email: string;
            };
        } & {
            id: string;
            codigo: string;
            asunto: string;
            descripcion: string | null;
            fechaDocumento: Date;
            estado: string;
            nivelConfidencialidad: string;
            activo: boolean;
            tipoDocumentalId: string;
            subserieId: string;
            dependenciaId: string | null;
            createdById: string;
            createdAt: Date;
            updatedAt: Date;
        })[];
    }>;
    findOne(id: string, req: Request & {
        user: JwtRequestUser;
    }): Promise<{
        tipoDocumental: {
            id: string;
            codigo: string;
            nombre: string;
        };
        subserie: {
            id: string;
            codigo: string;
            nombre: string;
            serie: {
                id: string;
                codigo: string;
                nombre: string;
            };
        };
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        codigo: string;
        asunto: string;
        descripcion: string | null;
        fechaDocumento: Date;
        estado: string;
        nivelConfidencialidad: string;
        activo: boolean;
        tipoDocumentalId: string;
        subserieId: string;
        dependenciaId: string | null;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(dto: CreateDocumentoDto, req: {
        user?: {
            id?: string;
        };
    }): Promise<{
        tipoDocumental: {
            id: string;
            codigo: string;
            nombre: string;
        };
        subserie: {
            id: string;
            codigo: string;
            nombre: string;
            serie: {
                id: string;
                codigo: string;
                nombre: string;
            };
        };
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        codigo: string;
        asunto: string;
        descripcion: string | null;
        fechaDocumento: Date;
        estado: string;
        nivelConfidencialidad: string;
        activo: boolean;
        tipoDocumentalId: string;
        subserieId: string;
        dependenciaId: string | null;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findEventos(id: string, req: Request & {
        user: JwtRequestUser;
    }): Promise<({
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdById: string;
        createdAt: Date;
        documentoId: string;
        tipo: string;
        cambiosJson: string | null;
    })[]>;
    findArchivos(id: string, req: Request & {
        user: JwtRequestUser;
    }): Promise<{
        id: string;
        createdAt: Date;
        createdBy: {
            id: string;
            email: string;
        };
        version: number;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        sha256: string;
    }[]>;
    uploadArchivo(id: string, req: Request & {
        user?: {
            id?: string;
            email?: string;
        };
    }, file: Express.Multer.File | undefined): Promise<{
        id: string;
        createdAt: Date;
        createdBy: {
            id: string;
            email: string;
        };
        version: number;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        sha256: string;
    }>;
    downloadArchivo(id: string, archivoId: string, req: Request & {
        user?: {
            id?: string;
            email?: string;
        };
    }, res: Response): Promise<void>;
    findArchivoEventos(id: string, archivoId: string, req: Request & {
        user: JwtRequestUser;
    }): Promise<({
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdById: string;
        createdAt: Date;
        tipo: string;
        documentoArchivoId: string;
        metaJson: string | null;
    })[]>;
    enviarRevision(id: string, req: Request & {
        user: JwtRequestUser;
    }): Promise<{
        tipoDocumental: {
            id: string;
            codigo: string;
            nombre: string;
        };
        subserie: {
            id: string;
            codigo: string;
            nombre: string;
            serie: {
                id: string;
                codigo: string;
                nombre: string;
            };
        };
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        codigo: string;
        asunto: string;
        descripcion: string | null;
        fechaDocumento: Date;
        estado: string;
        nivelConfidencialidad: string;
        activo: boolean;
        tipoDocumentalId: string;
        subserieId: string;
        dependenciaId: string | null;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    resolverRevision(id: string, dto: ResolverRevisionDto, req: Request & {
        user: JwtRequestUser;
    }): Promise<{
        tipoDocumental: {
            id: string;
            codigo: string;
            nombre: string;
        };
        subserie: {
            id: string;
            codigo: string;
            nombre: string;
            serie: {
                id: string;
                codigo: string;
                nombre: string;
            };
        };
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        codigo: string;
        asunto: string;
        descripcion: string | null;
        fechaDocumento: Date;
        estado: string;
        nivelConfidencialidad: string;
        activo: boolean;
        tipoDocumentalId: string;
        subserieId: string;
        dependenciaId: string | null;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteArchivo(id: string, archivoId: string, req: Request & {
        user?: {
            id?: string;
            email?: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    update(id: string, dto: UpdateDocumentoDto, req: Request & {
        user?: {
            id?: string;
            email?: string;
        };
    }): Promise<{
        tipoDocumental: {
            id: string;
            codigo: string;
            nombre: string;
        };
        subserie: {
            id: string;
            codigo: string;
            nombre: string;
            serie: {
                id: string;
                codigo: string;
                nombre: string;
            };
        };
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        codigo: string;
        asunto: string;
        descripcion: string | null;
        fechaDocumento: Date;
        estado: string;
        nivelConfidencialidad: string;
        activo: boolean;
        tipoDocumentalId: string;
        subserieId: string;
        dependenciaId: string | null;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
