import type { AuditContext } from '../auditoria/audit.types';
import { AuditService } from '../auditoria/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtRequestUser } from '../auth/request-user';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { ResolverRevisionDto } from './dto/resolver-revision.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
export declare class DocumentosService {
    private readonly prisma;
    private readonly audit;
    private readonly mail;
    constructor(prisma: PrismaService, audit: AuditService, mail: MailService);
    private notifyRevisionSubmitted;
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
    findOne(id: string, viewer: JwtRequestUser): Promise<{
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
    private assertTipoDocumentalExists;
    private assertSubserieExists;
    private assertDependenciaExists;
    create(dto: CreateDocumentoDto, createdById: string): Promise<{
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
    findEventos(documentoId: string, viewer: JwtRequestUser): Promise<({
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
    findArchivos(documentoId: string, viewer: JwtRequestUser): Promise<{
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
    private allowedMimes;
    private sanitizeName;
    private storageRootAbs;
    uploadArchivo(documentoId: string, file: Express.Multer.File | undefined, createdById: string, ctx?: AuditContext): Promise<{
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
        createdById: string;
        createdAt: Date;
        tipo: string;
        documentoArchivoId: string;
        metaJson: string | null;
    })[]>;
    private aplicarCambioEstadoSoloEstado;
    enviarRevision(id: string, viewer: JwtRequestUser, ctx?: AuditContext): Promise<{
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
    resolverRevision(id: string, dto: ResolverRevisionDto, viewer: JwtRequestUser, ctx?: AuditContext): Promise<{
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
    private diffDocumento;
    update(id: string, dto: UpdateDocumentoDto, updatedById: string, ctx?: AuditContext): Promise<{
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
