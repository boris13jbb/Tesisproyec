"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportesController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const audit_service_1 = require("../auditoria/audit.service");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const reportes_service_1 = require("./reportes.service");
let ReportesController = class ReportesController {
    service;
    audit;
    constructor(service, audit) {
        this.service = service;
        this.audit = audit;
    }
    parseBool(v) {
        return v === 'true' || v === '1';
    }
    async logReportExport(req, format, kind) {
        const u = req.user;
        await this.audit.log({
            action: 'REPORT_EXPORTED',
            result: 'OK',
            context: {
                actorUserId: u?.id ?? null,
                actorEmail: u?.email ?? null,
                ip: req.ip ?? null,
                userAgent: typeof req.headers['user-agent'] === 'string'
                    ? req.headers['user-agent']
                    : null,
            },
            meta: { format, kind },
        });
    }
    async exportPendientesRevisionExcel(req, res) {
        await this.logReportExport(req, 'xlsx', 'pendientes_revision');
        const items = await this.service.findPendientesRevision(req.user);
        const wb = new exceljs_1.default.Workbook();
        wb.creator = 'SGD-GADPR-LM';
        const ws = wb.addWorksheet('Pendientes revisión');
        ws.columns = [
            { header: 'Código', key: 'codigo', width: 18 },
            { header: 'Asunto', key: 'asunto', width: 40 },
            { header: 'Fecha', key: 'fechaDocumento', width: 14 },
            { header: 'Estado', key: 'estado', width: 14 },
            { header: 'Confidencialidad', key: 'nivelConfidencialidad', width: 16 },
            { header: 'Dependencia', key: 'dependenciaCodigo', width: 16 },
            { header: 'Tipo documental', key: 'tipoDocumental', width: 28 },
            { header: 'Clasificación', key: 'clasificacion', width: 30 },
            { header: 'Adjuntos', key: 'archivosActivos', width: 10 },
            { header: 'Creado por', key: 'createdBy', width: 22 },
            { header: 'Creado el', key: 'createdAt', width: 20 },
        ];
        ws.getRow(1).font = { bold: true };
        for (const d of items) {
            ws.addRow({
                codigo: d.codigo,
                asunto: d.asunto,
                fechaDocumento: d.fechaDocumento.toISOString().slice(0, 10),
                estado: d.estado,
                nivelConfidencialidad: d.nivelConfidencialidad,
                dependenciaCodigo: d.dependenciaCodigo,
                tipoDocumental: d.tipoDocumental,
                clasificacion: d.clasificacion,
                archivosActivos: d.archivosActivos,
                createdBy: d.createdBy,
                createdAt: d.createdAt.toISOString().replace('T', ' ').slice(0, 19),
            });
        }
        const filename = `pendientes_revision_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await wb.xlsx.write(res);
        res.end();
    }
    async exportPendientesRevisionPdf(req, res) {
        await this.logReportExport(req, 'pdf', 'pendientes_revision');
        const items = await this.service.findPendientesRevision(req.user);
        const filename = `pendientes_revision_${new Date().toISOString().slice(0, 10)}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const doc = new pdfkit_1.default({ size: 'A4', margin: 40 });
        doc.on('error', () => {
            if (!res.headersSent) {
                throw new common_1.InternalServerErrorException('Error generando PDF');
            }
        });
        doc.pipe(res);
        doc.fontSize(16).text('Pendientes de revisión', { align: 'left' });
        doc.moveDown(0.25);
        doc
            .fontSize(9)
            .fillColor('gray')
            .text(`Generado: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} — ${req.hostname}`);
        doc.fillColor('black');
        doc.moveDown(0.75);
        doc.fontSize(10);
        for (const d of items) {
            doc
                .font('Helvetica-Bold')
                .text(`${d.codigo} — ${d.asunto}`, { continued: false });
            doc
                .font('Helvetica')
                .text(`Fecha: ${d.fechaDocumento.toISOString().slice(0, 10)} | Estado: ${d.estado} | Conf.: ${d.nivelConfidencialidad} | Dep.: ${d.dependenciaCodigo} | Adjuntos: ${d.archivosActivos}`);
            doc
                .fillColor('gray')
                .text(`${d.tipoDocumental} | ${d.clasificacion} | Creado por: ${d.createdBy}`)
                .fillColor('black');
            if (d.descripcion) {
                doc
                    .fillColor('gray')
                    .text(d.descripcion, { lineGap: 1 })
                    .fillColor('black');
            }
            doc.moveDown(0.6);
            if (doc.y > 760) {
                doc.addPage();
            }
        }
        doc.end();
    }
    async exportDocumentosExcel(req, res, incluirInactivos, q, archivoNombre, archivoMime, archivoSha256, estado, tipoDocumentalId, serieId, subserieId, fechaDesde, fechaHasta, sortBy, sortDir) {
        await this.logReportExport(req, 'xlsx', 'documentos');
        const items = await this.service.findDocumentos({
            incluirInactivos: this.parseBool(incluirInactivos),
            q,
            archivoNombre,
            archivoMime,
            archivoSha256,
            estado,
            tipoDocumentalId,
            serieId,
            subserieId,
            fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
            fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
            sortBy,
            sortDir,
        }, req.user);
        const wb = new exceljs_1.default.Workbook();
        wb.creator = 'SGD-GADPR-LM';
        const ws = wb.addWorksheet('Documentos');
        ws.columns = [
            { header: 'Código', key: 'codigo', width: 18 },
            { header: 'Asunto', key: 'asunto', width: 40 },
            { header: 'Fecha', key: 'fechaDocumento', width: 14 },
            { header: 'Estado', key: 'estado', width: 14 },
            { header: 'Confidencialidad', key: 'nivelConfidencialidad', width: 16 },
            { header: 'Dependencia', key: 'dependenciaCodigo', width: 16 },
            { header: 'Activo', key: 'activo', width: 10 },
            { header: 'Tipo documental', key: 'tipoDocumental', width: 28 },
            { header: 'Clasificación', key: 'clasificacion', width: 30 },
            { header: 'Adjuntos', key: 'archivosActivos', width: 10 },
            { header: 'Creado por', key: 'createdBy', width: 22 },
            { header: 'Creado el', key: 'createdAt', width: 20 },
        ];
        ws.getRow(1).font = { bold: true };
        for (const d of items) {
            ws.addRow({
                codigo: d.codigo,
                asunto: d.asunto,
                fechaDocumento: d.fechaDocumento.toISOString().slice(0, 10),
                estado: d.estado,
                nivelConfidencialidad: d.nivelConfidencialidad,
                dependenciaCodigo: d.dependenciaCodigo,
                activo: d.activo ? 'Sí' : 'No',
                tipoDocumental: d.tipoDocumental,
                clasificacion: d.clasificacion,
                archivosActivos: d.archivosActivos,
                createdBy: d.createdBy,
                createdAt: d.createdAt.toISOString().replace('T', ' ').slice(0, 19),
            });
        }
        const filename = `documentos_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await wb.xlsx.write(res);
        res.end();
    }
    async exportDocumentosPdf(req, res, incluirInactivos, q, archivoNombre, archivoMime, archivoSha256, estado, tipoDocumentalId, serieId, subserieId, fechaDesde, fechaHasta, sortBy, sortDir) {
        await this.logReportExport(req, 'pdf', 'documentos');
        const items = await this.service.findDocumentos({
            incluirInactivos: this.parseBool(incluirInactivos),
            q,
            archivoNombre,
            archivoMime,
            archivoSha256,
            estado,
            tipoDocumentalId,
            serieId,
            subserieId,
            fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
            fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
            sortBy,
            sortDir,
        }, req.user);
        const filename = `documentos_${new Date().toISOString().slice(0, 10)}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const doc = new pdfkit_1.default({ size: 'A4', margin: 40 });
        doc.on('error', () => {
            if (!res.headersSent) {
                throw new common_1.InternalServerErrorException('Error generando PDF');
            }
        });
        doc.pipe(res);
        doc.fontSize(16).text('Reporte de documentos', { align: 'left' });
        doc.moveDown(0.25);
        doc
            .fontSize(9)
            .fillColor('gray')
            .text(`Generado: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} — ${req.hostname}`);
        doc.fillColor('black');
        doc.moveDown(0.75);
        doc.fontSize(10);
        for (const d of items) {
            doc
                .font('Helvetica-Bold')
                .text(`${d.codigo} — ${d.asunto}`, { continued: false });
            doc
                .font('Helvetica')
                .text(`Fecha: ${d.fechaDocumento.toISOString().slice(0, 10)} | Estado: ${d.estado} | Conf.: ${d.nivelConfidencialidad} | Dep.: ${d.dependenciaCodigo} | Adjuntos: ${d.archivosActivos}`);
            doc
                .fillColor('gray')
                .text(`${d.tipoDocumental} | ${d.clasificacion} | Creado por: ${d.createdBy}`)
                .fillColor('black');
            if (d.descripcion) {
                doc
                    .fillColor('gray')
                    .text(d.descripcion, { lineGap: 1 })
                    .fillColor('black');
            }
            doc.moveDown(0.6);
            if (doc.y > 760) {
                doc.addPage();
            }
        }
        doc.end();
    }
    async exportAuditoriaExcel(req, res, action, result, actorEmail, resourceType, resourceId, from, to) {
        await this.logReportExport(req, 'xlsx', 'auditoria');
        const items = await this.service.findAuditLogs({
            action,
            result,
            actorEmail,
            resourceType,
            resourceId,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
        });
        const wb = new exceljs_1.default.Workbook();
        wb.creator = 'SGD-GADPR-LM';
        const ws = wb.addWorksheet('Auditoria');
        ws.columns = [
            { header: 'Fecha UTC', key: 'createdAt', width: 20 },
            { header: 'Acción', key: 'action', width: 26 },
            { header: 'Resultado', key: 'result', width: 10 },
            { header: 'Actor email', key: 'actorEmail', width: 28 },
            { header: 'IP', key: 'ip', width: 16 },
            { header: 'Recurso tipo', key: 'resourceType', width: 20 },
            { header: 'Recurso id', key: 'resourceId', width: 24 },
            { header: 'Meta (JSON)', key: 'metaJson', width: 50 },
        ];
        ws.getRow(1).font = { bold: true };
        for (const row of items) {
            ws.addRow({
                createdAt: row.createdAt.toISOString().replace('T', ' ').slice(0, 19),
                action: row.action,
                result: row.result,
                actorEmail: row.actorEmail ?? '',
                ip: row.ip ?? '',
                resourceType: row.resourceType ?? '',
                resourceId: row.resourceId ?? '',
                metaJson: row.metaJson ?? '',
            });
        }
        const filename = `auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await wb.xlsx.write(res);
        res.end();
    }
    async exportAuditoriaPdf(req, res, action, result, actorEmail, resourceType, resourceId, from, to) {
        await this.logReportExport(req, 'pdf', 'auditoria');
        const items = await this.service.findAuditLogs({
            action,
            result,
            actorEmail,
            resourceType,
            resourceId,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
        });
        const filename = `auditoria_${new Date().toISOString().slice(0, 10)}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const doc = new pdfkit_1.default({ size: 'A4', margin: 40 });
        doc.on('error', () => {
            if (!res.headersSent) {
                throw new common_1.InternalServerErrorException('Error generando PDF');
            }
        });
        doc.pipe(res);
        doc.fontSize(14).text('Reporte de auditoría (seguridad / trazabilidad)', {
            align: 'left',
        });
        doc.moveDown(0.25);
        doc
            .fontSize(8)
            .fillColor('gray')
            .text(`Generado: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`);
        doc.fillColor('black');
        doc.moveDown(0.6);
        doc.fontSize(9);
        for (const row of items) {
            doc
                .font('Helvetica-Bold')
                .text(`${row.createdAt.toISOString().slice(0, 19)} — ${row.action}`, {
                continued: false,
            });
            doc
                .font('Helvetica')
                .text(`Resultado: ${row.result} | Actor: ${row.actorEmail ?? '—'} | IP: ${row.ip ?? '—'}`);
            doc
                .fillColor('gray')
                .text(`Recurso: ${row.resourceType ?? '—'} / ${row.resourceId ?? '—'}`)
                .fillColor('black');
            doc.moveDown(0.35);
            if (doc.y > 760)
                doc.addPage();
        }
        doc.end();
    }
};
exports.ReportesController = ReportesController;
__decorate([
    (0, common_1.Get)('pendientes-revision.xlsx'),
    (0, roles_decorator_1.Roles)('ADMIN', 'REVISOR'),
    (0, common_1.Header)('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportesController.prototype, "exportPendientesRevisionExcel", null);
__decorate([
    (0, common_1.Get)('pendientes-revision.pdf'),
    (0, roles_decorator_1.Roles)('ADMIN', 'REVISOR'),
    (0, common_1.Header)('Content-Type', 'application/pdf'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportesController.prototype, "exportPendientesRevisionPdf", null);
__decorate([
    (0, common_1.Get)('documentos.xlsx'),
    (0, common_1.Header)('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('incluirInactivos')),
    __param(3, (0, common_1.Query)('q')),
    __param(4, (0, common_1.Query)('archivoNombre')),
    __param(5, (0, common_1.Query)('archivoMime')),
    __param(6, (0, common_1.Query)('archivoSha256')),
    __param(7, (0, common_1.Query)('estado')),
    __param(8, (0, common_1.Query)('tipoDocumentalId')),
    __param(9, (0, common_1.Query)('serieId')),
    __param(10, (0, common_1.Query)('subserieId')),
    __param(11, (0, common_1.Query)('fechaDesde')),
    __param(12, (0, common_1.Query)('fechaHasta')),
    __param(13, (0, common_1.Query)('sortBy')),
    __param(14, (0, common_1.Query)('sortDir')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportesController.prototype, "exportDocumentosExcel", null);
__decorate([
    (0, common_1.Get)('documentos.pdf'),
    (0, common_1.Header)('Content-Type', 'application/pdf'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('incluirInactivos')),
    __param(3, (0, common_1.Query)('q')),
    __param(4, (0, common_1.Query)('archivoNombre')),
    __param(5, (0, common_1.Query)('archivoMime')),
    __param(6, (0, common_1.Query)('archivoSha256')),
    __param(7, (0, common_1.Query)('estado')),
    __param(8, (0, common_1.Query)('tipoDocumentalId')),
    __param(9, (0, common_1.Query)('serieId')),
    __param(10, (0, common_1.Query)('subserieId')),
    __param(11, (0, common_1.Query)('fechaDesde')),
    __param(12, (0, common_1.Query)('fechaHasta')),
    __param(13, (0, common_1.Query)('sortBy')),
    __param(14, (0, common_1.Query)('sortDir')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportesController.prototype, "exportDocumentosPdf", null);
__decorate([
    (0, common_1.Get)('auditoria.xlsx'),
    (0, common_1.Header)('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('action')),
    __param(3, (0, common_1.Query)('result')),
    __param(4, (0, common_1.Query)('actorEmail')),
    __param(5, (0, common_1.Query)('resourceType')),
    __param(6, (0, common_1.Query)('resourceId')),
    __param(7, (0, common_1.Query)('from')),
    __param(8, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportesController.prototype, "exportAuditoriaExcel", null);
__decorate([
    (0, common_1.Get)('auditoria.pdf'),
    (0, common_1.Header)('Content-Type', 'application/pdf'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('action')),
    __param(3, (0, common_1.Query)('result')),
    __param(4, (0, common_1.Query)('actorEmail')),
    __param(5, (0, common_1.Query)('resourceType')),
    __param(6, (0, common_1.Query)('resourceId')),
    __param(7, (0, common_1.Query)('from')),
    __param(8, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportesController.prototype, "exportAuditoriaPdf", null);
exports.ReportesController = ReportesController = __decorate([
    (0, common_1.Controller)('reportes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __metadata("design:paramtypes", [reportes_service_1.ReportesService,
        audit_service_1.AuditService])
], ReportesController);
//# sourceMappingURL=reportes.controller.js.map