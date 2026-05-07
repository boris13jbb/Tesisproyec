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
            dependencia: {
                id: string;
                codigo: string;
                nombre: string;
            } | null;
            tipoDocumental: {
                id: string;
                codigo: string;
                nombre: string;
            };
            subserie: {
                serie: {
                    id: string;
                    codigo: string;
                    nombre: string;
                };
                id: string;
                codigo: string;
                nombre: string;
            };
            createdBy: {
                id: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            dependenciaId: string | null;
            activo: boolean;
            updatedAt: Date;
            codigo: string;
            descripcion: string | null;
            asunto: string;
            fechaDocumento: Date;
            tipoDocumentalId: string;
            subserieId: string;
            nivelConfidencialidad: string;
            estado: string;
            createdById: string;
        })[];
    }>;
    findOne(id: string, req: Request & {
        user: JwtRequestUser;
    }): Promise<{
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
        tipoDocumental: {
            id: string;
            codigo: string;
            nombre: string;
        };
        subserie: {
            serie: {
                id: string;
                codigo: string;
                nombre: string;
            };
            id: string;
            codigo: string;
            nombre: string;
        };
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        dependenciaId: string | null;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        descripcion: string | null;
        asunto: string;
        fechaDocumento: Date;
        tipoDocumentalId: string;
        subserieId: string;
        nivelConfidencialidad: string;
        estado: string;
        createdById: string;
    }>;
    create(dto: CreateDocumentoDto, req: {
        user?: {
            id?: string;
        };
    }): Promise<{
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
        tipoDocumental: {
            id: string;
            codigo: string;
            nombre: string;
        };
        subserie: {
            serie: {
                id: string;
                codigo: string;
                nombre: string;
            };
            id: string;
            codigo: string;
            nombre: string;
        };
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        dependenciaId: string | null;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        descripcion: string | null;
        asunto: string;
        fechaDocumento: Date;
        tipoDocumentalId: string;
        subserieId: string;
        nivelConfidencialidad: string;
        estado: string;
        createdById: string;
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
        createdAt: Date;
        createdById: string;
        documentoId: string;
        tipo: string;
        cambiosJson: string | null;
    })[]>;
    findArchivos(id: string, req: Request & {
        user: JwtRequestUser;
    }): Promise<{
        id: string;
        createdAt: Date;
        version: number;
        sha256: string;
        createdBy: {
            id: string;
            email: string;
        };
        originalName: string;
        mimeType: string;
        sizeBytes: number;
    }[]>;
    uploadArchivo(id: string, req: Request & {
        user?: {
            id?: string;
            email?: string;
        };
    }, file: Express.Multer.File | undefined): Promise<{
        id: string;
        createdAt: Date;
        version: number;
        sha256: string;
        createdBy: {
            id: string;
            email: string;
        };
        originalName: string;
        mimeType: string;
        sizeBytes: number;
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
        createdAt: Date;
        metaJson: string | null;
        createdById: string;
        tipo: string;
        documentoArchivoId: string;
    })[]>;
    enviarRevision(id: string, req: Request & {
        user: JwtRequestUser;
    }): Promise<{
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
        tipoDocumental: {
            id: string;
            codigo: string;
            nombre: string;
        };
        subserie: {
            serie: {
                id: string;
                codigo: string;
                nombre: string;
            };
            id: string;
            codigo: string;
            nombre: string;
        };
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        dependenciaId: string | null;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        descripcion: string | null;
        asunto: string;
        fechaDocumento: Date;
        tipoDocumentalId: string;
        subserieId: string;
        nivelConfidencialidad: string;
        estado: string;
        createdById: string;
    }>;
    resolverRevision(id: string, dto: ResolverRevisionDto, req: Request & {
        user: JwtRequestUser;
    }): Promise<{
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
        tipoDocumental: {
            id: string;
            codigo: string;
            nombre: string;
        };
        subserie: {
            serie: {
                id: string;
                codigo: string;
                nombre: string;
            };
            id: string;
            codigo: string;
            nombre: string;
        };
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        dependenciaId: string | null;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        descripcion: string | null;
        asunto: string;
        fechaDocumento: Date;
        tipoDocumentalId: string;
        subserieId: string;
        nivelConfidencialidad: string;
        estado: string;
        createdById: string;
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
        dependencia: {
            id: string;
            codigo: string;
            nombre: string;
        } | null;
        tipoDocumental: {
            id: string;
            codigo: string;
            nombre: string;
        };
        subserie: {
            serie: {
                id: string;
                codigo: string;
                nombre: string;
            };
            id: string;
            codigo: string;
            nombre: string;
        };
        createdBy: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        dependenciaId: string | null;
        activo: boolean;
        updatedAt: Date;
        codigo: string;
        descripcion: string | null;
        asunto: string;
        fechaDocumento: Date;
        tipoDocumentalId: string;
        subserieId: string;
        nivelConfidencialidad: string;
        estado: string;
        createdById: string;
    }>;
}
