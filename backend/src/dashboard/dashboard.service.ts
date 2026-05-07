import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtRequestUser } from '../auth/request-user';
import { jwtUserIsAdmin } from '../auth/request-user';
import { documentoVisibilityWhere } from '../documentos/documento-scope.util';
import { AuditService } from '../auditoria/audit.service';

export type DashboardRecentDocumento = {
  id: string;
  codigo: string;
  asunto: string;
  estado: string;
  fechaDocumento: string;
  /** Última modificación del registro documental (`updated_at`): referencia temporal para “últimas acciones”. */
  ultimaActividadAt: string;
};

export type DashboardComplianceMetric = {
  key:
    | 'access_control'
    | 'identity_management'
    | 'authentication_information'
    | 'document_traceability'
    | 'input_validation';
  title: string;
  standard: string;
  percent: number;
  /** Evidencia mínima para trazabilidad (valores reales). */
  evidence: Record<string, number | string | null>;
};

export type DashboardDocumentoPorTipoItem = {
  nombre: string;
  codigo: string;
  count: number;
};

export type DashboardBackupVerificationRowDto = {
  id: string;
  createdAt: string;
  result: string;
  actorEmail: string | null;
  notes: string | null;
  tipoRespaldo: string | null;
  tamanoLabel: string | null;
  tamanoBytes: number | null;
};

export type DashboardBackupOverviewDto = {
  schemaVersion: 1;
  lastVerifiedAt: string | null;
  /** Texto institucional opcional desde `BACKUP_EXPECTED_SCHEDULE_HINT` (el SGD no programa cron). */
  siguienteCopiaEtiqueta: string | null;
  verificaciones90d: { ok: number; fail: number };
  historial: DashboardBackupVerificationRowDto[];
};

export type DashboardAlertItem = {
  /** Clave estable consumida por el frontend para enrutar al hacer clic en la tarjeta de alertas. */
  codigo:
    | 'PENDIENTES_REVISION'
    | 'AUTHZ_FORBIDDEN'
    | 'AUTH_LOGIN_FAIL'
    | 'BACKUP_SIN_REGISTRO';
  mensaje: string;
};

export type DashboardSummary = {
  generatedAt: string;
  kpis: {
    documentosTotal: number;
    /** Documentos creados desde el día 1 del mes calendario actual (timezone del servidor). */
    documentosCreadosEsteMes: number;
    pendientesRevision: number;
    usuariosActivos: number | null;
    /** Igual a `alertasItems.length`. */
    alertas: number;
    /** Señales activas con texto y código de navegación. */
    alertasItems: DashboardAlertItem[];
  };
  documentosRecientes: DashboardRecentDocumento[];
  compliance: DashboardComplianceMetric[];
  lastSignals: {
    lastAuditAt: string | null;
    lastLoginOkAt: string | null;
    /** Último registro auditado manual de respaldo (`BACKUP_VERIFIED`). */
    lastBackupVerifiedAt: string | null;
  };
};

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Acción de auditoría cuando un administrador registra verificación institucional de respaldo (ver pantalla Respaldos). */
export const AUDIT_ACTION_BACKUP_VERIFIED = 'BACKUP_VERIFIED' as const;

