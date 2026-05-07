"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const argon2 = __importStar(require("argon2"));
const crypto_1 = require("crypto");
const audit_service_1 = require("../auditoria/audit.service");
const mail_service_1 = require("../mail/mail.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    config;
    audit;
    mail;
    constructor(prisma, jwtService, config, audit, mail) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
        this.audit = audit;
        this.mail = mail;
    }
    buildPasswordResetUrl(rawToken) {
        const explicit = this.config.get('PASSWORD_RESET_FRONTEND_URL')?.trim() ||
            this.config.get('FRONTEND_PUBLIC_URL')?.trim();
        const corsFirst = this.config
            .get('CORS_ORIGIN')
            ?.split(',')[0]
            ?.trim();
        const base = (explicit || corsFirst || 'http://localhost:5173').replace(/\/$/, '');
        const pathRaw = this.config.get('PASSWORD_RESET_PATH')?.trim() ?? '/restablecer';
        const path = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
        return `${base}${path}?token=${encodeURIComponent(rawToken)}`;
    }
    hashRefresh(raw) {
        return (0, crypto_1.createHash)('sha256').update(raw, 'utf8').digest('hex');
    }
    hashOpaqueToken(raw) {
        return (0, crypto_1.createHash)('sha256').update(raw, 'utf8').digest('hex');
    }
    accessSignOptions() {
        return {
            expiresIn: (this.config.get('JWT_ACCESS_EXPIRES') ??
                '15m'),
        };
    }
    loginLockoutMaxAttempts() {
        const n = Number(this.config.get('AUTH_LOCKOUT_MAX_ATTEMPTS', 5));
        return Number.isFinite(n) ? Math.min(30, Math.max(3, Math.floor(n))) : 5;
    }
    loginLockoutMinutes() {
        const n = Number(this.config.get('AUTH_LOCKOUT_MINUTES', 15));
        return Number.isFinite(n)
            ? Math.min(24 * 60, Math.max(5, Math.floor(n)))
            : 15;
    }
    async login(dto, client) {
        const email = dto.email.toLowerCase().trim();
        const now = new Date();
        const auditCtxBase = {
            ip: client?.ip ?? null,
            userAgent: client?.userAgent ?? null,
        };
        let user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                roles: { include: { role: true } },
            },
        });
        if (!user?.activo) {
            await this.audit.log({
                action: 'AUTH_LOGIN_FAIL',
                result: 'FAIL',
                resource: { type: 'User', id: null },
                context: { actorUserId: null, actorEmail: email, ...auditCtxBase },
                meta: { reason: 'USER_NOT_FOUND_OR_INACTIVE' },
            });
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        if (user.lockedUntil) {
            if (user.lockedUntil > now) {
                await this.audit.log({
                    action: 'AUTH_LOGIN_FAIL',
                    result: 'FAIL',
                    resource: { type: 'User', id: user.id },
                    context: {
                        actorUserId: user.id,
                        actorEmail: user.email,
                        ...auditCtxBase,
                    },
                    meta: { reason: 'ACCOUNT_LOCKED' },
                });
                throw new common_1.UnauthorizedException('Credenciales inválidas');
            }
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { lockedUntil: null, failedLoginAttempts: 0 },
                include: { roles: { include: { role: true } } },
            });
        }
        const valid = await argon2.verify(user.passwordHash, dto.password);
        if (!valid) {
            const max = this.loginLockoutMaxAttempts();
            const lockMinutes = this.loginLockoutMinutes();
            const nextAttempt = user.failedLoginAttempts + 1;
            const shouldLock = nextAttempt >= max;
            const lockedUntil = shouldLock
                ? new Date(now.getTime() + lockMinutes * 60_000)
                : null;
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: shouldLock ? 0 : nextAttempt,
                    lockedUntil,
                },
            });
            await this.audit.log({
                action: 'AUTH_LOGIN_FAIL',
                result: 'FAIL',
                resource: { type: 'User', id: user.id },
                context: {
                    actorUserId: user.id,
                    actorEmail: user.email,
                    ...auditCtxBase,
                },
                meta: {
                    reason: 'BAD_PASSWORD',
                    attempt: nextAttempt,
                    ...(shouldLock && lockedUntil
                        ? { lockedUntil: lockedUntil.toISOString() }
                        : {}),
                },
            });
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
        });
        const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email }, this.accessSignOptions());
        const rawRefresh = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHash = this.hashRefresh(rawRefresh);
        const days = Number(this.config.get('JWT_REFRESH_DAYS', 7));
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
                lastUsedAt: new Date(),
            },
        });
        await this.audit.log({
            action: 'AUTH_LOGIN_OK',
            result: 'OK',
            resource: { type: 'User', id: user.id },
            context: {
                actorUserId: user.id,
                actorEmail: user.email,
                ...auditCtxBase,
            },
        });
        return {
            accessToken,
            refreshToken: rawRefresh,
            user: this.sanitizeUser(user),
        };
    }
    async restoreRefreshToken(refreshRaw, auditOnMissingCookie) {
        if (!refreshRaw) {
            if (auditOnMissingCookie) {
                await this.audit.log({
                    action: 'AUTH_REFRESH_FAIL',
                    result: 'FAIL',
                    meta: { reason: 'MISSING_COOKIE' },
                });
            }
            return { ok: false, reason: 'MISSING_COOKIE' };
        }
        const tokenHash = this.hashRefresh(refreshRaw);
        const row = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: {
                user: {
                    include: {
                        roles: { include: { role: true } },
                    },
                },
            },
        });
        if (!row ||
            row.revokedAt ||
            row.expiresAt < new Date() ||
            !row.user.activo) {
            await this.audit.log({
                action: 'AUTH_REFRESH_FAIL',
                result: 'FAIL',
                resource: { type: 'User', id: row?.userId ?? null },
                context: {
                    actorUserId: row?.userId ?? null,
                    actorEmail: row?.user.email ?? null,
                },
                meta: { reason: 'INVALID_REFRESH' },
            });
            return { ok: false, reason: 'INVALID_REFRESH' };
        }
        const inactivityMinutes = Number(this.config.get('SESSION_INACTIVITY_MINUTES', 60 * 24 * 7));
        const last = row.lastUsedAt ?? row.createdAt;
        const inactiveMs = Date.now() - new Date(last).getTime();
        if (inactiveMs > inactivityMinutes * 60_000) {
            await this.prisma.refreshToken.updateMany({
                where: { tokenHash, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            await this.audit.log({
                action: 'AUTH_REFRESH_FAIL',
                result: 'FAIL',
                resource: { type: 'User', id: row.userId },
                context: { actorUserId: row.userId, actorEmail: row.user.email },
                meta: { reason: 'INACTIVITY_TIMEOUT' },
            });
            return { ok: false, reason: 'INACTIVITY_TIMEOUT' };
        }
        const rawRefreshNew = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHashNew = this.hashRefresh(rawRefreshNew);
        try {
            await this.prisma.$transaction(async (tx) => {
                const revoked = await tx.refreshToken.updateMany({
                    where: { id: row.id, revokedAt: null },
                    data: { revokedAt: new Date() },
                });
                if (revoked.count !== 1) {
                    throw new Error('ROTATION_CONFLICT');
                }
                await tx.refreshToken.create({
                    data: {
                        userId: row.userId,
                        tokenHash: tokenHashNew,
                        expiresAt: row.expiresAt,
                        lastUsedAt: new Date(),
                    },
                });
            });
        }
        catch {
            await this.audit.log({
                action: 'AUTH_REFRESH_FAIL',
                result: 'FAIL',
                resource: { type: 'User', id: row.userId },
                context: { actorUserId: row.userId, actorEmail: row.user.email },
                meta: { reason: 'ROTATION_CONFLICT' },
            });
            return { ok: false, reason: 'ROTATION_CONFLICT' };
        }
        const accessToken = await this.jwtService.signAsync({ sub: row.user.id, email: row.user.email }, this.accessSignOptions());
        await this.audit.log({
            action: 'AUTH_REFRESH_OK',
            result: 'OK',
            resource: { type: 'User', id: row.userId },
            context: { actorUserId: row.userId, actorEmail: row.user.email },
            meta: { rotated: true },
        });
        return {
            ok: true,
            accessToken,
            refreshToken: rawRefreshNew,
            user: this.sanitizeUser(row.user),
        };
    }
    async restoreSessionBootstrap(refreshRaw) {
        return this.restoreRefreshToken(refreshRaw, false);
    }
    async refresh(refreshRaw) {
        const result = await this.restoreRefreshToken(refreshRaw, true);
        if (!result.ok) {
            throw new common_1.UnauthorizedException();
        }
        return {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
        };
    }
    async logout(refreshRaw) {
        if (!refreshRaw) {
            return;
        }
        const tokenHash = this.hashRefresh(refreshRaw);
        const updated = await this.prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        await this.audit.log({
            action: 'AUTH_LOGOUT',
            result: 'OK',
            meta: { revokedCount: updated.count },
        });
    }
    sanitizeUser(user) {
        return {
            id: user.id,
            email: user.email,
            nombres: user.nombres,
            apellidos: user.apellidos,
            dependenciaId: user.dependenciaId,
            roles: user.roles.map((ur) => ({
                codigo: ur.role.codigo,
                nombre: ur.role.nombre,
            })),
        };
    }
    async requestPasswordReset(input) {
        const email = input.email.toLowerCase().trim();
        const ok = { ok: true };
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, activo: true },
        });
        if (!user?.activo) {
            await this.audit.log({
                action: 'AUTH_PASSWORD_RESET_REQUEST',
                result: 'OK',
                context: {
                    actorUserId: null,
                    actorEmail: email,
                    ip: input.requestedIp ?? null,
                    userAgent: input.userAgent ?? null,
                },
                meta: { account: 'NOT_FOUND_OR_INACTIVE' },
            });
            return ok;
        }
        await this.prisma.passwordResetToken.updateMany({
            where: {
                userId: user.id,
                usedAt: null,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            data: { revokedAt: new Date() },
        });
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHash = this.hashOpaqueToken(rawToken);
        const minutes = Number(this.config.get('PASSWORD_RESET_MINUTES', 30));
        const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
                requestedIp: input.requestedIp,
                userAgent: input.userAgent,
            },
        });
        await this.audit.log({
            action: 'AUTH_PASSWORD_RESET_REQUEST',
            result: 'OK',
            resource: { type: 'User', id: user.id },
            context: {
                actorUserId: user.id,
                actorEmail: email,
                ip: input.requestedIp ?? null,
                userAgent: input.userAgent ?? null,
            },
        });
        if (this.mail.isConfigured()) {
            const resetUrl = this.buildPasswordResetUrl(rawToken);
            try {
                await this.mail.sendPasswordReset({
                    to: email,
                    resetUrl,
                    expiresMinutes: minutes,
                });
            }
            catch {
                await this.audit.log({
                    action: 'AUTH_PASSWORD_RESET_MAIL_FAIL',
                    result: 'FAIL',
                    resource: { type: 'User', id: user.id },
                    context: {
                        actorUserId: user.id,
                        actorEmail: email,
                        ip: input.requestedIp ?? null,
                        userAgent: input.userAgent ?? null,
                    },
                    meta: { reason: 'SMTP_ERROR' },
                });
                if (this.config.get('NODE_ENV') !== 'production') {
                    ok.debugToken = rawToken;
                }
            }
        }
        else {
            if (this.config.get('NODE_ENV') === 'production') {
                await this.audit.log({
                    action: 'AUTH_PASSWORD_RESET_MAIL_SKIP',
                    result: 'FAIL',
                    resource: { type: 'User', id: user.id },
                    context: {
                        actorUserId: user.id,
                        actorEmail: email,
                        ip: input.requestedIp ?? null,
                        userAgent: input.userAgent ?? null,
                    },
                    meta: { reason: 'SMTP_NOT_CONFIGURED' },
                });
            }
            else {
                const debugOff = String(this.config.get('PASSWORD_RESET_DEBUG_TOKEN') ?? 'true').toLowerCase() === 'false';
                if (!debugOff) {
                    ok.debugToken = rawToken;
                }
            }
        }
        return ok;
    }
    async confirmPasswordReset(input) {
        const token = input.token.trim();
        if (!token) {
            throw new common_1.UnauthorizedException();
        }
        const tokenHash = this.hashOpaqueToken(token);
        const row = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });
        if (!row ||
            row.usedAt ||
            row.revokedAt ||
            row.expiresAt < new Date() ||
            !row.user.activo) {
            await this.audit.log({
                action: 'AUTH_PASSWORD_RESET_CONFIRM_FAIL',
                result: 'FAIL',
                resource: { type: 'User', id: row?.userId ?? null },
                context: {
                    actorUserId: row?.userId ?? null,
                    actorEmail: row?.user.email ?? null,
                },
                meta: { reason: 'INVALID_TOKEN' },
            });
            throw new common_1.UnauthorizedException();
        }
        const passwordHash = await argon2.hash(input.newPassword);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: row.userId },
                data: {
                    passwordHash,
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: row.id },
                data: { usedAt: new Date() },
            }),
            this.prisma.refreshToken.updateMany({
                where: { userId: row.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
        ]);
        await this.audit.log({
            action: 'AUTH_PASSWORD_RESET_CONFIRM_OK',
            result: 'OK',
            resource: { type: 'User', id: row.userId },
            context: { actorUserId: row.userId, actorEmail: row.user.email },
        });
        return { ok: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_service_1.AuditService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map