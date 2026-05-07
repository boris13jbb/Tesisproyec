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
exports.ThrottlerAuditFilter = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const audit_service_1 = require("../../auditoria/audit.service");
let ThrottlerAuditFilter = class ThrottlerAuditFilter {
    audit;
    constructor(audit) {
        this.audit = audit;
    }
    catch(_exception, host) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();
        void this.audit.log({
            action: 'AUTH_RATE_LIMITED',
            result: 'FAIL',
            context: {
                actorUserId: req.user?.id ?? null,
                actorEmail: req.user?.email ?? null,
                ip: req.ip ?? null,
                userAgent: req.headers['user-agent'] ?? null,
            },
            meta: { method: req.method, path: req.originalUrl },
        });
        return res.status(common_1.HttpStatus.TOO_MANY_REQUESTS).json({
            statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
            message: 'Demasiados intentos. Intenta más tarde.',
        });
    }
};
exports.ThrottlerAuditFilter = ThrottlerAuditFilter;
exports.ThrottlerAuditFilter = ThrottlerAuditFilter = __decorate([
    (0, common_1.Catch)(throttler_1.ThrottlerException),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], ThrottlerAuditFilter);
//# sourceMappingURL=throttler-audit.filter.js.map