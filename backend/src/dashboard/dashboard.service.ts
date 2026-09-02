import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import type { JwtRequestUser } from '../auth/request-user';
import { jwtUserIsAdmin, jwtUserIsRevisor } from '../auth/request-user';
import type { AuditResult } from '../auditoria/audit.types';
import { AuditService } from '../auditoria/audit.service';
import { mesNombreEc } from '../common/date-labels.util';
import {
  buildDistribucionPorTipo,
  type DistribucionPorTipoItem,
} from './documentos-distribucion-tipo.util';
import {
  buildTopActividadPorUsuario,
  displayUserName,
  type ActividadPorUsuarioItem,
} from './documentos-por-usuario.util';
import {
  aggregateCreatedAtByMonth,
  buildUltimos12MesesRanges,
  fillDocumentosPorMesSeries,
} from './documentos-por-mes.util';
import {
  buildTiposPorMes,
  type TipoDocumentalSerie,
  type TipoPorMesItem,
} from './documentos-tipo-por-mes.util';
import { fillDocumentosPorEstadoCounts } from './documentos-por-estado.util';
import {
  buildDashboardActivityItems,
  dashboardActivityActionsForAdmin,
  dashboardActivityActionsForUser,
  type DashboardActivityItem,
} from './dashboard-activity.util';
import { computeActividadMes } from './dashboard-mes-comparacion.util';
import {
  buildEvaluacionLikertSummary,
  emptyEvaluacionLikertSummary,
  LIKERT_DIAS_UMBRAL_DEFAULT,
  type EvaluacionLikertSummary,
} from './evaluacion-likert.util';
import {
  profileDocumentoIdFromMeta,
  parseAuditMetaJson,
} from '../auditoria/audit-action-labels.util';
import {
  AUDIT_ACTION_BACKUP_VERIFIED,
  BACKUP_META_SOURCE_MANUAL,
} from '../backup/backup.constants';
import { documentoVisibilityWhere } from '../documentos/documento-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import type { DashboardAlertCodigo } from './dto/acknowledge-dashboard-alert.dto';

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
  /** meta.source cuando existe (manual_registry | scheduled_mysqldump). */
  source: string | null;
  notes: string | null;
  tipoRespaldo: string | null;
  tamanoLabel: string | null;
  tamanoBytes: number | null;
};

