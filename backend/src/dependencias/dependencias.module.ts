import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DependenciasController } from './dependencias.controller';
import { DependenciasService } from './dependencias.service';

@Module({
  imports: [AuthModule],
  controllers: [DependenciasController],
  providers: [DependenciasService],
})
export class DependenciasModule {}
