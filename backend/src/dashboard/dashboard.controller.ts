import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtRequestUser } from '../auth/request-user';
import {
  DashboardService,
  type DashboardBackupOverviewDto,
  type DashboardDocumentoPorTipoItem,
  type DashboardSummary,
} from './dashboard.service';
import { RecordBackupVerificationDto } from './dto/record-backup-verification.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  getSummary(
    @Req() req: Request & { user: JwtRequestUser },
  ): Promise<DashboardSummary> {
    return this.service.getSummary(req.user);
  }

  /**
   * Registra en auditoría que se verificó un respaldo (procedimiento manual).
   * El panel principal muestra `lastSignals.lastBackupVerifiedAt` a partir de estos eventos.
   */
  @Post('admin/backup-verification')
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  recordBackupVerification(
    @Req() req: Request & { user: JwtRequestUser },
    @Body() dto: RecordBackupVerificationDto,
  ): Promise<{ ok: true; recordedAt: string }> {
    return this.service.recordBackupVerification(req.user, {
      notes: dto.notes,
      tipoRespaldo: dto.tipoRespaldo,
      tamanoBytes: dto.tamanoBytes,
      tamanoLabel: dto.tamanoLabel,
    });
  }

  /** KPI + historial real desde `audit_logs` (BACKUP_VERIFIED). */
  @Get('admin/backup-overview')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getBackupOverview(
    @Req() req: Request & { user: JwtRequestUser },
  ): Promise<DashboardBackupOverviewDto> {
    return this.service.getBackupOverview(req.user);
  }

  /** Indicador para pantalla de reportes (ADMIN): conteo por tipo documental. */
  @Get('admin/documentos-por-tipo')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  documentosPorTipo(
    @Req() req: Request & { user: JwtRequestUser },
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('dependenciaId') dependenciaId?: string,
    @Query('tipoDocumentalId') tipoDocumentalId?: string,
  ): Promise<{ items: DashboardDocumentoPorTipoItem[] }> {
    return this.service.getDocumentosPorTipoReporte(req.user, {
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      dependenciaId: dependenciaId?.trim() || undefined,
      tipoDocumentalId: tipoDocumentalId?.trim() || undefined,
    });
  }
}
