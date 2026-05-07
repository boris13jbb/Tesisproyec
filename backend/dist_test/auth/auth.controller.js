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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const password_reset_confirm_dto_1 = require("./dto/password-reset-confirm.dto");
const password_reset_request_dto_1 = require("./dto/password-reset-request.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
let AuthController = class AuthController {
    authService;
    config;
    constructor(authService, config) {
        this.authService = authService;
        this.config = config;
    }
    cookieName() {
        return this.config.get('REFRESH_COOKIE_NAME', 'sgd_refresh');
    }
    refreshMaxAgeMs() {
        const days = Number(this.config.get('JWT_REFRESH_DAYS', 7));
        return days * 24 * 60 * 60 * 1000;
    }
    async login(dto, req, res) {
        const forwarded = req.headers['x-forwarded-for'];
        const ipFromForwarded = typeof forwarded === 'string'
            ? forwarded.split(',')[0]?.trim()
            : undefined;
        const ua = req.headers['user-agent'];
        const result = await this.authService.login(dto, {
            ip: ipFromForwarded ?? req.ip,
            userAgent: typeof ua === 'string' ? ua : undefined,
        });
        const name = this.cookieName();
        res.cookie(name, result.refreshToken, {
            httpOnly: true,
            secure: this.config.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: this.refreshMaxAgeMs(),
        });
        return {
            accessToken: result.accessToken,
            user: result.user,
        };
    }
    async refresh(req, res) {
        const name = this.cookieName();
        const raw = req.cookies?.[name];
        const result = await this.authService.refresh(raw);
        res.cookie(name, result.refreshToken, {
            httpOnly: true,
            secure: this.config.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: this.refreshMaxAgeMs(),
        });
        return {
            accessToken: result.accessToken,
            user: result.user,
        };
    }
    async restoreSession(req, res) {
        const name = this.cookieName();
        const secure = this.config.get('NODE_ENV') === 'production';
        const cookieOpts = {
            path: '/',
            httpOnly: true,
            secure,
            sameSite: 'lax',
        };
        const raw = req.cookies?.[name];
        const result = await this.authService.restoreSessionBootstrap(raw);
        if (!result.ok) {
            if (raw) {
                res.clearCookie(name, cookieOpts);
            }
            return { restored: false };
        }
        res.cookie(name, result.refreshToken, {
            ...cookieOpts,
            maxAge: this.refreshMaxAgeMs(),
        });
        return {
            restored: true,
            accessToken: result.accessToken,
            user: result.user,
        };
    }
    async logout(req, res) {
        const name = this.cookieName();
        const raw = req.cookies?.[name];
        await this.authService.logout(raw);
        res.clearCookie(name, {
            path: '/',
            httpOnly: true,
            secure: this.config.get('NODE_ENV') === 'production',
            sameSite: 'lax',
        });
    }
    me(req) {
        return req.user;
    }
    async requestPasswordReset(dto, req) {
        const requestedIp = req.headers['x-forwarded-for']?.split(',')[0] ??
            req.ip ??
            undefined;
        const userAgent = req.headers['user-agent'] ?? undefined;
        return this.authService.requestPasswordReset({
            email: dto.email,
            requestedIp,
            userAgent: typeof userAgent === 'string' ? userAgent : undefined,
        });
    }
    async confirmPasswordReset(dto) {
        return this.authService.confirmPasswordReset({
            token: dto.token,
            newPassword: dto.newPassword,
        });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)({ default: { limit: 8, ttl: 10 * 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 10 * 60_000 } }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('session/restore'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 10 * 60_000 } }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "restoreSession", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('password-reset/request'),
    (0, common_1.HttpCode)(202),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 10 * 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_request_dto_1.PasswordResetRequestDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestPasswordReset", null);
__decorate([
    (0, common_1.Post)('password-reset/confirm'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 10 * 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_confirm_dto_1.PasswordResetConfirmDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "confirmPasswordReset", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map