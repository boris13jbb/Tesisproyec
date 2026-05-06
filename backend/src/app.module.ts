import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ThrottlerAuditFilter },
    { provide: APP_FILTER, useClass: ForbiddenAuditFilter },
  ],
})
export class AppModule {}
