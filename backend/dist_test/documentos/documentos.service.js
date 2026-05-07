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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentosService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const audit_service_1 = require("../auditoria/audit.service");
const prisma_util_1 = require("../common/prisma-util");
const prisma_service_1 = require("../prisma/prisma.service");
const request_user_1 = require("../auth/request-user");
const documento_scope_util_1 = require("./documento-scope.util");
const documento_estado_util_1 = require("./documento-estado.util");
const includeCatalogos = {
    tipoDocumental: { select: { id: true, codigo: true, nombre: true } },
    subserie: {
        select: {
            id: true,
            codigo: true,
            nombre: true,
            serie: { select: { id: true, codigo: true, nombre: true } },
        },
    },
    dependencia: { select: { id: true, codigo: true, nombre: true } },
    createdBy: { select: { id: true, email: true } },
};
let DocumentosService = class DocumentosService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async loadDocumentoById(id) {
        const row = await this.prisma.documento.findUnique({
            where: { id },
            include: includeCatalogos,
        });
        if (!row) {
            throw new common_1.NotFoundException('Documento no encontrado');
        }
        return row;
    }
    async findAll(viewer, incluirInactivos, filters) {
        const q = filters?.q?.trim();
        const archivoNombre = filters?.archivoNombre?.trim();
        const archivoMime = filters?.archivoMime?.trim();
        const archivoSha256 = filters?.archivoSha256?.trim();
        const estado = filters?.estado?.trim();
        const page = Math.max(1, filters?.page ?? 1);
        const pageSize = Math.min(100, Math.max(5, filters?.pageSize ?? 20));
        const skip = (page - 1) * pageSize;
        const sortBy = filters?.sortBy ?? 'fechaDocumento';
        const sortDir = filters?.sortDir ?? 'desc';
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
            ...(filters?.tipoDocumentalId
                ? { tipoDocumentalId: filters.tipoDocumentalId }
                : {}),
            ...(filters?.subserieId ? { subserieId: filters.subserieId } : {}),
            ...(filters?.serieId ? { subserie: { serieId: filters.serieId } } : {}),
            ...(filters?.fechaDesde || filters?.fechaHasta
                ? {
                    fechaDocumento: {
                        ...(filters.fechaDesde ? { gte: filters.fechaDesde } : {}),
                        ...(filters.fechaHasta ? { lte: filters.fechaHasta } : {}),
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
        const scope = (0, documento_scope_util_1.documentoVisibilityWhere)(viewer);
        const where = scope
            ? { AND: [baseWhere, scope] }
            : baseWhere;
        const [total, items] = await this.prisma.$transaction([
            this.prisma.documento.count({ where }),
            this.prisma.documento.findMany({
                where,
                include: includeCatalogos,
                orderBy,
                skip,
                take: pageSize,
            }),
        ]);
        return { page, pageSize, total, items };
    }
    async findOne(id, viewer) {
        const row = await this.loadDocumentoById(id);
        (0, documento_scope_util_1.assertUsuarioPuedeVerDocumento)(row, viewer);
        return row;
    }
    async assertTipoDocumentalExists(id) {
        const t = await this.prisma.tipoDocumental.findUnique({ where: { id } });
        if (!t) {
            throw new common_1.BadRequestException('Tipo documental no encontrado');
        }
    }
    async assertSubserieExists(id) {
        const s = await this.prisma.subserie.findUnique({ where: { id } });
        if (!s) {
            throw new common_1.BadRequestException('Subserie no encontrada');
        }
    }
    async assertDependenciaExists(id) {
        const d = await this.prisma.dependencia.findUnique({ where: { id } });
        if (!d) {
            throw new common_1.BadRequestException('Dependencia no encontrada');
        }
        if (!d.activo) {
            throw new common_1.BadRequestException('Dependencia inactiva');
        }
    }
    async create(dto, createdById) {
        await this.assertTipoDocumentalExists(dto.tipoDocumentalId);
        await this.assertSubserieExists(dto.subserieId);
        const creator = await this.prisma.user.findUnique({
            where: { id: createdById },
            select: { dependenciaId: true },
        });
        if (dto.dependenciaId) {
            await this.assertDependenciaExists(dto.dependenciaId);
        }
        const dependenciaId = dto.dependenciaId ?? creator?.dependenciaId ?? null;
        const nivelConfidencialidad = dto.nivelConfidencialidad ?? 'INTERNO';
        const estadoInicial = (0, documento_estado_util_1.normalizeDocumentoEstado)(dto.estado ?? 'REGISTRADO');
        (0, documento_estado_util_1.assertEstadoCreacionPermitido)(estadoInicial);
        const codigo = dto.codigo.trim().toUpperCase();
        const fechaDocumento = new Date(dto.fechaDocumento);
        try {
            const created = await this.prisma.$transaction(async (tx) => {
                const documento = await tx.documento.create({
                    data: {
                        codigo,
                        asunto: dto.asunto.trim(),
                        descripcion: dto.descripcion?.trim() || null,
                        fechaDocumento,
                        tipoDocumentalId: dto.tipoDocumentalId,
                        subserieId: dto.subserieId,
                        dependenciaId,
                        nivelConfidencialidad,
                        estado: estadoInicial,
                        createdById,
                    },
                    include: includeCatalogos,
                });
                const snapshot = {
                    codigo: documento.codigo,
                    asunto: documento.asunto,
                    descripcion: documento.descripcion,
                    fechaDocumento: documento.fechaDocumento,
                    estado: documento.estado,
                    nivelConfidencialidad: documento.nivelConfidencialidad,
                    activo: documento.activo,
                    tipoDocumentalId: documento.tipoDocumentalId,
                    subserieId: documento.subserieId,
                    dependenciaId: documento.dependenciaId,
                    createdById: documento.createdById,
                };
                await tx.documentoEvento.create({
                    data: {
                        documentoId: documento.id,
                        tipo: 'CREADO',
                        cambiosJson: JSON.stringify({ snapshot }),
                        createdById,
                    },
                });
                return documento;
            });
            return created;
        }
        catch (e) {
            if ((0, prisma_util_1.isPrismaCode)(e, 'P2002')) {
                throw new common_1.ConflictException('Ya existe un documento con ese código');
            }
            throw e;
        }
    }
    async findEventos(documentoId, viewer) {
        const doc = await this.loadDocumentoById(documentoId);
        (0, documento_scope_util_1.assertUsuarioPuedeVerDocumento)(doc, viewer);
        return this.prisma.documentoEvento.findMany({
            where: { documentoId },
            orderBy: [{ createdAt: 'desc' }],
            include: {
                createdBy: { select: { id: true, email: true } },
            },
        });
    }
    async findArchivos(documentoId, viewer) {
        const doc = await this.loadDocumentoById(documentoId);
        (0, documento_scope_util_1.assertUsuarioPuedeVerDocumento)(doc, viewer);
        return this.prisma.documentoArchivo.findMany({
            where: { documentoId, activo: true },
            orderBy: [{ createdAt: 'desc' }],
            select: {
                id: true,
                version: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                sha256: true,
                createdAt: true,
                createdBy: { select: { id: true, email: true } },
            },
        });
    }
    allowedMimes() {
        return new Set([
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
    sanitizeName(name) {
        const base = name.trim().replace(/[/\\?%*:|"<>]/g, '_');
        const safe = base.replace(/[^\w.\- ()]/g, '_');
        return safe.length > 120 ? safe.slice(-120) : safe;
    }
    storageRootAbs() {
        return path_1.default.resolve(process.cwd(), '..', 'storage');
    }
    async uploadArchivo(documentoId, file, createdById, ctx) {
        const docBase = await this.loadDocumentoById(documentoId);
        if ((0, documento_estado_util_1.normalizeDocumentoEstado)(docBase.estado) === 'ARCHIVADO') {
            throw new common_1.BadRequestException('No se pueden cargar archivos en un documento archivado');
        }
        if (!file) {
            throw new common_1.BadRequestException('Archivo requerido (campo multipart: file)');
        }
        if (!file.mimetype || !this.allowedMimes().has(file.mimetype)) {
            throw new common_1.BadRequestException(`Tipo de archivo no permitido (${file.mimetype || 'desconocido'})`);
        }
        if (!file.buffer || !file.buffer.length) {
            throw new common_1.BadRequestException('Archivo vacío');
        }
        const safeOriginal = this.sanitizeName(file.originalname || 'archivo');
        const nextVersion = (await this.prisma.documentoArchivo.aggregate({
            where: { documentoId, originalName: safeOriginal },
            _max: { version: true },
        }))._max.version ?? 0;
        const version = nextVersion + 1;
        const archivoId = crypto_1.default.randomUUID();
        const storedName = `${archivoId}_${safeOriginal}`;
        const relDir = path_1.default.posix.join('documentos', documentoId);
        const pathRel = path_1.default.posix.join(relDir, storedName);
        const sha256 = crypto_1.default
            .createHash('sha256')
            .update(file.buffer)
            .digest('hex');
        const sizeBytes = file.size ?? file.buffer.length;
        const absDir = path_1.default.join(this.storageRootAbs(), 'documentos', documentoId);
        const absPath = path_1.default.join(absDir, storedName);
        await promises_1.default.mkdir(absDir, { recursive: true });
        await promises_1.default.writeFile(absPath, file.buffer);
        try {
            const created = await this.prisma.$transaction(async (tx) => {
                const row = await tx.documentoArchivo.create({
                    data: {
                        id: archivoId,
                        documentoId,
                        version,
                        originalName: safeOriginal,
                        storedName,
                        mimeType: file.mimetype,
                        sizeBytes,
                        sha256,
                        pathRel,
                        createdById,
                    },
                    select: {
                        id: true,
                        version: true,
                        originalName: true,
                        mimeType: true,
                        sizeBytes: true,
                        sha256: true,
                        createdAt: true,
                        createdBy: { select: { id: true, email: true } },
                    },
                });
                await tx.documentoArchivoEvento.create({
                    data: {
                        documentoArchivoId: row.id,
                        tipo: 'SUBIDO',
                        metaJson: JSON.stringify({
                            originalName: row.originalName,
                            version: row.version,
                            mimeType: row.mimeType,
                            sizeBytes: row.sizeBytes,
                            sha256: row.sha256,
                        }),
                        createdById,
                    },
                });
                return row;
            });
            await this.audit.log({
                action: 'DOC_FILE_UPLOADED',
                result: 'OK',
                resource: { type: 'DocumentoArchivo', id: created.id },
                context: {
                    actorUserId: ctx?.actorUserId ?? createdById,
                    actorEmail: ctx?.actorEmail ?? null,
                    ip: ctx?.ip ?? null,
                    userAgent: ctx?.userAgent ?? null,
                    correlationId: ctx?.correlationId ?? null,
                },
                meta: {
                    documentoId,
                    version: created.version,
                    mimeType: created.mimeType,
                },
            });
            return created;
        }
        catch (e) {
            await promises_1.default.unlink(absPath).catch(() => undefined);
            await this.audit.log({
                action: 'DOC_FILE_UPLOADED',
                result: 'FAIL',
                resource: { type: 'Documento', id: documentoId },
                context: {
                    actorUserId: ctx?.actorUserId ?? createdById,
                    actorEmail: ctx?.actorEmail ?? null,
                    ip: ctx?.ip ?? null,
                    userAgent: ctx?.userAgent ?? null,
                    correlationId: ctx?.correlationId ?? null,
                },
            });
            throw e;
        }
    }
    async prepareDownloadArchivo(documentoId, archivoId, viewer, ip, ctx) {
        const doc = await this.loadDocumentoById(documentoId);
        (0, documento_scope_util_1.assertUsuarioPuedeVerDocumento)(doc, viewer);
        const userId = viewer.id;
        const row = await this.prisma.documentoArchivo.findFirst({
            where: { id: archivoId, documentoId, activo: true },
        });
        if (!row) {
            throw new common_1.NotFoundException('Archivo no encontrado');
        }
        const absPath = path_1.default.join(this.storageRootAbs(), ...row.pathRel.split('/'));
        try {
            await promises_1.default.stat(absPath);
        }
        catch {
            throw new common_1.NotFoundException('Archivo físico no disponible');
        }
        await this.prisma.documentoArchivoEvento.create({
            data: {
                documentoArchivoId: row.id,
                tipo: 'DESCARGADO',
                metaJson: JSON.stringify({ ip }),
                createdById: userId,
            },
        });
        await this.audit.log({
            action: 'DOC_FILE_DOWNLOADED',
            result: 'OK',
            resource: { type: 'DocumentoArchivo', id: row.id },
            context: {
                actorUserId: ctx?.actorUserId ?? userId,
                actorEmail: ctx?.actorEmail ?? null,
                ip: ctx?.ip ?? ip,
                userAgent: ctx?.userAgent ?? null,
                correlationId: ctx?.correlationId ?? null,
            },
            meta: { documentoId, mimeType: row.mimeType },
        });
        return {
            absPath,
            downloadName: row.originalName,
            mimeType: row.mimeType,
        };
    }
    async deleteArchivo(documentoId, archivoId, deletedById, ctx) {
        const docBase = await this.loadDocumentoById(documentoId);
        if ((0, documento_estado_util_1.normalizeDocumentoEstado)(docBase.estado) === 'ARCHIVADO') {
            throw new common_1.BadRequestException('No se pueden eliminar archivos en un documento archivado');
        }
        const row = await this.prisma.documentoArchivo.findFirst({
            where: { id: archivoId, documentoId, activo: true },
            select: { id: true, originalName: true, version: true },
        });
        if (!row) {
            throw new common_1.NotFoundException('Archivo no encontrado');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.documentoArchivo.update({
                where: { id: row.id },
                data: { activo: false },
            });
            await tx.documentoArchivoEvento.create({
                data: {
                    documentoArchivoId: row.id,
                    tipo: 'ELIMINADO',
                    metaJson: JSON.stringify({
                        originalName: row.originalName,
                        version: row.version,
                    }),
                    createdById: deletedById,
                },
            });
        });
        await this.audit.log({
            action: 'DOC_FILE_DELETED',
            result: 'OK',
            resource: { type: 'DocumentoArchivo', id: row.id },
            context: {
                actorUserId: ctx?.actorUserId ?? deletedById,
                actorEmail: ctx?.actorEmail ?? null,
                ip: ctx?.ip ?? null,
                userAgent: ctx?.userAgent ?? null,
                correlationId: ctx?.correlationId ?? null,
            },
            meta: { documentoId, version: row.version },
        });
        return { ok: true };
    }
    async findArchivoEventos(documentoId, archivoId, viewer) {
        const doc = await this.loadDocumentoById(documentoId);
        (0, documento_scope_util_1.assertUsuarioPuedeVerDocumento)(doc, viewer);
        const exists = await this.prisma.documentoArchivo.findFirst({
            where: { id: archivoId, documentoId },
            select: { id: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException('Archivo no encontrado');
        }
        return this.prisma.documentoArchivoEvento.findMany({
            where: { documentoArchivoId: archivoId },
            orderBy: [{ createdAt: 'desc' }],
            include: { createdBy: { select: { id: true, email: true } } },
        });
    }
    async aplicarCambioEstadoSoloEstado(beforeFull, nuevoEstado, actorId, ctx, workflowAudit) {
        const id = beforeFull.id;
        (0, documento_estado_util_1.assertTransicionEstado)(beforeFull.estado, nuevoEstado);
        const updated = await this.prisma.$transaction(async (tx) => {
            const documento = await tx.documento.update({
                where: { id },
                data: { estado: nuevoEstado },
                include: includeCatalogos,
            });
            const before = {
                codigo: beforeFull.codigo,
                asunto: beforeFull.asunto,
                descripcion: beforeFull.descripcion,
                fechaDocumento: beforeFull.fechaDocumento,
                estado: beforeFull.estado,
                nivelConfidencialidad: beforeFull.nivelConfidencialidad,
                activo: beforeFull.activo,
                tipoDocumentalId: beforeFull.tipoDocumentalId,
                subserieId: beforeFull.subserieId,
                dependenciaId: beforeFull.dependenciaId,
                createdById: beforeFull.createdById,
            };
            const after = {
                codigo: documento.codigo,
                asunto: documento.asunto,
                descripcion: documento.descripcion,
                fechaDocumento: documento.fechaDocumento,
                estado: documento.estado,
                nivelConfidencialidad: documento.nivelConfidencialidad,
                activo: documento.activo,
                tipoDocumentalId: documento.tipoDocumentalId,
                subserieId: documento.subserieId,
                dependenciaId: documento.dependenciaId,
                createdById: documento.createdById,
            };
            const diff = this.diffDocumento(before, after);
            await tx.documentoEvento.create({
                data: {
                    documentoId: documento.id,
                    tipo: 'ACTUALIZADO',
                    cambiosJson: JSON.stringify({ diff }),
                    createdById: actorId,
                },
            });
            return documento;
        });
        const desde = (0, documento_estado_util_1.normalizeDocumentoEstado)(beforeFull.estado);
        await this.audit.log({
            action: 'DOC_STATE_CHANGED',
            result: 'OK',
            resource: { type: 'Documento', id },
            context: {
                actorUserId: ctx?.actorUserId ?? actorId,
                actorEmail: ctx?.actorEmail ?? null,
                ip: ctx?.ip ?? null,
                userAgent: ctx?.userAgent ?? null,
                correlationId: ctx?.correlationId ?? null,
            },
            meta: { from: desde, to: nuevoEstado },
        });
        if (workflowAudit) {
            await this.audit.log({
                action: workflowAudit.action,
                result: 'OK',
                resource: { type: 'Documento', id },
                context: {
                    actorUserId: ctx?.actorUserId ?? actorId,
                    actorEmail: ctx?.actorEmail ?? null,
                    ip: ctx?.ip ?? null,
                    userAgent: ctx?.userAgent ?? null,
                    correlationId: ctx?.correlationId ?? null,
                },
                meta: {
                    documentoId: id,
                    from: desde,
                    to: nuevoEstado,
                    ...workflowAudit.extraMeta,
                },
            });
        }
        return updated;
    }
    async enviarRevision(id, viewer, ctx) {
        const doc = await this.loadDocumentoById(id);
        (0, documento_scope_util_1.assertUsuarioPuedeVerDocumento)(doc, viewer);
        const puedeEnviar = (0, request_user_1.jwtUserIsAdmin)(viewer) || doc.createdById === viewer.id;
        if (!puedeEnviar) {
            throw new common_1.ForbiddenException('Solo el administrador o quien registró el documento puede enviarlo a revisión');
        }
        if ((0, documento_estado_util_1.normalizeDocumentoEstado)(doc.estado) !== 'REGISTRADO') {
            throw new common_1.BadRequestException('Solo documentos en estado REGISTRADO pueden enviarse a revisión');
        }
        return this.aplicarCambioEstadoSoloEstado(doc, 'EN_REVISION', viewer.id, ctx, { action: 'DOC_SUBMITTED_FOR_REVIEW' });
    }
    async resolverRevision(id, dto, viewer, ctx) {
        if (!(0, request_user_1.jwtUserIsAdmin)(viewer) && !(0, request_user_1.jwtUserIsRevisor)(viewer)) {
            throw new common_1.ForbiddenException('Solo un revisor o administrador puede resolver la revisión');
        }
        const doc = await this.loadDocumentoById(id);
        (0, documento_scope_util_1.assertUsuarioPuedeVerDocumento)(doc, viewer);
        if ((0, documento_estado_util_1.normalizeDocumentoEstado)(doc.estado) !== 'EN_REVISION') {
            throw new common_1.BadRequestException('Solo documentos EN_REVISION pueden resolverse');
        }
        const extraMeta = { decision: dto.decision };
        if (dto.decision === 'RECHAZADO' && dto.motivo) {
            extraMeta.motivoRechazo = dto.motivo;
        }
        return this.aplicarCambioEstadoSoloEstado(doc, dto.decision, viewer.id, ctx, {
            action: 'DOC_REVIEW_RESOLVED',
            extraMeta,
        });
    }
    diffDocumento(before, after) {
        const diff = {};
        const keys = Object.keys(before);
        for (const k of keys) {
            const a = before[k];
            const b = after[k];
            const changed = a instanceof Date && b instanceof Date
                ? a.getTime() !== b.getTime()
                : a !== b;
            if (changed) {
                diff[k] = {
                    from: a instanceof Date ? a.toISOString() : a,
                    to: b instanceof Date ? b.toISOString() : b,
                };
            }
        }
        return diff;
    }
    async update(id, dto, updatedById, ctx) {
        const beforeFull = await this.loadDocumentoById(id);
        const estadoPrevio = (0, documento_estado_util_1.normalizeDocumentoEstado)(beforeFull.estado);
        if (estadoPrevio === 'ARCHIVADO') {
            const intentaCambiarMetadatosOEstado = dto.asunto !== undefined ||
                dto.descripcion !== undefined ||
                dto.fechaDocumento !== undefined ||
                dto.tipoDocumentalId !== undefined ||
                dto.subserieId !== undefined ||
                dto.estado !== undefined ||
                dto.dependenciaId !== undefined ||
                dto.nivelConfidencialidad !== undefined;
            if (intentaCambiarMetadatosOEstado) {
                throw new common_1.BadRequestException('Documento archivado: solo puede modificarse el indicador de registro activo.');
            }
        }
        if (dto.estado !== undefined) {
            (0, documento_estado_util_1.assertTransicionEstado)(beforeFull.estado, (0, documento_estado_util_1.normalizeDocumentoEstado)(dto.estado.trim()));
        }
        if (dto.tipoDocumentalId !== undefined) {
            await this.assertTipoDocumentalExists(dto.tipoDocumentalId);
        }
        if (dto.subserieId !== undefined) {
            await this.assertSubserieExists(dto.subserieId);
        }
        if (dto.dependenciaId !== undefined) {
            if (dto.dependenciaId === null) {
            }
            else {
                await this.assertDependenciaExists(dto.dependenciaId);
            }
        }
        if (dto.asunto === undefined &&
            dto.descripcion === undefined &&
            dto.fechaDocumento === undefined &&
            dto.tipoDocumentalId === undefined &&
            dto.subserieId === undefined &&
            dto.estado === undefined &&
            dto.activo === undefined &&
            dto.dependenciaId === undefined &&
            dto.nivelConfidencialidad === undefined) {
            return this.loadDocumentoById(id);
        }
        try {
            const updated = await this.prisma.$transaction(async (tx) => {
                const documento = await tx.documento.update({
                    where: { id },
                    data: {
                        ...(dto.asunto !== undefined && { asunto: dto.asunto.trim() }),
                        ...(dto.descripcion !== undefined && {
                            descripcion: dto.descripcion === null || dto.descripcion === ''
                                ? null
                                : dto.descripcion.trim(),
                        }),
                        ...(dto.fechaDocumento !== undefined && {
                            fechaDocumento: new Date(dto.fechaDocumento),
                        }),
                        ...(dto.tipoDocumentalId !== undefined && {
                            tipoDocumentalId: dto.tipoDocumentalId,
                        }),
                        ...(dto.subserieId !== undefined && { subserieId: dto.subserieId }),
                        ...(dto.estado !== undefined && {
                            estado: (0, documento_estado_util_1.normalizeDocumentoEstado)(dto.estado.trim()),
                        }),
                        ...(dto.activo !== undefined && { activo: dto.activo }),
                        ...(dto.dependenciaId !== undefined && {
                            dependenciaId: dto.dependenciaId,
                        }),
                        ...(dto.nivelConfidencialidad !== undefined && {
                            nivelConfidencialidad: dto.nivelConfidencialidad,
                        }),
                    },
                    include: includeCatalogos,
                });
                const before = {
                    codigo: beforeFull.codigo,
                    asunto: beforeFull.asunto,
                    descripcion: beforeFull.descripcion,
                    fechaDocumento: beforeFull.fechaDocumento,
                    estado: beforeFull.estado,
                    nivelConfidencialidad: beforeFull.nivelConfidencialidad,
                    activo: beforeFull.activo,
                    tipoDocumentalId: beforeFull.tipoDocumentalId,
                    subserieId: beforeFull.subserieId,
                    dependenciaId: beforeFull.dependenciaId,
                    createdById: beforeFull.createdById,
                };
                const after = {
                    codigo: documento.codigo,
                    asunto: documento.asunto,
                    descripcion: documento.descripcion,
                    fechaDocumento: documento.fechaDocumento,
                    estado: documento.estado,
                    nivelConfidencialidad: documento.nivelConfidencialidad,
                    activo: documento.activo,
                    tipoDocumentalId: documento.tipoDocumentalId,
                    subserieId: documento.subserieId,
                    dependenciaId: documento.dependenciaId,
                    createdById: documento.createdById,
                };
                const diff = this.diffDocumento(before, after);
                await tx.documentoEvento.create({
                    data: {
                        documentoId: documento.id,
                        tipo: 'ACTUALIZADO',
                        cambiosJson: JSON.stringify({ diff }),
                        createdById: updatedById,
                    },
                });
                return documento;
            });
            if (dto.estado !== undefined) {
                const desde = estadoPrevio;
                const hasta = (0, documento_estado_util_1.normalizeDocumentoEstado)(dto.estado.trim());
                if (desde !== hasta) {
                    await this.audit.log({
                        action: 'DOC_STATE_CHANGED',
                        result: 'OK',
                        resource: { type: 'Documento', id },
                        context: {
                            actorUserId: ctx?.actorUserId ?? updatedById,
                            actorEmail: ctx?.actorEmail ?? null,
                            ip: ctx?.ip ?? null,
                            userAgent: ctx?.userAgent ?? null,
                            correlationId: ctx?.correlationId ?? null,
                        },
                        meta: { from: desde, to: hasta },
                    });
                }
            }
            return updated;
        }
        catch (e) {
            if ((0, prisma_util_1.isPrismaCode)(e, 'P2025')) {
                throw new common_1.NotFoundException('Documento no encontrado');
            }
            throw e;
        }
    }
};
exports.DocumentosService = DocumentosService;
exports.DocumentosService = DocumentosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], DocumentosService);
//# sourceMappingURL=documentos.service.js.map