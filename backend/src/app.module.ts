import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BackupModule } from './backup/backup.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CargosModule } from './cargos/cargos.module';
import { DocumentosModule } from './documentos/documentos.module';
import { DependenciasModule } from './dependencias/dependencias.module';
import { PrismaModule } from './prisma/prisma.module';
import { SeriesModule } from './series/series.module';
import { SubseriesModule } from './subseries/subseries.module';
import { TiposDocumentalesModule } from './tipos-documentales/tipos-documentales.module';
import { ReportesModule } from './reportes/reportes.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { ForbiddenAuditFilter } from './common/filters/forbidden-audit.filter';
import { ThrottlerAuditFilter } from './common/filters/throttler-audit.filter';
import { DashboardModule } from './dashboard/dashboard.module';
import { ConfigService } from '@nestjs/config';

@Injectable()
class StartupConfigGuard implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const nodeEnv = String(this.config.get('NODE_ENV') ?? 'development');
    const isProd = nodeEnv === 'production';
    const isTest = nodeEnv === 'test';

    const access = String(this.config.get<string>('JWT_ACCESS_SECRET') ?? '');
    const refresh = String(this.config.get<string>('JWT_REFRESH_SECRET') ?? '');

    const problems: string[] = [];

    const looksPlaceholder = (v: string) =>
      v.trim() === '' ||
      v.trim().toLowerCase().startsWith('change-me') ||
      v.trim().length < 32;

    if (looksPlaceholder(access)) {
      problems.push(
        'JWT_ACCESS_SECRET inválido (vacío/placeholder/corto). Debe ser un secreto largo aleatorio.',
      );
    }
    if (refresh && looksPlaceholder(refresh)) {
      problems.push(
        'JWT_REFRESH_SECRET inválido (placeholder/corto). Debe ser un secreto largo aleatorio o quedar sin definir.',
      );
    }

    if (!problems.length) return;

    if (isProd) {
      throw new Error(`Configuración insegura:\n- ${problems.join('\n- ')}`);
    }

    if (isTest) {
      return;
    }

    // En dev: no bloquear el arranque, pero dejar evidencia clara.

    console.warn(
      `[StartupConfigGuard] Configuración a corregir:\n- ${problems.join('\n- ')}`,
    );
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        // Default (alto) para no afectar endpoints normales.
        ttl: 60_000,
        limit: 200,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditoriaModule,
    AuthModule,
    UsuariosModule,
    DependenciasModule,
    CargosModule,
    TiposDocumentalesModule,
    SeriesModule,
    SubseriesModule,
    DocumentosModule,
    ReportesModule,
    DashboardModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [
    StartupConfigGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ThrottlerAuditFilter },
    { provide: APP_FILTER, useClass: ForbiddenAuditFilter },
  ],
})
export class AppModule {}