export type DashboardBackupOverviewDto = {
  schemaVersion: 2;
  lastVerifiedAt: string | null;
  /** Pista institucional y/o expresión cron del respaldo automático en servidor. */
  siguienteCopiaEtiqueta: string | null;
  verificaciones90d: { ok: number; fail: number };
  historial: DashboardBackupVerificationRowDto[];
  automatedBackup: {
    enabled: boolean;
    cronExpression: string | null;
    includeStorageZip: boolean;
  };
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

export type DashboardDocumentoPorMesItem = {
  anio: number;
  mes: number;
  nombreMes: string;
  cantidad: number;
};

export type DashboardDocumentosBloque = {
  total: number;
  registrados: number;
  borradores: number;
  enRevision: number;
  aprobados: number;
  rechazados: number;
  creadosEsteMes: number;
  acumuladosAnteriores: number;
};

export type DashboardActividadMes = {
  esteMes: number;
  mesAnterior: number;
  variacionPorcentaje: number | null;
  mensaje: string | null;
};

export type DashboardPendienteRevision = {
  id: string;
  codigo: string;
  asunto: string;
  estado: string;
  fechaDocumento: string;
  tipoDocumental: string | null;
  ultimaActividadAt: string;
};

export type DashboardUsuariosResumen = {
  activos: number;
  inactivos: number;
};

export type DashboardAuditResumen = {
  accionesHoy: number;
  okHoy: number;
  failHoy: number;
};

export type DashboardViewerContext = {
  dependenciaNombre: string | null;
};

export type DashboardDistribucionPorTipoItem = DistribucionPorTipoItem;

export type DashboardTipoDocumentalSerie = TipoDocumentalSerie;

export type DashboardTipoPorMesItem = TipoPorMesItem;

export type DashboardActividadPorUsuarioItem = ActividadPorUsuarioItem;

export type DashboardMiActividadDocumental = {
  documentosRegistradosEsteMes: number;
  documentosVisibles: number;
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
  documentos: DashboardDocumentosBloque;
  documentosPorMes: DashboardDocumentoPorMesItem[];
  distribucionPorTipo: DashboardDistribucionPorTipoItem[];
  tiposDocumentalesSeries: DashboardTipoDocumentalSerie[];
  tiposPorMes: DashboardTipoPorMesItem[];
  actividadPorUsuario: DashboardActividadPorUsuarioItem[] | null;
  miActividadDocumental: DashboardMiActividadDocumental | null;
  actividadMes: DashboardActividadMes;
  actividadReciente: DashboardActivityItem[];
  documentosPendientes: DashboardPendienteRevision[];
  usuariosResumen: DashboardUsuariosResumen | null;
  auditResumen: DashboardAuditResumen | null;
  viewer: DashboardViewerContext;
  /** Evaluación Likert / semáforo de salud documental (datos reales). */
  evaluacionLikert: EvaluacionLikertSummary;
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

async function countDocumentosPorEstado(
  prisma: PrismaService,
  docWhere: Prisma.DocumentoWhereInput,
) {
  const grouped = await prisma.documento.groupBy({
    by: ['estado'],
    where: docWhere,
    _count: { _all: true },
  });
  return fillDocumentosPorEstadoCounts(
    grouped.map((g) => ({ estado: g.estado, count: g._count._all })),
  );
}

async function buildDistribucionPorTipoForDashboard(
  prisma: PrismaService,
  docWhere: Prisma.DocumentoWhereInput,
): Promise<DashboardDistribucionPorTipoItem[]> {
  const grouped = await prisma.documento.groupBy({
    by: ['tipoDocumentalId'],
    where: docWhere,
    _count: { _all: true },
  });
  if (grouped.length === 0) {
    return [];
  }
  const ids = grouped.map((g) => g.tipoDocumentalId);
  const tipos = await prisma.tipoDocumental.findMany({
    where: { id: { in: ids } },
    select: { id: true, codigo: true, nombre: true },
  });
  const map = new Map(tipos.map((t) => [t.id, t]));
  const raw = grouped.map((g) => {
    const t = map.get(g.tipoDocumentalId);
    return {
      codigo: t?.codigo ?? 'SIN_TIPO',
      nombre: t?.nombre ?? 'Sin tipo',
      cantidad: g._count._all,
    };
  });
  return buildDistribucionPorTipo(raw);
}

async function buildTiposPorMesForDashboard(
  prisma: PrismaService,
  docWhere: Prisma.DocumentoWhereInput,
  now: Date,
): Promise<{
  series: DashboardTipoDocumentalSerie[];
  items: DashboardTipoPorMesItem[];
}> {
  const ranges = buildUltimos12MesesRanges(now);
  const desde = ranges[0]?.desde;
  const hasta = ranges[ranges.length - 1]?.hasta;
  if (!desde || !hasta) {
    return { series: [], items: [] };
  }
  const rows = await prisma.documento.findMany({
    where: {
      ...docWhere,
      createdAt: { gte: desde, lte: hasta },
    },
    select: {
      createdAt: true,
      tipoDocumental: { select: { codigo: true, nombre: true } },
    },
  });
  const mapped = rows.map((r) => ({
    createdAt: r.createdAt,
    tipoCodigo: r.tipoDocumental.codigo,
    tipoNombre: r.tipoDocumental.nombre,
  }));
  return buildTiposPorMes(ranges, mapped, mesNombreEc);
}

async function buildActividadPorUsuarioForDashboard(
  prisma: PrismaService,
  docWhere: Prisma.DocumentoWhereInput,
  desde: Date,
): Promise<DashboardActividadPorUsuarioItem[]> {
  const grouped = await prisma.documento.groupBy({
    by: ['createdById', 'tipoDocumentalId'],
    where: { ...docWhere, createdAt: { gte: desde } },
    _count: { _all: true },
  });
  if (grouped.length === 0) {
    return [];
  }

  const userIds = [...new Set(grouped.map((g) => g.createdById))];
  const tipoIds = [...new Set(grouped.map((g) => g.tipoDocumentalId))];

  const [users, tipos] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        nombres: true,
        apellidos: true,
        roles: {
          where: { role: { activo: true } },
          select: { role: { select: { nombre: true } } },
          take: 1,
          orderBy: { role: { codigo: 'asc' } },
        },
      },
    }),
    prisma.tipoDocumental.findMany({
      where: { id: { in: tipoIds } },
      select: { id: true, codigo: true, nombre: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const tipoMap = new Map(tipos.map((t) => [t.id, t]));

  const byUser = new Map<
    string,
    {
      total: number;
      tipos: Map<
        string,
        { tipoId: string; codigo: string; nombre: string; cantidad: number }
      >;
    }
  >();

  for (const g of grouped) {
    const count = g._count._all;
    if (!byUser.has(g.createdById)) {
      byUser.set(g.createdById, { total: 0, tipos: new Map() });
    }
    const entry = byUser.get(g.createdById)!;
    entry.total += count;

    const tipo = tipoMap.get(g.tipoDocumentalId);
    const tipoId = g.tipoDocumentalId;
    const codigo = tipo?.codigo ?? 'SIN_TIPO';
    const nombre = tipo?.nombre ?? 'Sin clasificar';
    const existing = entry.tipos.get(tipoId);
    if (existing) {
      existing.cantidad += count;
    } else {
      entry.tipos.set(tipoId, { tipoId, codigo, nombre, cantidad: count });
    }
  }

  const raw = [...byUser.entries()].map(([usuarioId, data]) => {
    const u = userMap.get(usuarioId);
    const email = u?.email ?? 'usuario@local';
    return {
      usuarioId,
      nombre: displayUserName(u?.nombres ?? null, u?.apellidos ?? null, email),
      email,
      rolNombre: u?.roles[0]?.role.nombre ?? 'Usuario',
      documentosRegistrados: data.total,
      tiposRaw: [...data.tipos.values()],
    };
  });

  return buildTopActividadPorUsuario(raw);
}

async function buildDocumentosPorMes(
  prisma: PrismaService,
  docWhere: Prisma.DocumentoWhereInput,
  now: Date,
): Promise<DashboardDocumentoPorMesItem[]> {
  const ranges = buildUltimos12MesesRanges(now);
  const desde = ranges[0]?.desde;
  const hasta = ranges[ranges.length - 1]?.hasta;
  if (!desde || !hasta) {
    return [];
  }
  const rows = await prisma.documento.findMany({
    where: {
      ...docWhere,
      createdAt: { gte: desde, lte: hasta },
    },
    select: { createdAt: true },
  });
  const counts = aggregateCreatedAtByMonth(rows.map((r) => r.createdAt));
  return fillDocumentosPorMesSeries(ranges, counts, mesNombreEc);
}

async function buildEvaluacionLikert(
  prisma: PrismaService,
  scopeWhere: Prisma.DocumentoWhereInput | undefined,
  now: Date,
): Promise<EvaluacionLikertSummary> {
  const where: Prisma.DocumentoWhereInput = scopeWhere ?? {};
  const MAX_ROWS = 5000;
  const rows = await prisma.documento.findMany({
    where,
    take: MAX_ROWS,
    select: {
      activo: true,
      estado: true,
      updatedAt: true,
      fechaLimiteSla: true,
    },
  });
  if (rows.length === 0) {
    return emptyEvaluacionLikertSummary(LIKERT_DIAS_UMBRAL_DEFAULT);
  }
  return buildEvaluacionLikertSummary(rows, now, LIKERT_DIAS_UMBRAL_DEFAULT);
}

export { AUDIT_ACTION_BACKUP_VERIFIED } from '../backup/backup.constants';

function parseBackupVerifiedMeta(metaJson: string | null): {
  notes?: string;
  tipoRespaldo?: string;
  tamanoLabel?: string;
  tamanoBytes?: number;
  source?: string;
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
    const source = typeof m.source === 'string' ? m.source : undefined;
    return { notes, tipoRespaldo, tamanoLabel, tamanoBytes, source };
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
      result?: 'OK' | 'FAIL';
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
    const verdict: AuditResult = payload?.result === 'FAIL' ? 'FAIL' : 'OK';
    const notes = payload?.notes?.trim();
    const tipo = payload?.tipoRespaldo?.trim();
    const tamLabel = payload?.tamanoLabel?.trim();
    const tamBytes = payload?.tamanoBytes;

    const meta: Record<string, unknown> = {
      source: BACKUP_META_SOURCE_MANUAL,
    };
    if (notes && notes.length > 0) meta.notes = notes.slice(0, 500);
    if (tipo && tipo.length > 0) meta.tipoRespaldo = tipo.slice(0, 64);
    if (tamLabel && tamLabel.length > 0)
      meta.tamanoLabel = tamLabel.slice(0, 40);
    if (
      typeof tamBytes === 'number' &&
      Number.isFinite(tamBytes) &&
      tamBytes >= 0
    ) {
      meta.tamanoBytes = Math.floor(tamBytes);
    }

    await this.audit.log({
      action: AUDIT_ACTION_BACKUP_VERIFIED,
      result: verdict,
      context: {
        actorUserId: viewer.id,
        actorEmail: viewer.email,
      },
      meta,
    });
    return { ok: true, recordedAt: recordedAt.toISOString() };
  }

  async getBackupOverview(
    viewer: JwtRequestUser,
  ): Promise<DashboardBackupOverviewDto> {
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
          source:
            typeof m.source === 'string' && m.source.length > 0
              ? m.source
              : null,
          notes: m.notes ?? null,
          tipoRespaldo: m.tipoRespaldo ?? null,
          tamanoLabel: m.tamanoLabel ?? null,
          tamanoBytes: typeof m.tamanoBytes === 'number' ? m.tamanoBytes : null,
        };
      },
    );

    const hint =
      this.config.get<string>('BACKUP_EXPECTED_SCHEDULE_HINT')?.trim() || null;

    const autoEnabled =
      this.config.get<string>('BACKUP_AUTOMATED_ENABLED')?.toLowerCase() ===
      'true';
    const cronExprRaw =
      this.config.get<string>('BACKUP_AUTOMATED_CRON')?.trim() || '0 3 * * *';
    const includeZip =
      this.config.get<string>('BACKUP_INCLUDE_STORAGE_ZIP')?.toLowerCase() ===
      'true';

    const hintParts: string[] = [];
    if (hint && hint.length > 0) hintParts.push(hint);
    if (autoEnabled && cronExprRaw.length > 0) {
      hintParts.push(`Cron automático (servidor): ${cronExprRaw}`);
    }
    const siguienteCopiaEtiqueta =
      hintParts.length > 0 ? hintParts.join(' · ') : null;

    return {
      schemaVersion: 2,
      lastVerifiedAt: lastOk?.createdAt.toISOString() ?? null,
      siguienteCopiaEtiqueta,
      verificaciones90d: { ok: ok90d, fail: fail90d },
      historial,
      automatedBackup: {
        enabled: autoEnabled,
        cronExpression: autoEnabled ? cronExprRaw : null,
        includeStorageZip: autoEnabled && includeZip,
      },
    };
  }

  async getSummary(viewer: JwtRequestUser): Promise<DashboardSummary> {
    const isAdmin = jwtUserIsAdmin(viewer);
    const vis = documentoVisibilityWhere(viewer);
    const docWhere = vis ? { AND: [{ activo: true }, vis] } : { activo: true };

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const inicioMes = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const inicioDia = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );

    const canSeePendientesList = isAdmin || jwtUserIsRevisor(viewer);

    const activityActionFilter = isAdmin
      ? dashboardActivityActionsForAdmin()
      : dashboardActivityActionsForUser();

    const activityWhere: Prisma.AuditLogWhereInput = isAdmin
      ? {
          action: { in: activityActionFilter },
          result: 'OK',
        }
      : {
          AND: [
            {
              OR: [{ actorUserId: viewer.id }, { actorEmail: viewer.email }],
            },
            { action: { in: activityActionFilter } },
            { result: 'OK' },
          ],
        };

    const [
      documentosTotal,
      documentosCreadosEsteMes,
      pendientesRevision,
      docsRecent,
      pendientesList,
      usuariosActivos,
      usuariosInactivos,
      activeUsersWithRole,
      estadosAgg,
      documentosPorMes,
      evaluacionLikert,
      activityLogs,
      viewerDependencia,
      loginOk30d,
      loginFail30d,
      authzForbidden30d,
      totalAudit30d,
      auditHoy,
      auditOkHoy,
      auditFailHoy,
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
      canSeePendientesList
        ? this.prisma.documento.findMany({
            where: { ...docWhere, estado: 'EN_REVISION' },
            orderBy: [{ updatedAt: 'desc' }],
            take: 5,
            select: {
              id: true,
              codigo: true,
              asunto: true,
              estado: true,
              fechaDocumento: true,
              updatedAt: true,
              tipoDocumental: { select: { nombre: true } },
            },
          })
        : Promise.resolve([]),
      isAdmin
        ? this.prisma.user.count({ where: { activo: true } })
        : Promise.resolve(null),
      isAdmin
        ? this.prisma.user.count({ where: { activo: false } })
        : Promise.resolve(null),
      isAdmin
        ? this.prisma.user.count({
            where: {
              activo: true,
              roles: { some: { role: { activo: true } } },
            },
          })
        : Promise.resolve(null),
      countDocumentosPorEstado(this.prisma, docWhere),
      buildDocumentosPorMes(this.prisma, docWhere, now),
      buildEvaluacionLikert(this.prisma, vis, now),
      this.prisma.auditLog.findMany({
        where: activityWhere,
        orderBy: { createdAt: 'desc' },
        take: 24,
        select: {
          id: true,
          createdAt: true,
          action: true,
          result: true,
          actorEmail: true,
          resourceType: true,
          resourceId: true,
          metaJson: true,
        },
      }),
      viewer.dependenciaId
        ? this.prisma.dependencia.findUnique({
            where: { id: viewer.dependenciaId },
            select: { nombre: true },
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
      isAdmin
        ? this.prisma.auditLog.count({
            where: { createdAt: { gte: inicioDia } },
          })
        : Promise.resolve(0),
      isAdmin
        ? this.prisma.auditLog.count({
            where: { createdAt: { gte: inicioDia }, result: 'OK' },
          })
        : Promise.resolve(0),
      isAdmin
        ? this.prisma.auditLog.count({
            where: { createdAt: { gte: inicioDia }, result: 'FAIL' },
          })
        : Promise.resolve(0),
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

    const [
      distribucionPorTipo,
      tiposPorMesBlock,
      actividadPorUsuario,
      miDocsEsteMes,
    ] = await Promise.all([
      buildDistribucionPorTipoForDashboard(this.prisma, docWhere),
      buildTiposPorMesForDashboard(this.prisma, docWhere, now),
      isAdmin
        ? buildActividadPorUsuarioForDashboard(this.prisma, docWhere, inicioMes)
        : Promise.resolve(null),
      !isAdmin
        ? this.prisma.documento.count({
            where: {
              ...docWhere,
              createdById: viewer.id,
              createdAt: { gte: inicioMes },
            },
          })
        : Promise.resolve(null),
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

    const ackMap = isAdmin
      ? await this.loadDashboardAlertAckMap(viewer.id)
      : new Map<string, { acknowledgedAt: Date; metaJson: string | null }>();

    const alertasItems: DashboardAlertItem[] = [];
    if (pendientesRevision > 0) {
      const ackPend = ackMap.get('PENDIENTES_REVISION');
      const baseline = this.parsePendientesAckMeta(
        ackPend?.metaJson ?? null,
      )?.pendientesAtAck;
      const showPendientes =
        !ackPend || baseline === undefined || pendientesRevision > baseline;
      if (showPendientes) {
        alertasItems.push({
          codigo: 'PENDIENTES_REVISION',
          mensaje: `Hay ${pendientesRevision} documento(s) en estado «En revisión» pendiente(s) de atención por un revisor.`,
        });
      }
    }
    if (isAdmin && authzForbidden30d > 0) {
      const ack403 = ackMap.get('AUTHZ_FORBIDDEN');
      const show403 =
        !ack403 ||
        (await this.auditEventsAfterAck(
          'AUTHZ_FORBIDDEN',
          since30d,
          ack403.acknowledgedAt,
        )) > 0;
      if (show403) {
        alertasItems.push({
          codigo: 'AUTHZ_FORBIDDEN',
          mensaje: `Se registraron ${authzForbidden30d} acceso(s) denegado(s) por permisos (HTTP 403 en auditoría) en los últimos 30 días.`,
        });
      }
    }
    if (isAdmin && loginFail30d > 0) {
      const ackLogin = ackMap.get('AUTH_LOGIN_FAIL');
      const showLoginFail =
        !ackLogin ||
        (await this.auditEventsAfterAck(
          'AUTH_LOGIN_FAIL',
          since30d,
          ackLogin.acknowledgedAt,
        )) > 0;
      if (showLoginFail) {
        alertasItems.push({
          codigo: 'AUTH_LOGIN_FAIL',
          mensaje: `Se registraron ${loginFail30d} intento(s) fallido(s) de inicio de sesión en los últimos 30 días; revisar Auditoría (AUTH_LOGIN_FAIL) o posibles abusos.`,
        });
      }
    }
    const backupAutoEnabled =
      this.config.get<string>('BACKUP_AUTOMATED_ENABLED')?.toLowerCase() ===
      'true';
    if (isAdmin && !lastBackupVerified && !ackMap.has('BACKUP_SIN_REGISTRO')) {
      alertasItems.push({
        codigo: 'BACKUP_SIN_REGISTRO',
        mensaje: backupAutoEnabled
          ? 'Aún no hay un evento BACKUP_VERIFIED con resultado OK; si BACKUP_AUTOMATED_ENABLED está activo, revise logs del servidor e historial en Respaldos.'
          : 'No hay verificación de respaldo OK en auditoría; tras copia MySQL/storage use Respaldos → «Registrar verificación», o habilite el respaldo automático en servidor (ver .env.example).',
      });
    }
    const alerts = alertasItems.length;

    const acumuladosAnteriores = Math.max(
      0,
      estadosAgg.total - documentosCreadosEsteMes,
    );

    const documentosBloque: DashboardDocumentosBloque = {
      total: estadosAgg.total,
      registrados: estadosAgg.registrados,
      borradores: estadosAgg.borradores,
      enRevision: estadosAgg.enRevision,
      aprobados: estadosAgg.aprobados,
      rechazados: estadosAgg.rechazados,
      creadosEsteMes: documentosCreadosEsteMes,
      acumuladosAnteriores,
    };

    const actividadMes = computeActividadMes(documentosPorMes, now);

    const docIdsForActivity = new Set<string>();
    for (const row of activityLogs) {
      const meta = parseAuditMetaJson(row.metaJson);
      const fromMeta = profileDocumentoIdFromMeta(meta);
      if (fromMeta) docIdsForActivity.add(fromMeta);
      if (row.resourceType === 'Documento' && row.resourceId) {
        docIdsForActivity.add(row.resourceId);
      }
    }
    const docsForActivity =
      docIdsForActivity.size > 0
        ? await this.prisma.documento.findMany({
            where: { id: { in: [...docIdsForActivity] } },
            select: { id: true, codigo: true },
          })
        : [];
    const codigoById = new Map(docsForActivity.map((d) => [d.id, d.codigo]));
    const actividadReciente = buildDashboardActivityItems(
      activityLogs,
      codigoById,
      {
        includeActor: isAdmin,
        max: 8,
      },
    );

    const pendientesRevisionItems: DashboardPendienteRevision[] =
      pendientesList.map((d) => ({
        id: d.id,
        codigo: d.codigo,
        asunto: d.asunto,
        estado: d.estado,
        fechaDocumento: d.fechaDocumento.toISOString(),
        tipoDocumental: d.tipoDocumental?.nombre ?? null,
        ultimaActividadAt: d.updatedAt.toISOString(),
      }));

    const compliance: DashboardComplianceMetric[] = [
      {
        key: 'access_control',
        title: 'Control de acceso',
        standard:
          'Proporción de eventos de auditoría sin denegación por permiso (últimos 30 días).',
        percent: clampPercent(accessControlPercent),
        evidence: {
          audit_total_30d: accessTotal,
          authz_forbidden_30d: authzForbidden30d,
        },
      },
      {
        key: 'identity_management',
        title: 'Gestión de identidades',
        standard:
          'Usuarios activos con al menos un rol asignado en el sistema.',
        percent: clampPercent(identityPercent),
        evidence: {
          users_active: usuariosActivos ?? 0,
          users_active_with_role: activeUsersWithRole ?? 0,
        },
      },
      {
        key: 'authentication_information',
        title: 'Información de autenticación',
        standard:
          'Proporción de inicios de sesión exitosos frente a intentos fallidos (30 días).',
        percent: clampPercent(authSuccessPercent),
        evidence: {
          auth_login_ok_30d: loginOk30d,
          auth_login_fail_30d: loginFail30d,
        },
      },
      {
        key: 'document_traceability',
        title: 'Trazabilidad documental',
        standard:
          'Documentos con al menos un evento de auditoría en los últimos 30 días.',
        percent: clampPercent(traceabilityPercent),
        evidence: {
          documentos_total: documentosTotal,
          documentos_con_eventos_30d: docsWithEvents30d,
        },
      },
      {
        key: 'input_validation',
        title: 'Validación de entradas',
        standard:
          'Operaciones documentales aceptadas frente a rechazos por validación (30 días).',
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
      documentos: documentosBloque,
      documentosPorMes,
      distribucionPorTipo,
      tiposDocumentalesSeries: tiposPorMesBlock.series,
      tiposPorMes: tiposPorMesBlock.items,
      actividadPorUsuario,
      miActividadDocumental:
        !isAdmin && miDocsEsteMes !== null
          ? {
              documentosRegistradosEsteMes: miDocsEsteMes,
              documentosVisibles: documentosTotal,
            }
          : null,
      actividadMes,
      actividadReciente,
      documentosPendientes: pendientesRevisionItems,
      usuariosResumen:
        isAdmin && usuariosActivos !== null && usuariosInactivos !== null
          ? { activos: usuariosActivos, inactivos: usuariosInactivos }
          : null,
      auditResumen: isAdmin
        ? {
            accionesHoy: auditHoy,
            okHoy: auditOkHoy,
            failHoy: auditFailHoy,
          }
        : null,
      viewer: {
        dependenciaNombre: viewerDependencia?.nombre ?? null,
      },
      evaluacionLikert,
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
      ? ({
          tipoDocumentalId: filtros.tipoDocumentalId,
        } satisfies Prisma.DocumentoWhereInput)
      : null;
    const filtroDep = filtros.dependenciaId
      ? ({
          dependenciaId: filtros.dependenciaId,
        } satisfies Prisma.DocumentoWhereInput)
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

  /**
   * Oculta una alerta del panel para el administrador actual hasta que haya actividad nueva
   * (p. ej. nuevos 403/login fallido tras la marca, o más pendientes de revisión que al descartar).
   */
  async acknowledgeDashboardAlert(
    viewer: JwtRequestUser,
    codigo: DashboardAlertCodigo,
  ): Promise<{ ok: true; codigo: string; acknowledgedAt: string }> {
    if (!jwtUserIsAdmin(viewer)) {
      throw new ForbiddenException();
    }

    let metaJson: string | null = null;
    if (codigo === 'PENDIENTES_REVISION') {
      const vis = documentoVisibilityWhere(viewer);
      const docWhere = vis
        ? { AND: [{ activo: true }, vis] }
        : { activo: true };
      const pendientesAtAck = await this.prisma.documento.count({
        where: { ...docWhere, estado: 'EN_REVISION' },
      });
      metaJson = JSON.stringify({ pendientesAtAck });
    }

    const row = await this.prisma.dashboardAlertAcknowledgment.upsert({
      where: {
        actorUserId_alertCodigo: {
          actorUserId: viewer.id,
          alertCodigo: codigo,
        },
      },
      create: {
        actorUserId: viewer.id,
        alertCodigo: codigo,
        metaJson,
      },
      update: {
        acknowledgedAt: new Date(),
        metaJson,
      },
    });

    await this.audit.log({
      action: 'DASHBOARD_ALERT_ACK',
      result: 'OK',
      resource: { type: 'DashboardAlert', id: codigo },
      context: {
        actorUserId: viewer.id,
        actorEmail: viewer.email ?? null,
      },
      meta: { codigo },
    });

    return {
      ok: true,
      codigo,
      acknowledgedAt: row.acknowledgedAt.toISOString(),
    };
  }

  private async loadDashboardAlertAckMap(userId: string) {
    const rows = await this.prisma.dashboardAlertAcknowledgment.findMany({
      where: { actorUserId: userId },
      select: { alertCodigo: true, acknowledgedAt: true, metaJson: true },
    });
    return new Map(
      rows.map((r) => [
        r.alertCodigo,
        { acknowledgedAt: r.acknowledgedAt, metaJson: r.metaJson },
      ]),
    );
  }

  private parsePendientesAckMeta(
    metaJson: string | null,
  ): { pendientesAtAck?: number } | null {
    if (!metaJson?.trim()) return null;
    try {
      const parsed: unknown = JSON.parse(metaJson);
      if (typeof parsed !== 'object' || parsed === null) return null;
      const n = (parsed as { pendientesAtAck?: unknown }).pendientesAtAck;
      return typeof n === 'number' && Number.isFinite(n)
        ? { pendientesAtAck: Math.floor(n) }
        : null;
    } catch {
      return null;
    }
  }

  /** Eventos de auditoría posteriores al descarte (o a la ventana de 30 días si no hubo descarte). */
  private auditEventsAfterAck(
    action: string,
    since30d: Date,
    acknowledgedAt: Date,
  ) {
    const from =
      acknowledgedAt.getTime() > since30d.getTime() ? acknowledgedAt : since30d;
    return this.prisma.auditLog.count({
      where: { action, createdAt: { gt: from } },
    });
  }
}
