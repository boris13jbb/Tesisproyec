import { JwtRequestUser } from '../auth/request-user';
import { AuditService } from '../auditoria/audit.service';
import type { Request, Response } from 'express';
import { ReportesService } from './reportes.service';
export declare class ReportesController {
    private readonly service;
    private readonly audit;
    constructor(service: ReportesService, audit: AuditService);
    private parseBool;
    private logReportExport;
    exportPendientesRevisionExcel(req: Request & {
        user: JwtRequestUser;
    }, res: Response): Promise<void>;
    exportPendientesRevisionPdf(req: Request & {
        user: JwtRequestUser;
    }, res: Response): Promise<void>;
    exportDocumentosExcel(req: Request & {
        user: JwtRequestUser;
    }, res: Response, incluirInactivos?: string, q?: string, archivoNombre?: string, archivoMime?: string, archivoSha256?: string, estado?: string, tipoDocumentalId?: string, serieId?: string, subserieId?: string, fechaDesde?: string, fechaHasta?: string, sortBy?: 'codigo' | 'fechaDocumento' | 'estado', sortDir?: 'asc' | 'desc'): Promise<void>;
    exportDocumentosPdf(req: Request & {
        user: JwtRequestUser;
    }, res: Response, incluirInactivos?: string, q?: string, archivoNombre?: string, archivoMime?: string, archivoSha256?: string, estado?: string, tipoDocumentalId?: string, serieId?: string, subserieId?: string, fechaDesde?: string, fechaHasta?: string, sortBy?: 'codigo' | 'fechaDocumento' | 'estado', sortDir?: 'asc' | 'desc'): Promise<void>;
    exportAuditoriaExcel(req: Request & {
        user: JwtRequestUser;
    }, res: Response, action?: string, result?: string, actorEmail?: string, resourceType?: string, resourceId?: string, from?: string, to?: string): Promise<void>;
    exportAuditoriaPdf(req: Request & {
        user: JwtRequestUser;
    }, res: Response, action?: string, result?: string, actorEmail?: string, resourceType?: string, resourceId?: string, from?: string, to?: string): Promise<void>;
}
