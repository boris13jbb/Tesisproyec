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
exports.ForbiddenAuditFilter = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../auditoria/audit.service");
let ForbiddenAuditFilter = class ForbiddenAuditFilter {
    audit;
    constructor(audit) {
        this.audit = audit;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();
        const u = req
            .user;
        void this.audit.log({
            action: 'AUTHZ_FORBIDDEN',
            result: 'FAIL',
            resource: { type: 'HttpRoute', id: null },
            context: {
                actorUserId: u?.id ?? null,
                actorEmail: u?.email ?? null,
                ip: req.ip ?? null,
                userAgent: typeof req.headers['user-agent'] === 'string'
                    ? req.headers['user-agent']
                    : null,
            },
            meta: {
                method: req.method,
                path: req.originalUrl ?? req.url,
            },
        });
        return res.status(common_1.HttpStatus.FORBIDDEN).json(exception.getResponse());
    }
};
exports.ForbiddenAuditFilter = ForbiddenAuditFilter;
exports.ForbiddenAuditFilter = ForbiddenAuditFilter = __decorate([
    (0, common_1.Catch)(common_1.ForbiddenException),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], ForbiddenAuditFilter);
//# sourceMappingURL=forbidden-audit.filter.js.map