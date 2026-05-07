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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentosController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const create_documento_dto_1 = require("./dto/create-documento.dto");
const resolver_revision_dto_1 = require("./dto/resolver-revision.dto");
const update_documento_dto_1 = require("./dto/update-documento.dto");
const documentos_service_1 = require("./documentos.service");
let DocumentosController = class DocumentosController {
    service;
    constructor(service) {
        this.service = service;
    }
    findAll(req, incluirInactivos, q, archivoNombre, archivoMime, archivoSha256, estado, tipoDocumentalId, serieId, subserieId, fechaDesde, fechaHasta, sortBy, sortDir, page, pageSize) {
        const todos = incluirInactivos === 'true' || incluirInactivos === '1';
        return this.service.findAll(req.user, todos, {
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
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined,
        });
    }
    findOne(id, req) {
        return this.service.findOne(id, req.user);
    }
    create(dto, req) {
        const createdById = req.user?.id;
        if (!createdById) {
            throw new common_1.InternalServerErrorException('Usuario no disponible en request');
        }
        return this.service.create(dto, createdById);
    }
    findEventos(id, req) {
        return this.service.findEventos(id, req.user);
    }
    findArchivos(id, req) {
        return this.service.findArchivos(id, req.user);
    }
    uploadArchivo(id, req, file) {
        const createdById = req.user?.id;
        if (!createdById) {
            throw new common_1.InternalServerErrorException('Usuario no disponible en request');
        }
        return this.service.uploadArchivo(id, file, createdById, {
            actorUserId: createdById,
            actorEmail: req.user?.email ?? null,
            ip: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        });
    }
    async downloadArchivo(id, archivoId, req, res) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.InternalServerErrorException('Usuario no disponible en request');
        }
        const { absPath, downloadName, mimeType } = await this.service.prepareDownloadArchivo(id, archivoId, req.user, req.ip ?? null, {
            actorUserId: userId,
            actorEmail: req.user?.email ?? null,
            ip: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        });
        res.setHeader('Content-Type', mimeType);
        return res.download(absPath, downloadName);
    }
    findArchivoEventos(id, archivoId, req) {
        return this.service.findArchivoEventos(id, archivoId, req.user);
    }
    enviarRevision(id, req) {
        const ua = req.headers['user-agent'];
        return this.service.enviarRevision(id, req.user, {
            actorUserId: req.user.id,
            actorEmail: req.user.email,
            ip: req.ip ?? null,
            userAgent: typeof ua === 'string' ? ua : null,
        });
    }
    resolverRevision(id, dto, req) {
        const ua = req.headers['user-agent'];
        return this.service.resolverRevision(id, dto, req.user, {
            actorUserId: req.user.id,
            actorEmail: req.user.email,
            ip: req.ip ?? null,
            userAgent: typeof ua === 'string' ? ua : null,
        });
    }
    deleteArchivo(id, archivoId, req) {
        const deletedById = req.user?.id;
        if (!deletedById) {
            throw new common_1.InternalServerErrorException('Usuario no disponible en request');
        }
        return this.service.deleteArchivo(id, archivoId, deletedById, {
            actorUserId: deletedById,
            actorEmail: req.user?.email ?? null,
            ip: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        });
    }
    update(id, dto, req) {
        const updatedById = req.user?.id;
        if (!updatedById) {
            throw new common_1.InternalServerErrorException('Usuario no disponible en request');
        }
        const ua = req.headers['user-agent'];
        return this.service.update(id, dto, updatedById, {
            actorUserId: updatedById,
            actorEmail: req.user?.email ?? null,
            ip: req.ip ?? null,
            userAgent: typeof ua === 'string' ? ua : null,
        });
    }
};
exports.DocumentosController = DocumentosController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('incluirInactivos')),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('archivoNombre')),
    __param(4, (0, common_1.Query)('archivoMime')),
    __param(5, (0, common_1.Query)('archivoSha256')),
    __param(6, (0, common_1.Query)('estado')),
    __param(7, (0, common_1.Query)('tipoDocumentalId')),
    __param(8, (0, common_1.Query)('serieId')),
    __param(9, (0, common_1.Query)('subserieId')),
    __param(10, (0, common_1.Query)('fechaDesde')),
    __param(11, (0, common_1.Query)('fechaHasta')),
    __param(12, (0, common_1.Query)('sortBy')),
    __param(13, (0, common_1.Query)('sortDir')),
    __param(14, (0, common_1.Query)('page')),
    __param(15, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_documento_dto_1.CreateDocumentoDto, Object]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id/eventos'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "findEventos", null);
__decorate([
    (0, common_1.Get)(':id/archivos'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "findArchivos", null);
__decorate([
    (0, common_1.Post)(':id/archivos'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "uploadArchivo", null);
__decorate([
    (0, common_1.Get)(':id/archivos/:archivoId/download'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('archivoId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentosController.prototype, "downloadArchivo", null);
__decorate([
    (0, common_1.Get)(':id/archivos/:archivoId/eventos'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('archivoId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "findArchivoEventos", null);
__decorate([
    (0, common_1.Post)(':id/enviar-revision'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "enviarRevision", null);
__decorate([
    (0, common_1.Post)(':id/resolver-revision'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'REVISOR'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, resolver_revision_dto_1.ResolverRevisionDto, Object]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "resolverRevision", null);
__decorate([
    (0, common_1.Delete)(':id/archivos/:archivoId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('archivoId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "deleteArchivo", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_documento_dto_1.UpdateDocumentoDto, Object]),
    __metadata("design:returntype", void 0)
], DocumentosController.prototype, "update", null);
exports.DocumentosController = DocumentosController = __decorate([
    (0, common_1.Controller)('documentos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [documentos_service_1.DocumentosService])
], DocumentosController);
//# sourceMappingURL=documentos.controller.js.map