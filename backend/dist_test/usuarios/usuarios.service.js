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
exports.UsuariosService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const argon2 = __importStar(require("argon2"));
const crypto_1 = require("crypto");
const audit_service_1 = require("../auditoria/audit.service");
const mail_service_1 = require("../mail/mail.service");
const prisma_service_1 = require("../prisma/prisma.service");
let UsuariosService = class UsuariosService {
    prisma;
    audit;
    config;
    mail;
    constructor(prisma, audit, config, mail) {
        this.prisma = prisma;
        this.audit = audit;
        this.config = config;
        this.mail = mail;
    }
    hashOpaqueToken(raw) {
        return (0, crypto_1.createHash)('sha256').update(raw, 'utf8').digest('hex');
    }
    buildPasswordSetupUrl(rawToken) {
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
    sanitize(u) {
        return {
            id: u.id,
            email: u.email,
            nombres: u.nombres,
            apellidos: u.apellidos,
            dependenciaId: u.dependenciaId,
            cargoId: u.cargoId,
            activo: u.activo,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            roles: u.roles.map((r) => ({
                codigo: r.role.codigo,
                nombre: r.role.nombre,
            })),
        };
    }
    async findAll() {
        const users = await this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                nombres: true,
                apellidos: true,
                dependenciaId: true,
                cargoId: true,
                activo: true,
                createdAt: true,
                updatedAt: true,
                roles: { include: { role: true } },
            },
        });
        return users.map((u) => this.sanitize(u));
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                nombres: true,
                apellidos: true,
                dependenciaId: true,
                cargoId: true,
                activo: true,
                createdAt: true,
                updatedAt: true,
                roles: { include: { role: true } },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException();
        }
        return this.sanitize(user);
    }
    async create(dto, ctx) {
        const email = dto.email.toLowerCase().trim();
        const activo = dto.activo ?? true;
        const roleCodes = (dto.roles?.length ? dto.roles : ['USUARIO']).map((r) => r.trim().toUpperCase());
        const uniqueRoleCodes = Array.from(new Set(roleCodes)).filter(Boolean);
        if (!uniqueRoleCodes.length) {
            throw new common_1.BadRequestException('Debe asignarse al menos un rol');
        }
        const roles = await this.prisma.role.findMany({
            where: { codigo: { in: uniqueRoleCodes } },
            select: { id: true, codigo: true },
        });
        if (roles.length !== uniqueRoleCodes.length) {
            const found = new Set(roles.map((r) => r.codigo));
            const missing = uniqueRoleCodes.filter((c) => !found.has(c));
            throw new common_1.BadRequestException(`Roles no válidos: ${missing.join(', ')}`);
        }
        const passwordHash = await argon2.hash(dto.password, {
            type: argon2.argon2id,
        });
        try {
            const created = await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        email,
                        passwordHash,
                        nombres: dto.nombres?.trim() || null,
                        apellidos: dto.apellidos?.trim() || null,
                        dependenciaId: dto.dependenciaId ?? null,
                        cargoId: dto.cargoId ?? null,
                        activo,
                    },
                });
                await tx.userRole.createMany({
                    data: roles.map((r) => ({ userId: user.id, roleId: r.id })),
                });
                return tx.user.findUniqueOrThrow({
                    where: { id: user.id },
                    select: {
                        id: true,
                        email: true,
                        nombres: true,
                        apellidos: true,
                        dependenciaId: true,
                        cargoId: true,
                        activo: true,
                        createdAt: true,
                        updatedAt: true,
                        roles: { include: { role: true } },
                    },
                });
            });
            await this.audit.log({
                action: 'USER_CREATED',
                result: 'OK',
                resource: { type: 'User', id: created.id },
                context: {
                    actorUserId: ctx?.actorUserId ?? null,
                    actorEmail: ctx?.actorEmail ?? null,
                    ip: ctx?.ip ?? null,
                    userAgent: ctx?.userAgent ?? null,
                    correlationId: ctx?.correlationId ?? null,
                },
                meta: {
                    roles: created.roles.map((r) => r.role.codigo),
                    activo: created.activo,
                },
            });
            const invitar = dto.invitarPorCorreo !== false;
            let invitacionCorreo;
            if (!invitar) {
                invitacionCorreo = { solicitada: false, enviada: false };
            }
            else if (!this.mail.isConfigured()) {
                await this.audit.log({
                    action: 'USER_INVITE_MAIL_SKIP',
                    result: 'FAIL',
                    resource: { type: 'User', id: created.id },
                    context: {
                        actorUserId: ctx?.actorUserId ?? null,
                        actorEmail: ctx?.actorEmail ?? null,
                        ip: ctx?.ip ?? null,
                        userAgent: ctx?.userAgent ?? null,
                        correlationId: ctx?.correlationId ?? null,
                    },
                    meta: { reason: 'SMTP_NOT_CONFIGURED' },
                });
                invitacionCorreo = {
                    solicitada: true,
                    enviada: false,
                    motivoOmitido: 'SMTP_NOT_CONFIGURED',
                };
            }
            else {
                try {
                    const inviteMinutes = Number(this.config.get('USER_INVITE_MINUTES', '4320'));
                    await this.prisma.passwordResetToken.updateMany({
                        where: {
                            userId: created.id,
                            usedAt: null,
                            revokedAt: null,
                            expiresAt: { gt: new Date() },
                        },
                        data: { revokedAt: new Date() },
                    });
                    const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
                    const tokenHash = this.hashOpaqueToken(rawToken);
                    await this.prisma.passwordResetToken.create({
                        data: {
                            userId: created.id,
                            tokenHash,
                            expiresAt: new Date(Date.now() + inviteMinutes * 60 * 1000),
                            requestedIp: ctx?.ip ?? null,
                            userAgent: ctx?.userAgent ?? null,
                        },
                    });
                    const setupUrl = this.buildPasswordSetupUrl(rawToken);
                    await this.mail.sendUserInvitation({
                        to: email,
                        setupUrl,
                        expiresMinutes: inviteMinutes,
                    });
                    await this.audit.log({
                        action: 'USER_INVITE_MAIL_SENT',
                        result: 'OK',
                        resource: { type: 'User', id: created.id },
                        context: {
                            actorUserId: ctx?.actorUserId ?? null,
                            actorEmail: ctx?.actorEmail ?? null,
                            ip: ctx?.ip ?? null,
                            userAgent: ctx?.userAgent ?? null,
                            correlationId: ctx?.correlationId ?? null,
                        },
                    });
                    invitacionCorreo = { solicitada: true, enviada: true };
                }
                catch {
                    await this.audit.log({
                        action: 'USER_INVITE_MAIL_FAIL',
                        result: 'FAIL',
                        resource: { type: 'User', id: created.id },
                        context: {
                            actorUserId: ctx?.actorUserId ?? null,
                            actorEmail: ctx?.actorEmail ?? null,
                            ip: ctx?.ip ?? null,
                            userAgent: ctx?.userAgent ?? null,
                            correlationId: ctx?.correlationId ?? null,
                        },
                        meta: { reason: 'SMTP_ERROR' },
                    });
                    invitacionCorreo = {
                        solicitada: true,
                        enviada: false,
                        motivoOmitido: 'SMTP_ERROR',
                    };
                }
            }
            return {
                ...this.sanitize(created),
                invitacionCorreo,
            };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('Unique constraint') || msg.includes('P2002')) {
                throw new common_1.ConflictException('Ya existe un usuario con ese correo');
            }
            throw e;
        }
    }
    async update(id, dto, ctx) {
        const existing = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                nombres: true,
                apellidos: true,
                dependenciaId: true,
                cargoId: true,
                activo: true,
                createdAt: true,
                updatedAt: true,
                roles: { include: { role: true } },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException();
        }
        const email = dto.email ? dto.email.toLowerCase().trim() : undefined;
        const passwordHash = dto.password
            ? await argon2.hash(dto.password, { type: argon2.argon2id })
            : undefined;
        const rolesToSet = dto.roles
            ?.map((r) => r.trim().toUpperCase())
            .filter(Boolean);
        let roleRows = null;
        if (rolesToSet) {
            const unique = Array.from(new Set(rolesToSet));
            if (!unique.length) {
                throw new common_1.BadRequestException('Debe asignarse al menos un rol');
            }
            const roles = await this.prisma.role.findMany({
                where: { codigo: { in: unique } },
                select: { id: true, codigo: true },
            });
            if (roles.length !== unique.length) {
                const found = new Set(roles.map((r) => r.codigo));
                const missing = unique.filter((c) => !found.has(c));
                throw new common_1.BadRequestException(`Roles no válidos: ${missing.join(', ')}`);
            }
            roleRows = roles;
        }
        try {
            const updated = await this.prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id },
                    data: {
                        email,
                        passwordHash,
                        nombres: dto.nombres !== undefined
                            ? dto.nombres?.trim() || null
                            : undefined,
                        apellidos: dto.apellidos !== undefined
                            ? dto.apellidos?.trim() || null
                            : undefined,
                        dependenciaId: dto.dependenciaId === undefined ? undefined : dto.dependenciaId,
                        cargoId: dto.cargoId === undefined ? undefined : dto.cargoId,
                        activo: dto.activo,
                    },
                });
                if (roleRows) {
                    await tx.userRole.deleteMany({ where: { userId: id } });
                    await tx.userRole.createMany({
                        data: roleRows.map((r) => ({ userId: id, roleId: r.id })),
                    });
                }
                return tx.user.findUniqueOrThrow({
                    where: { id },
                    select: {
                        id: true,
                        email: true,
                        nombres: true,
                        apellidos: true,
                        dependenciaId: true,
                        cargoId: true,
                        activo: true,
                        createdAt: true,
                        updatedAt: true,
                        roles: { include: { role: true } },
                    },
                });
            });
            await this.audit.log({
                action: 'USER_UPDATED',
                result: 'OK',
                resource: { type: 'User', id },
                context: {
                    actorUserId: ctx?.actorUserId ?? null,
                    actorEmail: ctx?.actorEmail ?? null,
                    ip: ctx?.ip ?? null,
                    userAgent: ctx?.userAgent ?? null,
                    correlationId: ctx?.correlationId ?? null,
                },
                meta: {
                    activo: updated.activo,
                    roles: updated.roles.map((r) => r.role.codigo),
                    dependenciaId: updated.dependenciaId,
                    cargoId: updated.cargoId,
                },
            });
            return this.sanitize(updated);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('Unique constraint') || msg.includes('P2002')) {
                throw new common_1.ConflictException('Ya existe un usuario con ese correo');
            }
            throw e;
        }
    }
    async resetPassword(id, newPassword, ctx) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, activo: true },
        });
        if (!user) {
            throw new common_1.NotFoundException();
        }
        if (!user.activo) {
            throw new common_1.BadRequestException('No se puede cambiar la contraseña de un usuario inactivo');
        }
        const passwordHash = await argon2.hash(newPassword, {
            type: argon2.argon2id,
        });
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id },
                data: {
                    passwordHash,
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                },
            }),
            this.prisma.refreshToken.updateMany({
                where: { userId: id, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
        ]);
        await this.audit.log({
            action: 'USER_PASSWORD_RESET',
            result: 'OK',
            resource: { type: 'User', id },
            context: {
                actorUserId: ctx?.actorUserId ?? null,
                actorEmail: ctx?.actorEmail ?? null,
                ip: ctx?.ip ?? null,
                userAgent: ctx?.userAgent ?? null,
                correlationId: ctx?.correlationId ?? null,
            },
        });
        return { ok: true };
    }
};
exports.UsuariosService = UsuariosService;
exports.UsuariosService = UsuariosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        config_1.ConfigService,
        mail_service_1.MailService])
], UsuariosService);
//# sourceMappingURL=usuarios.service.js.map