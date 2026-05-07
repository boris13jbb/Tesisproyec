"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const app_controller_1 = require("./app.controller");
const auth_module_1 = require("./auth/auth.module");
const cargos_module_1 = require("./cargos/cargos.module");
const documentos_module_1 = require("./documentos/documentos.module");
const dependencias_module_1 = require("./dependencias/dependencias.module");
const prisma_module_1 = require("./prisma/prisma.module");
const series_module_1 = require("./series/series.module");
const subseries_module_1 = require("./subseries/subseries.module");
const tipos_documentales_module_1 = require("./tipos-documentales/tipos-documentales.module");
const reportes_module_1 = require("./reportes/reportes.module");
const usuarios_module_1 = require("./usuarios/usuarios.module");
const auditoria_module_1 = require("./auditoria/auditoria.module");
const forbidden_audit_filter_1 = require("./common/filters/forbidden-audit.filter");
const throttler_audit_filter_1 = require("./common/filters/throttler-audit.filter");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60_000,
                    limit: 200,
                },
            ]),
            prisma_module_1.PrismaModule,
            auditoria_module_1.AuditoriaModule,
            auth_module_1.AuthModule,
            usuarios_module_1.UsuariosModule,
            dependencias_module_1.DependenciasModule,
            cargos_module_1.CargosModule,
            tipos_documentales_module_1.TiposDocumentalesModule,
            series_module_1.SeriesModule,
            subseries_module_1.SubseriesModule,
            documentos_module_1.DocumentosModule,
            reportes_module_1.ReportesModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_FILTER, useClass: throttler_audit_filter_1.ThrottlerAuditFilter },
            { provide: core_1.APP_FILTER, useClass: forbidden_audit_filter_1.ForbiddenAuditFilter },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map