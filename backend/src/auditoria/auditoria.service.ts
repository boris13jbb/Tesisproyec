import { Injectable } from '@nestjs/common';
import {
  computePercentileThresholds,
  trafficLightFromPercentiles,
  type TrafficLightLevel,
} from '../common/traffic-light.util';
import { PrismaService } from '../prisma/prisma.service';
import { buildAuditWhere } from './audit-list.util';

const SENSITIVE_ACTIONS = [
  'DOC_FILE_DELETED',
  'USER_UPDATED',
  'DOC_STATE_CHANGED',
] as const;

export type AuditStatsResponse = {
  desde: string;
  hasta: string;
  totales: {
    registros: number;
    ok: number;
    fail: number;
  };
  porAccion: { action: string; count: number }[];
  documentos: {
    creados: number;
    modificados: number;
    archivosEliminados: number;
  };
  sensiblesPorUsuario: {
    actorUserId: string | null;
    actorEmail: string | null;
    count: number;
    nivel: TrafficLightLevel;
  }[];
};

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(filters: {
    from?: Date;
    to?: Date;
    actorUserId?: string;
    action?: string;
  }): Promise<AuditStatsResponse> {
    const to = filters.to ?? new Date();
    const from =
      filters.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where = buildAuditWhere({
      from,
      to,
      actorUserId: filters.actorUserId,
      action: filters.action,
    });

    const [
      registros,
      ok,
      fail,
      porAccionRaw,
      docCreados,
      docModificados,
      archivosEliminados,
      sensiblesRaw,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({ where: { ...where, result: 'OK' } }),
      this.prisma.auditLog.count({ where: { ...where, result: 'FAIL' } }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { _all: true },
      }),
      this.prisma.auditLog.count({
        where: { ...where, action: 'DOC_CREATED' },
      }),
      this.prisma.auditLog.count({
        where: {
          ...where,
          action: { in: ['DOC_STATE_CHANGED', 'DOC_UPDATED'] },
        },
      }),
      this.prisma.auditLog.count({
        where: { ...where, action: 'DOC_FILE_DELETED' },
      }),
      this.prisma.auditLog.groupBy({
        by: ['actorUserId', 'actorEmail'],
        where: {
          ...where,
          action: { in: [...SENSITIVE_ACTIONS] },
        },
        _count: { _all: true },
      }),
    ]);

    const counts = sensiblesRaw.map((r) => r._count._all);
    const { p33, p66 } = computePercentileThresholds(counts);

    const sensiblesPorUsuario = sensiblesRaw
      .map((r) => ({
        actorUserId: r.actorUserId,
        actorEmail: r.actorEmail,
        count: r._count._all,
        nivel: trafficLightFromPercentiles({
          value: r._count._all,
          p33,
          p66,
        }),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      desde: from.toISOString(),
      hasta: to.toISOString(),
      totales: { registros, ok, fail },
      porAccion: porAccionRaw
        .map((r) => ({
          action: r.action,
          count: r._count._all,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12),
      documentos: {
        creados: docCreados,
        modificados: docModificados,
        archivosEliminados,
      },
      sensiblesPorUsuario,
    };
  }
}

export type { TrafficLightLevel };
