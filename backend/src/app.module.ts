import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CargosModule } from './cargos/cargos.module';
import { DependenciasModule } from './dependencias/dependencias.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuthModule,
    DependenciasModule,
    CargosModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
