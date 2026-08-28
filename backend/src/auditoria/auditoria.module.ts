import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditService } from './audit.service';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';

/** Expone `AuditService` a todos los módulos (Auth, Usuarios, Documentos, filtros, etc.). */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [AuditoriaController],
  providers: [AuditService, AuditoriaService],
  exports: [AuditService, AuditoriaService],
})
export class AuditoriaModule {}
