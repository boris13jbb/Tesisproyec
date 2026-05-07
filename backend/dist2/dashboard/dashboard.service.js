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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const request_user_1 = require("../auth/request-user");
const documento_scope_util_1 = require("../documentos/documento-scope.util");
function clampPercent(n) {
    if (!Number.isFinite(n))
        return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
}
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(viewer) {
        const isAdmin = (0, request_user_1.jwtUserIsAdmin)(viewer);
        const vis = (0, documento_scope_util_1.documentoVisibilityWhere)(viewer);
        const docWhere = vis ? { AND: [{ activo: true }, vis] } : { activo: true };
        const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [documentosTotal, pendientesRevision, docsRecent, usuariosActivos, activeUsers, activeUsersWithRole, loginOk30d, loginFail30d, authzForbidden30d, totalAudit30d, docsWithEvents30d, docOk30d, docFail30d, lastAudit, lastLoginOk,] = await Promise.all([
            this.prisma.documento.count({ where: docWhere }),
            this.prisma.documento.count({ where: { ...docWhere, estado: 'EN_REVISION' } }),
            this.prisma.documento.findMany({
                where: docWhere,
                orderBy: [{ fechaDocumento: 'desc' }, { createdAt: 'desc' }],
                take: 5,
                select: { id: true, codigo: true, asunto: true, estado: true, fechaDocumento: true },
            }),
            isAdmin
                ? this.prisma.user.count({ where: { activo: true } })
                : Promise.resolve(null),
            isAdmin ? this.prisma.user.count({ where: { activo: true } }) : Promise.resolve(null),
            isAdmin
                ? this.prisma.user.count({
                    where: { activo: true, roles: { some: { role: { activo: true } } } },
                })
                : Promise.resolve(null),
            this.prisma.auditLog.count({
                where: { action: 'AUTH_LOGIN_OK', createdAt: { gte: since30d } },
            }),
            this.prisma.auditLog.count({
                where: { action: 'AUTH_LOGIN_FAIL', createdAt: { gte: since30d } },
            }),
            this.prisma.auditLog.count({
                where: { action: 'AUTHZ_FORBIDDEN', createdAt: { gte: since30d } },
            }),
            this.prisma.auditLog.count({ where: { createdAt: { gte: since30d } } }),
            this.prisma.documento.count({
                where: {
                    ...docWhere,
                    eventos: { some: { createdAt: { gte: since30d } } },
                },
            }),
            this.prisma.auditLog.count({
                where: { action: { startsWith: 'DOC_' }, result: 'OK', createdAt: { gte: since30d } },
            }),
            this.prisma.auditLog.count({
                where: { action: { startsWith: 'DOC_' }, result: 'FAIL', createdAt: { gte: since30d } },
            }),
            this.prisma.auditLog.findFirst({
                orderBy: [{ createdAt: 'desc' }],
                select: { createdAt: true },
            }),
            this.prisma.auditLog.findFirst({
                where: { action: 'AUTH_LOGIN_OK' },
                orderBy: [{ createdAt: 'desc' }],
                select: { createdAt: true },
            }),
        ]);
        const loginTotal = loginOk30d + loginFail30d;
        const authSuccessPercent = loginTotal > 0 ? (loginOk30d / loginTotal) * 100 : 0;
        const accessTotal = totalAudit30d;
        const accessControlPercent = accessTotal > 0 ? (1 - authzForbidden30d / accessTotal) * 100 : 0;
        const identityPercent = isAdmin && (activeUsers ?? 0) > 0
            ? ((activeUsersWithRole ?? 0) / (activeUsers ?? 1)) * 100
            : 0;
        const traceabilityPercent = documentosTotal > 0 ? (docsWithEvents30d / documentosTotal) * 100 : 0;
        const docTotalActions = docOk30d + docFail30d;
        const inputValidationPercent = docTotalActions > 0 ? (docOk30d / docTotalActions) * 100 : 0;
        const alerts = (pendientesRevision > 0 ? 1 : 0) +
            (authzForbidden30d > 0 ? 1 : 0) +
            (loginFail30d > 0 ? 1 : 0);
        const compliance = [
            {
                key: 'access_control',
                title: 'Control de acceso',
                standard: 'ISO 27001 — R-30',
                percent: clampPercent(accessControlPercent),
                evidence: {
                    audit_total_30d: accessTotal,
                    authz_forbidden_30d: authzForbidden30d,
                },
            },
            {
                key: 'identity_management',
                title: 'Gestión de identidades',
                standard: 'ISO 27001 — roles activos',
                percent: clampPercent(identityPercent),
                evidence: {
                    users_active: activeUsers ?? 0,
                    users_active_with_role: activeUsersWithRole ?? 0,
                },
            },
            {
                key: 'authentication_information',
                title: 'Información de autenticación',
                standard: 'ASVS V2 — tasa de login OK (30d)',
                percent: clampPercent(authSuccessPercent),
                evidence: {
                    auth_login_ok_30d: loginOk30d,
                    auth_login_fail_30d: loginFail30d,
                },
            },
            {
                key: 'document_traceability',
                title: 'Trazabilidad documental',
                standard: 'ISO 15489 — eventos (30d)',
                percent: clampPercent(traceabilityPercent),
                evidence: {
                    documentos_total: documentosTotal,
                    documentos_con_eventos_30d: docsWithEvents30d,
                },
            },
            {
                key: 'input_validation',
                title: 'Validación de entradas',
                standard: 'ASVS V5 — DOC_* OK/FAIL (30d)',
                percent: clampPercent(inputValidationPercent),
                evidence: {
                    doc_actions_ok_30d: docOk30d,
                    doc_actions_fail_30d: docFail30d,
                },
            },
        ];
        return {
            generatedAt: new Date().toISOString(),
            kpis: {
                documentosTotal,
                pendientesRevision,
                usuariosActivos: usuariosActivos ?? null,
                alertas: alerts,
            },
            documentosRecientes: docsRecent.map((d) => ({
                id: d.id,
                codigo: d.codigo,
                asunto: d.asunto,
                estado: d.estado,
                fechaDocumento: d.fechaDocumento.toISOString(),
            })),
            compliance,
            lastSignals: {
                lastAuditAt: lastAudit?.createdAt?.toISOString() ?? null,
                lastLoginOkAt: lastLoginOk?.createdAt?.toISOString() ?? null,
            },
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map