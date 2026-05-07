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
exports.TiposDocumentalesController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const create_tipo_documental_dto_1 = require("./dto/create-tipo-documental.dto");
const update_tipo_documental_dto_1 = require("./dto/update-tipo-documental.dto");
const tipos_documentales_service_1 = require("./tipos-documentales.service");
let TiposDocumentalesController = class TiposDocumentalesController {
    service;
    constructor(service) {
        this.service = service;
    }
    findAll(incluirInactivos) {
        const todos = incluirInactivos === 'true' || incluirInactivos === '1';
        return this.service.findAll(todos);
    }
    findOne(id) {
        return this.service.findOne(id);
    }
    create(dto) {
        return this.service.create(dto);
    }
    update(id, dto) {
        return this.service.update(id, dto);
    }
};
exports.TiposDocumentalesController = TiposDocumentalesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('incluirInactivos')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TiposDocumentalesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TiposDocumentalesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tipo_documental_dto_1.CreateTipoDocumentalDto]),
    __metadata("design:returntype", void 0)
], TiposDocumentalesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_tipo_documental_dto_1.UpdateTipoDocumentalDto]),
    __metadata("design:returntype", void 0)
], TiposDocumentalesController.prototype, "update", null);
exports.TiposDocumentalesController = TiposDocumentalesController = __decorate([
    (0, common_1.Controller)('tipos-documentales'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [tipos_documentales_service_1.TiposDocumentalesService])
], TiposDocumentalesController);
//# sourceMappingURL=tipos-documentales.controller.js.map