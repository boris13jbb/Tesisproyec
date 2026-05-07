import { JwtRequestUser } from '../auth/request-user';
import { PrismaService } from '../prisma/prisma.service';
export type AuditReportFilter = {
    action?: string;
    result?: string;
    actorEmail?: string;
    resourceType?: string;
    resourceId?: string;
    from?: Date;
    to?: Date;
};
export type DocumentosReportFilter = {
    incluirInactivos?: boolean;
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
};
export declare class ReportesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAuditLogs(filter: AuditReportFilter): Promise<{
        action: string;
        result: string;
        id: string;
        createdAt: Date;
        actorEmail: string | null;
        resourceType: string | null;
        resourceId: string | null;
        ip: string | null;
        userAgent: string | null;
        correlationId: string | null;
        metaJson: string | null;
        actorUserId: string | null;
    }[]>;
    findDocumentos(filter: DocumentosReportFilter, viewer: JwtRequestUser): Promise<{
        id: string;
        codigo: string;
        asunto: string;
        descripcion: string | null;
        fechaDocumento: Date;
        estado: string;
        nivelConfidencialidad: string;
        dependenciaCodigo: string;
        activo: boolean;
        tipoDocumental: string;
        clasificacion: string;
        createdBy: string;
        createdAt: Date;
        archivosActivos: number;
    }[]>;
    findPendientesRevision(viewer: JwtRequestUser): Promise<{
        id: string;
        codigo: string;
        asunto: string;
        descripcion: string | null;
        fechaDocumento: Date;
        estado: string;
        nivelConfidencialidad: string;
        dependenciaCodigo: string;
        activo: boolean;
        tipoDocumental: string;
        clasificacion: string;
        createdBy: string;
        createdAt: Date;
        archivosActivos: number;
    }[]>;
}