function parseBackupVerifiedMeta(metaJson: string | null): {
  notes?: string;
  tipoRespaldo?: string;
  tamanoLabel?: string;
  tamanoBytes?: number;
} {
  if (!metaJson?.trim()) return {};
  try {
    const m = JSON.parse(metaJson) as Record<string, unknown>;
    const notes = typeof m.notes === 'string' ? m.notes : undefined;
    const tipoRespaldo =
      typeof m.tipoRespaldo === 'string' ? m.tipoRespaldo : undefined;
    const tamanoLabel =
      typeof m.tamanoLabel === 'string' ? m.tamanoLabel : undefined;
    const tamanoBytes =
      typeof m.tamanoBytes === 'number' && Number.isFinite(m.tamanoBytes)
        ? m.tamanoBytes
        : undefined;
    return { notes, tipoRespaldo, tamanoLabel, tamanoBytes };
  } catch {
    return {};
  }
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async recordBackupVerification(
    viewer: JwtRequestUser,
    payload?: {
      notes?: string;
      tipoRespaldo?: string;
      tamanoBytes?: number;
      tamanoLabel?: string;
    },
  ): Promise<{ ok: true; recordedAt: string }> {
    if (!jwtUserIsAdmin(viewer)) {
      throw new ForbiddenException();
    }
    const recordedAt = new Date();
    const notes = payload?.notes?.trim();
    const tipo = payload?.tipoRespaldo?.trim();
    const tamLabel = payload?.tamanoLabel?.trim();
    const tamBytes = payload?.tamanoBytes;

    const meta: Record<string, unknown> = { source: 'manual_registry' };
    if (notes && notes.length > 0) meta.notes = notes.slice(0, 500);
    if (tipo && tipo.length > 0) meta.tipoRespaldo = tipo.slice(0, 64);
    if (tamLabel && tamLabel.length > 0) meta.tamanoLabel = tamLabel.slice(0, 40);
    if (typeof tamBytes === 'number' && Number.isFinite(tamBytes) && tamBytes >= 0) {
      meta.tamanoBytes = Math.floor(tamBytes);
    }

    await this.audit.log({
      action: AUDIT_ACTION_BACKUP_VERIFIED,
      result: 'OK',
      context: {
        actorUserId: viewer.id,
        actorEmail: viewer.email,
      },
      meta,
    });
    return { ok: true, recordedAt: recordedAt.toISOString() };
  }

  async getBackupOverview(viewer: JwtRequestUser): Promise<DashboardBackupOverviewDto> {
    if (!jwtUserIsAdmin(viewer)) {
      throw new ForbiddenException();
    }
    const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [historialRaw, ok90d, fail90d] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { action: AUDIT_ACTION_BACKUP_VERIFIED },
        orderBy: [{ createdAt: 'desc' }],
        take: 50,
        select: {
          id: true,
          createdAt: true,
          result: true,
          actorEmail: true,
          metaJson: true,
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: AUDIT_ACTION_BACKUP_VERIFIED,
          result: 'OK',
          createdAt: { gte: since90d },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: AUDIT_ACTION_BACKUP_VERIFIED,
          result: 'FAIL',
          createdAt: { gte: since90d },
        },
      }),
    ]);

    const lastOk = historialRaw.find((r) => r.result === 'OK');

    const historial: DashboardBackupVerificationRowDto[] = historialRaw.map(
      (r) => {
        const m = parseBackupVerifiedMeta(r.metaJson);
        return {
          id: r.id,
          createdAt: r.createdAt.toISOString(),
          result: r.result,
          actorEmail: r.actorEmail,
          notes: m.notes ?? null,
          tipoRespaldo: m.tipoRespaldo ?? null,
          tamanoLabel: m.tamanoLabel ?? null,
          tamanoBytes:
            typeof m.tamanoBytes === 'number' ? m.tamanoBytes : null,
        };
      },
    );

    const hint =
      this.config.get<string>('BACKUP_EXPECTED_SCHEDULE_HINT')?.trim() || null;

    return {
      schemaVersion: 1,
      lastVerifiedAt: lastOk?.createdAt.toISOString() ?? null,
      siguienteCopiaEtiqueta: hint && hint.length > 0 ? hint : null,
      verificaciones90d: { ok: ok90d, fail: fail90d },
      historial,
    };
  }

  async getSummary(viewer: JwtRequestUser): Promise<DashboardSummary> {
    const isAdmin = jwtUserIsAdmin(viewer);
    const vis = documentoVisibilityWhere(viewer);
    const docWhere = vis ? { AND: [{ activo: true }, vis] } : { activo: true };

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [
      documentosTotal,
      documentosCreadosEsteMes,
      pendientesRevision,
      docsRecent,
      usuariosActivos,
      activeUsersWithRole,
      loginOk30d,
      loginFail30d,
      authzForbidden30d,
      totalAudit30d,
      docsWithEvents30d,
      docOk30d,
      docFail30d,
      lastAudit,
      lastLoginOk,
      lastBackupVerified,
    ] = await Promise.all([
      this.prisma.documento.count({ where: docWhere }),
      this.prisma.documento.count({
        where: { ...docWhere, createdAt: { gte: inicioMes } },
      }),
      this.prisma.documento.count({
        where: { ...docWhere, estado: 'EN_REVISION' },
      }),
      this.prisma.documento.findMany({
        where: docWhere,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          codigo: true,
          asunto: true,
          estado: true,
          fechaDocumento: true,
          updatedAt: true,
        },
      }),
      isAdmin
        ? this.prisma.user.count({ where: { activo: true } })
        : Promise.resolve(null),
      isAdmin
        ? this.prisma.user.count({
            where: {
              activo: true,
              roles: { some: { role: { activo: true } } },
            },
          })
        : Promise.resolve(null),
      this.prisma.auditLog.count({
        where: { action: 'AUTH_LOGIN_OK', createdAt: { gte: since30d } },
      }),
      this.prisma.auditLog.count({
        where: { action: 'AUTH_LOGIN_FAIL', createdAt: { gte: since30d } },
      }),
      this.prisma.auditLog.count({
        where: { action: 'AUTHZ_FORBIDDEN', createdAt: { gte: since30d } },
      }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: since30d } } }),
      this.prisma.documento.count({
        where: {
          ...docWhere,
          eventos: { some: { createdAt: { gte: since30d } } },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: { startsWith: 'DOC_' },
          result: 'OK',
          createdAt: { gte: since30d },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: { startsWith: 'DOC_' },
          result: 'FAIL',
          createdAt: { gte: since30d },
        },
      }),
      this.prisma.auditLog.findFirst({
        orderBy: [{ createdAt: 'desc' }],
        select: { createdAt: true },
      }),
      this.prisma.auditLog.findFirst({
        where: { action: 'AUTH_LOGIN_OK' },
        orderBy: [{ createdAt: 'desc' }],
        select: { createdAt: true },
      }),
      this.prisma.auditLog.findFirst({
        where: { action: AUDIT_ACTION_BACKUP_VERIFIED, result: 'OK' },
        orderBy: [{ createdAt: 'desc' }],
        select: { createdAt: true },
      }),
    ]);

    const loginTotal = loginOk30d + loginFail30d;
    const authSuccessPercent =
      loginTotal > 0 ? (loginOk30d / loginTotal) * 100 : 0;

    const accessTotal = totalAudit30d;
    const accessControlPercent =
      accessTotal > 0 ? (1 - authzForbidden30d / accessTotal) * 100 : 0;

    const identityPercent =
      isAdmin && (usuariosActivos ?? 0) > 0
        ? ((activeUsersWithRole ?? 0) / (usuariosActivos ?? 1)) * 100
        : 0;

    const traceabilityPercent =
      documentosTotal > 0 ? (docsWithEvents30d / documentosTotal) * 100 : 0;

    const docTotalActions = docOk30d + docFail30d;
    const inputValidationPercent =
      docTotalActions > 0 ? (docOk30d / docTotalActions) * 100 : 0;

    const alertasItems: DashboardAlertItem[] = [];
    if (pendientesRevision > 0) {
      alertasItems.push({
        codigo: 'PENDIENTES_REVISION',
        mensaje: `Hay ${pendientesRevision} documento(s) en estado «En revisión» pendiente(s) de atención por un revisor.`,
      });
    }
    if (authzForbidden30d > 0) {
      alertasItems.push({
        codigo: 'AUTHZ_FORBIDDEN',
        mensaje: `Se registraron ${authzForbidden30d} acceso(s) denegado(s) por permisos (HTTP 403 en auditoría) en los últimos 30 días.`,
      });
    }
    if (loginFail30d > 0) {
      alertasItems.push({
        codigo: 'AUTH_LOGIN_FAIL',
        mensaje: `Se registraron ${loginFail30d} intento(s) fallido(s) de inicio de sesión en los últimos 30 días; revisar Auditoría (AUTH_LOGIN_FAIL) o posibles abusos.`,
      });
    }
    if (isAdmin && !lastBackupVerified) {
      alertasItems.push({
        codigo: 'BACKUP_SIN_REGISTRO',
        mensaje:
          'No hay verificación de respaldo registrada en el sistema; tras la copia MySQL/storage use Respaldos → «Registrar verificación».',
      });
    }
    const alerts = alertasItems.length;

    const compliance: DashboardComplianceMetric[] = [
      {
        key: 'access_control',
        title: 'Control de acceso',
        standard: 'ISO 27001 A.5.15',
        percent: clampPercent(accessControlPercent),
        evidence: {
          audit_total_30d: accessTotal,
          authz_forbidden_30d: authzForbidden30d,
        },
      },
      {
        key: 'identity_management',
        title: 'Gestión de identidades',
        standard: 'ISO 27001 A.5.16',
        percent: clampPercent(identityPercent),
        evidence: {
          users_active: usuariosActivos ?? 0,
          users_active_with_role: activeUsersWithRole ?? 0,
        },
      },
      {
        key: 'authentication_information',
        title: 'Información de autenticación',
        standard: 'ISO 27001 A.5.17 · ASVS V2',
        percent: clampPercent(authSuccessPercent),
        evidence: {
          auth_login_ok_30d: loginOk30d,
          auth_login_fail_30d: loginFail30d,
        },
      },
      {
        key: 'document_traceability',
        title: 'Trazabilidad documental',
        standard: 'ISO 15489',
        percent: clampPercent(traceabilityPercent),
        evidence: {
          documentos_total: documentosTotal,
          documentos_con_eventos_30d: docsWithEvents30d,
        },
      },
      {
        key: 'input_validation',
        title: 'Validación de entradas',
        standard: 'OWASP ASVS V5',
        percent: clampPercent(inputValidationPercent),
        evidence: {
          doc_actions_ok_30d: docOk30d,
          doc_actions_fail_30d: docFail30d,
        },
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        documentosTotal,
        documentosCreadosEsteMes,
        pendientesRevision,
        usuariosActivos: usuariosActivos ?? null,
        alertas: alerts,
        alertasItems,
      },
      documentosRecientes: docsRecent.map((d) => ({
        id: d.id,
        codigo: d.codigo,
        asunto: d.asunto,
        estado: d.estado,
        fechaDocumento: d.fechaDocumento.toISOString(),
        ultimaActividadAt: d.updatedAt.toISOString(),
      })),
      compliance,
      lastSignals: {
        lastAuditAt: lastAudit?.createdAt?.toISOString() ?? null,
        lastLoginOkAt: lastLoginOk?.createdAt?.toISOString() ?? null,
        lastBackupVerifiedAt:
          lastBackupVerified?.createdAt?.toISOString() ?? null,
      },
    };
  }

  /**
   * Agregación para indicadores de reportes (ADMIN): documentos activos por tipo documental.
   * Respeta el mismo ámbito de visibilidad que el listado (`documentoVisibilityWhere`).
   */
  async getDocumentosPorTipoReporte(
    viewer: JwtRequestUser,
    filtros: {
      fechaDesde?: Date;
      fechaHasta?: Date;
      dependenciaId?: string;
      tipoDocumentalId?: string;
    },
  ): Promise<{ items: DashboardDocumentoPorTipoItem[] }> {
    if (!jwtUserIsAdmin(viewer)) {
      throw new ForbiddenException();
    }

    const vis = documentoVisibilityWhere(viewer);
    const rango =
      filtros.fechaDesde || filtros.fechaHasta
        ? ({
            fechaDocumento: {
              ...(filtros.fechaDesde ? { gte: filtros.fechaDesde } : {}),
              ...(filtros.fechaHasta ? { lte: filtros.fechaHasta } : {}),
            },
          } satisfies Prisma.DocumentoWhereInput)
        : null;

    const filtroTipo = filtros.tipoDocumentalId
      ? ({ tipoDocumentalId: filtros.tipoDocumentalId } satisfies Prisma.DocumentoWhereInput)
      : null;
    const filtroDep = filtros.dependenciaId
      ? ({ dependenciaId: filtros.dependenciaId } satisfies Prisma.DocumentoWhereInput)
      : null;

    const AND: Prisma.DocumentoWhereInput[] = [{ activo: true }];
    if (vis) AND.push(vis);
    if (rango) AND.push(rango);
    if (filtroTipo) AND.push(filtroTipo);
    if (filtroDep) AND.push(filtroDep);

    const grouped = await this.prisma.documento.groupBy({
      by: ['tipoDocumentalId'],
      where: { AND },
      _count: { _all: true },
    });

    const ids = grouped.map((g) => g.tipoDocumentalId);
    if (ids.length === 0) {
      return { items: [] };
    }

    const tipos = await this.prisma.tipoDocumental.findMany({
      where: { id: { in: ids }, activo: true },
      select: { id: true, nombre: true, codigo: true },
    });
    const map = new Map(tipos.map((t) => [t.id, t]));

    const items: DashboardDocumentoPorTipoItem[] = grouped
      .map((g) => {
        const t = map.get(g.tipoDocumentalId);
        return {
          nombre: t?.nombre ?? g.tipoDocumentalId.slice(0, 8),
          codigo: t?.codigo ?? '',
          count: g._count._all,
        };
      })
      .sort((a, b) => b.count - a.count);

    return { items };
  }
}
