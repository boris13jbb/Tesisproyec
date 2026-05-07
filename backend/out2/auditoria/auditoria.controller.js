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
exports.AuditoriaController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_query_dto_1 = require("./dto/audit-query.dto");
let AuditoriaController = class AuditoriaController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(q) {
        const page = Math.max(1, Number(q.page ?? '1'));
        const pageSize = Math.min(100, Math.max(5, Number(q.pageSize ?? '20')));
        const skip = (page - 1) * pageSize;
        const from = q.from ? new Date(q.from) : undefined;
        const to = q.to ? new Date(q.to) : undefined;
        const where = {
            ...(q.action ? { action: { contains: q.action.trim() } } : {}),
            ...(q.result ? { result: q.result } : {}),
            ...(q.actorEmail
                ? { actorEmail: { contains: q.actorEmail.trim() } }
                : {}),
            ...(q.resourceType ? { resourceType: q.resourceType.trim() } : {}),
            ...(q.resourceId ? { resourceId: q.resourceId.trim() } : {}),
            ...(from || to
                ? {
                    createdAt: {
                        ...(from ? { gte: from } : {}),
                        ...(to ? { lte: to } : {}),
                    },
                }
                : {}),
        };
        const [total, items] = await this.prisma.$transaction([
            this.prisma.auditLog.count({ where }),
            this.prisma.auditLog.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }],
                skip,
                take: pageSize,
            }),
        ]);
        return { page, pageSize, total, items };
    }
};
exports.AuditoriaController = AuditoriaController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_query_dto_1.AuditQueryDto]),
    __metadata("design:returntype", Promise)
], AuditoriaController.prototype, "findAll", null);
exports.AuditoriaController = AuditoriaController = __decorate([
    (0, common_1.Controller)('auditoria'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditoriaController);
//# sourceMappingURL=auditoria.controller.js.map