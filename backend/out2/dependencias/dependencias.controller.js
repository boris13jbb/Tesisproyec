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
exports.DependenciasController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const dependencias_service_1 = require("./dependencias.service");
const create_dependencia_dto_1 = require("./dto/create-dependencia.dto");
const update_dependencia_dto_1 = require("./dto/update-dependencia.dto");
let DependenciasController = class DependenciasController {
    dependenciasService;
    constructor(dependenciasService) {
        this.dependenciasService = dependenciasService;
    }
    findAll(incluirInactivos) {
        const todos = incluirInactivos === 'true' || incluirInactivos === '1';
        return this.dependenciasService.findAll(todos);
    }
    findOne(id) {
        return this.dependenciasService.findOne(id);
    }
    create(dto) {
        return this.dependenciasService.create(dto);
    }
    update(id, dto) {
        return this.dependenciasService.update(id, dto);
    }
};
exports.DependenciasController = DependenciasController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('incluirInactivos')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DependenciasController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DependenciasController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_dependencia_dto_1.CreateDependenciaDto]),
    __metadata("design:returntype", void 0)
], DependenciasController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_dependencia_dto_1.UpdateDependenciaDto]),
    __metadata("design:returntype", void 0)
], DependenciasController.prototype, "update", null);
exports.DependenciasController = DependenciasController = __decorate([
    (0, common_1.Controller)('dependencias'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [dependencias_service_1.DependenciasService])
], DependenciasController);
//# sourceMappingURL=dependencias.controller.js.map