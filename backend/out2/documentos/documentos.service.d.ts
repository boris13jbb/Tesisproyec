import type { AuditContext } from '../auditoria/audit.types';
import { AuditService } from '../auditoria/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtRequestUser } from '../auth/request-user';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { ResolverRevisionDto } from './dto/resolver-revision.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
export declare class DocumentosService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    private loadDocumentoById;
    findAll(viewer: JwtRequestUser, incluirInactivos: boolean, filters?: {
        q?: string;
        archivoNombre?: string;
        archivoMime?: string;
        archivoSha256?: string;
        estado?: string;
        tipoDocumentalId?: string;
        serieId?: string;
        subserieId?: string;
        fechaDesde?: Date;
        fechaHasta?: Date;
        sortBy?: 'codigo' | 'fechaDocumento' | 'estado';
        sortDir?: 'asc' | 'desc';
        page?: number;
        pageSize?: number;
    }): Promise<{
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
    findOne(id: string, viewer: JwtRequestUser): Promise<{
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
    private assertTipoDocumentalExists;
    private assertSubserieExists;
    private assertDependenciaExists;
    create(dto: CreateDocumentoDto, createdById: string): Promise<{
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
    findEventos(documentoId: string, viewer: JwtRequestUser): Promise<({
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
    findArchivos(documentoId: string, viewer: JwtRequestUser): Promise<{
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
    private allowedMimes;
    private sanitizeName;
    private storageRootAbs;
    uploadArchivo(documentoId: string, file: Express.Multer.File | undefined, createdById: string, ctx?: AuditContext): Promise<{
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
    prepareDownloadArchivo(documentoId: string, archivoId: string, viewer: JwtRequestUser, ip: string | null, ctx?: AuditContext): Promise<{
        absPath: string;
        downloadName: string;
        mimeType: string;
    }>;
    deleteArchivo(documentoId: string, archivoId: string, deletedById: string, ctx?: AuditContext): Promise<{
        ok: boolean;
    }>;
    findArchivoEventos(documentoId: string, archivoId: string, viewer: JwtRequestUser): Promise<({
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
    private aplicarCambioEstadoSoloEstado;
    enviarRevision(id: string, viewer: JwtRequestUser, ctx?: AuditContext): Promise<{
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
    resolverRevision(id: string, dto: ResolverRevisionDto, viewer: JwtRequestUser, ctx?: AuditContext): Promise<{
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
    private diffDocumento;
    update(id: string, dto: UpdateDocumentoDto, updatedById: string, ctx?: AuditContext): Promise<{
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
