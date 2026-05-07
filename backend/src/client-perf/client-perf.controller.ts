import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuditService } from '../auditoria/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtRequestUser } from '../auth/request-user';
import { ReportWebVitalDto } from './dto/report-web-vital.dto';

/**
 * Recepción de métricas Web Vitals desde el cliente (RUM).
 * Persistencia vía `audit_logs` para trazabilidad operativa (ISO 15489: evidencia no funcional de negocio).
 */
@Controller('client-perf')
export class ClientPerfController {
  constructor(private readonly audit: AuditService) {}

  @Post('web-vitals')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  async reportWebVital(
    @Req() req: Request & { user: JwtRequestUser },
    @Body() dto: ReportWebVitalDto,
  ): Promise<void> {
    const u = req.user;
    await this.audit.log({
      action: 'CLIENT_WEB_VITAL_LCP',
      result: 'OK',
      resource: { type: 'ClientPerf', id: null },
      context: {
        actorUserId: u.id,
        actorEmail: u.email,
        ip: req.ip ?? null,
        userAgent:
          typeof req.headers['user-agent'] === 'string'
            ? req.headers['user-agent'].slice(0, 255)
            : null,
        correlationId: null,
      },
      meta: {
        metric: dto.metric,
        valueMs: dto.valueMs,
        rating: dto.rating,
        pathname: dto.pathname ?? null,
        navigationType: dto.navigationType ?? null,
        metricId: dto.metricId ?? null,
      },
    });
  }
}
