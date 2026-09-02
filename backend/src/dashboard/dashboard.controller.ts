import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import type { JwtRequestUser } from '../auth/request-user';
import {
  DashboardService,
  type DashboardBackupOverviewDto,
  type DashboardDocumentoPorTipoItem,
  type DashboardSummary,
} from './dashboard.service';
import { AcknowledgeDashboardAlertDto } from './dto/acknowledge-dashboard-alert.dto';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';
import { RecordBackupVerificationDto } from './dto/record-backup-verification.dto';
import { normalizeActividadPeriodo } from './actividad-periodo.util';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @Permissions(PERM.DASHBOARD_SUMMARY)
  getSummary(
    @Req() req: Request & { user: JwtRequestUser },
    @Query() query: DashboardSummaryQueryDto,
  ): Promise<DashboardSummary> {
    const periodo = normalizeActividadPeriodo(query.actividadPeriodo);
    return this.service.getSummary(req.user, periodo);
  }

  /**
   * Registra en auditoría que se verificó un respaldo (procedimiento manual).
   * El panel principal muestra `lastSignals.lastBackupVerifiedAt` a partir de estos eventos.
   */
  @Post('admin/backup-verification')
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.BACKUP_VERIFICATION_RECORD)
  recordBackupVerification(
    @Req() req: Request & { user: JwtRequestUser },
    @Body() dto: RecordBackupVerificationDto,
  ): Promise<{ ok: true; recordedAt: string }> {
    return this.service.recordBackupVerification(req.user, {
      result: dto.result,
      notes: dto.notes,
      tipoRespaldo: dto.tipoRespaldo,
      tamanoBytes: dto.tamanoBytes,
      tamanoLabel: dto.tamanoLabel,
    });
  }

  /** KPI + historial real desde `audit_logs` (BACKUP_VERIFIED). */
  /** Marca una alerta del panel como revisada (oculta hasta actividad nueva). */
  @Post('admin/alerts/acknowledge')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.DASHBOARD_ADMIN_READ)
  acknowledgeDashboardAlert(
    @Req() req: Request & { user: JwtRequestUser },
    @Body() dto: AcknowledgeDashboardAlertDto,
  ): Promise<{ ok: true; codigo: string; acknowledgedAt: string }> {
    return this.service.acknowledgeDashboardAlert(req.user, dto.codigo);
  }

  @Get('admin/backup-overview')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.DASHBOARD_ADMIN_READ)
  getBackupOverview(
    @Req() req: Request & { user: JwtRequestUser },
  ): Promise<DashboardBackupOverviewDto> {
    return this.service.getBackupOverview(req.user);
  }

  /** Indicador para pantalla de reportes (ADMIN): conteo por tipo documental. */
  @Get('admin/documentos-por-tipo')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.DASHBOARD_ADMIN_READ)
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
