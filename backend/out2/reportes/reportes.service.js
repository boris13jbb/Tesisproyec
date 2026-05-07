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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportesService = void 0;
const common_1 = require("@nestjs/common");
const documento_scope_util_1 = require("../documentos/documento-scope.util");
const prisma_service_1 = require("../prisma/prisma.service");
let ReportesService = class ReportesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAuditLogs(filter) {
        const from = filter.from;
        const to = filter.to;
        const where = {
            ...(filter.action ? { action: { contains: filter.action.trim() } } : {}),
            ...(filter.result ? { result: filter.result } : {}),
            ...(filter.actorEmail
                ? { actorEmail: { contains: filter.actorEmail.trim() } }
                : {}),
            ...(filter.resourceType
                ? { resourceType: filter.resourceType.trim() }
                : {}),
            ...(filter.resourceId ? { resourceId: filter.resourceId.trim() } : {}),
            ...(from || to
                ? {
                    createdAt: {
                        ...(from ? { gte: from } : {}),
                        ...(to ? { lte: to } : {}),
                    },
                }
                : {}),
        };
        const MAX_ROWS = 5000;
        return this.prisma.auditLog.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            take: MAX_ROWS,
        });
    }
    async findDocumentos(filter, viewer) {
        const incluirInactivos = filter.incluirInactivos ?? false;
        const q = filter.q?.trim();
        const archivoNombre = filter.archivoNombre?.trim();
        const archivoMime = filter.archivoMime?.trim();
        const archivoSha256 = filter.archivoSha256?.trim();
        const estado = filter.estado?.trim();
        const sortBy = filter.sortBy ?? 'fechaDocumento';
        const sortDir = filter.sortDir ?? 'desc';
        const orderBy = sortBy === 'codigo'
            ? [
                { codigo: sortDir },
                { fechaDocumento: 'desc' },
                { createdAt: 'desc' },
            ]
            : sortBy === 'estado'
                ? [
                    { estado: sortDir },
                    { fechaDocumento: 'desc' },
                    { createdAt: 'desc' },
                ]
                : [{ fechaDocumento: sortDir }, { createdAt: 'desc' }];
        const baseWhere = {
            ...(incluirInactivos ? {} : { activo: true }),
            ...(estado ? { estado } : {}),
            ...(filter.tipoDocumentalId
                ? { tipoDocumentalId: filter.tipoDocumentalId }
                : {}),
            ...(filter.subserieId ? { subserieId: filter.subserieId } : {}),
            ...(filter.serieId ? { subserie: { serieId: filter.serieId } } : {}),
            ...(filter.fechaDesde || filter.fechaHasta
                ? {
                    fechaDocumento: {
                        ...(filter.fechaDesde ? { gte: filter.fechaDesde } : {}),
                        ...(filter.fechaHasta ? { lte: filter.fechaHasta } : {}),
                    },
                }
                : {}),
            ...(archivoNombre || archivoMime || archivoSha256
                ? {
                    archivos: {
                        some: {
                            activo: true,
                            ...(archivoNombre
                                ? { originalName: { contains: archivoNombre } }
                                : {}),
                            ...(archivoMime ? { mimeType: { contains: archivoMime } } : {}),
                            ...(archivoSha256
                                ? { sha256: { contains: archivoSha256 } }
                                : {}),
                        },
                    },
                }
                : {}),
            ...(q
                ? {
                    OR: [
                        { codigo: { contains: q } },
                        { asunto: { contains: q } },
                        { descripcion: { contains: q } },
                    ],
                }
                : {}),
        };
        const vis = (0, documento_scope_util_1.documentoVisibilityWhere)(viewer);
        const where = vis
            ? { AND: [baseWhere, vis] }
            : baseWhere;
        const MAX_ROWS = 5000;
        const items = await this.prisma.documento.findMany({
            where,
            orderBy,
            take: MAX_ROWS,
            include: {
                tipoDocumental: { select: { codigo: true, nombre: true } },
                dependencia: { select: { codigo: true, nombre: true } },
                subserie: {
                    select: {
                        codigo: true,
                        nombre: true,
                        serie: { select: { codigo: true, nombre: true } },
                    },
                },
                createdBy: { select: { email: true } },
                archivos: {
                    where: { activo: true },
                    select: { id: true },
                },
            },
        });
        return items.map((d) => ({
            id: d.id,
            codigo: d.codigo,
            asunto: d.asunto,
            descripcion: d.descripcion,
            fechaDocumento: d.fechaDocumento,
            estado: d.estado,
            nivelConfidencialidad: d.nivelConfidencialidad,
            dependenciaCodigo: d.dependencia?.codigo ?? '—',
            activo: d.activo,
            tipoDocumental: `${d.tipoDocumental.codigo} — ${d.tipoDocumental.nombre}`,
            clasificacion: `${d.subserie.serie.codigo}/${d.subserie.codigo} — ${d.subserie.nombre}`,
            createdBy: d.createdBy.email,
            createdAt: d.createdAt,
            archivosActivos: d.archivos.length,
        }));
    }
    async findPendientesRevision(viewer) {
        return this.findDocumentos({
            incluirInactivos: false,
            estado: 'EN_REVISION',
            sortBy: 'fechaDocumento',
            sortDir: 'desc',
        }, viewer);
    }
};
exports.ReportesService = ReportesService;
exports.ReportesService = ReportesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportesService);
//# sourceMappingURL=reportes.service.js.map