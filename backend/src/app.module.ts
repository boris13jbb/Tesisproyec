import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
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
  providers: [],
})
export class AppModule {}
