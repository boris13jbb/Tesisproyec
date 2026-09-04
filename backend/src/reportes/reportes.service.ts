import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { JwtRequestUser } from '../auth/request-user';
import {
  buildAuditWhere,
  enrichAuditLogsWithDocumentoCodigo,
} from '../auditoria/audit-list.util';
import { esEstadoDocumentoValido } from '../documentos/documento-estado.util';
import { documentoWhereLibre } from '../documentos/documento-q-filter.util';
import { documentoVisibilityWhere } from '../documentos/documento-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildDocumentosPorUsuarioSummary,
  buildResumenPorUsuario,
  buildRevisionFromAudit,
  type AuditReviewRow,
  type DocumentosPorUsuarioSummary,
  type ResumenPorUsuarioRow,
} from './documentos-por-usuario.util';

export type AuditReportFilter = {
  action?: string;
  result?: string;
  actorUserId?: string;
  actorEmail?: string;
  resourceType?: string;
  resourceId?: string;
  from?: Date;
  to?: Date;
};

export type DocumentosReportFilter = {
  incluirInactivos?: boolean;
  q?: string;
  archivoNombre?: string;
  archivoMime?: string;
  archivoSha256?: string;
  estado?: string;
  tipoDocumentalId?: string;
  dependenciaId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  sortBy?: 'codigo' | 'fechaDocumento' | 'estado';
  sortDir?: 'asc' | 'desc';
};

/** Filtros del reporte institucional «Documentos por usuario». */
export type DocumentosPorUsuarioFilter = {
  createdByUserId?: string;
  estado?: string;
  tipoDocumentalId?: string;
  dependenciaId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
};

export type DocumentosPorUsuarioItem = {
  id: string;
  codigo: string;
  asunto: string;
  tipoDocumental: { id: string; codigo: string; nombre: string };
  dependencia: { id: string; codigo: string; nombre: string } | null;
  creadoPor: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
    email: string;
  };
  fechaDocumento: Date;
  estado: string;
  revision: {
    revisadoPor: {
      id: string | null;
      nombres: string | null;
      apellidos: string | null;
      email: string;
    } | null;
    fecha: Date;
    decision: string;
    motivoRechazo: string | null;
  } | null;
};

export type DocumentosPorUsuarioReport = {
  items: DocumentosPorUsuarioItem[];
  summary: DocumentosPorUsuarioSummary;
  porUsuario: ResumenPorUsuarioRow[];
};

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAuditLogs(filter: AuditReportFilter) {
    const from = filter.from;
    const to = filter.to;
    const resultOk =
      filter.result === 'OK' || filter.result === 'FAIL'
        ? filter.result
        : undefined;

    const where = buildAuditWhere({
      action: filter.action,
      result: resultOk,
      actorUserId: filter.actorUserId,
      actorEmail: filter.actorEmail,
      resourceType: filter.resourceType,
      resourceId: filter.resourceId,
      from,
      to,
    });

    const MAX_ROWS = 5000;
    const raw = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_ROWS,
    });
    return enrichAuditLogsWithDocumentoCodigo(this.prisma, raw);
  }

  async findDocumentos(filter: DocumentosReportFilter, viewer: JwtRequestUser) {
    const incluirInactivos = filter.incluirInactivos ?? false;
    const q = filter.q?.trim();
    const archivoNombre = filter.archivoNombre?.trim();
    const archivoMime = filter.archivoMime?.trim();
    const archivoSha256 = filter.archivoSha256?.trim();
    const estado = filter.estado?.trim();

    const sortBy = filter.sortBy ?? 'fechaDocumento';
    const sortDir = filter.sortDir ?? 'desc';
    const orderBy: Prisma.DocumentoOrderByWithRelationInput[] =
      sortBy === 'codigo'
        ? [
            { codigo: sortDir },
            { fechaDocumento: 'desc' },
            { createdAt: 'desc' },
          ]
        : sortBy === 'estado'
          ? [
              { estado: sortDir },
              { fechaDocumento: 'desc' },
              { createdAt: 'desc' },
            ]
          : [{ fechaDocumento: sortDir }, { createdAt: 'desc' }];

    const baseWhere: Prisma.DocumentoWhereInput = {
      ...(incluirInactivos ? {} : { activo: true }),
      ...(estado ? { estado } : {}),
      ...(filter.tipoDocumentalId
        ? { tipoDocumentalId: filter.tipoDocumentalId }
        : {}),
      ...(filter.dependenciaId ? { dependenciaId: filter.dependenciaId } : {}),
      ...(filter.fechaDesde || filter.fechaHasta
        ? {
            fechaDocumento: {
              ...(filter.fechaDesde ? { gte: filter.fechaDesde } : {}),
              ...(filter.fechaHasta ? { lte: filter.fechaHasta } : {}),
            },
          }
        : {}),
      ...(archivoNombre || archivoMime || archivoSha256
        ? {
            archivos: {
              some: {
                activo: true,
                ...(archivoNombre
                  ? { originalName: { contains: archivoNombre } }
                  : {}),
                ...(archivoMime ? { mimeType: { contains: archivoMime } } : {}),
                ...(archivoSha256
                  ? { sha256: { contains: archivoSha256 } }
                  : {}),
              },
            },
          }
        : {}),
      ...documentoWhereLibre(q),
    } satisfies Prisma.DocumentoWhereInput;

    const vis = documentoVisibilityWhere(viewer);
    const where: Prisma.DocumentoWhereInput = vis
      ? { AND: [baseWhere, vis] }
      : baseWhere;

    // Límite razonable para exportaciones
    const MAX_ROWS = 5000;

    const items = await this.prisma.documento.findMany({
      where,
      orderBy,
      take: MAX_ROWS,
      include: {
        tipoDocumental: { select: { codigo: true, nombre: true } },
        dependencia: { select: { codigo: true, nombre: true } },
        createdBy: { select: { email: true } },
        archivos: {
          where: { activo: true },
          select: { id: true },
        },
      },
    });

    return items.map((d) => ({
      id: d.id,
      codigo: d.codigo,
      asunto: d.asunto,
      descripcion: d.descripcion,
      fechaDocumento: d.fechaDocumento,
      estado: d.estado,
      nivelConfidencialidad: d.nivelConfidencialidad,
      dependenciaCodigo: d.dependencia?.codigo ?? '—',
      activo: d.activo,
      tipoDocumental: `${d.tipoDocumental.codigo} — ${d.tipoDocumental.nombre}`,
      createdBy: d.createdBy.email,
      createdAt: d.createdAt,
      archivosActivos: d.archivos.length,
    }));
  }

  /**
   * Reporte operativo: documentos pendientes de revisión (R-28/R-39).
   * Reusa las mismas reglas anti‑IDOR de lectura (dependencia + confidencialidad) para no filtrar de más.
   */
  async findPendientesRevision(viewer: JwtRequestUser) {
    return this.findDocumentos(
      {
        incluirInactivos: false,
        estado: 'EN_REVISION',
        sortBy: 'fechaDocumento',
        sortDir: 'desc',
      },
      viewer,
    );
  }

  async findUsuariosActivos() {
    const MAX_ROWS = 5000;
    const users = await this.prisma.user.findMany({
      where: { activo: true },
      orderBy: [{ email: 'asc' }],
      take: MAX_ROWS,
      include: {
        dependencia: { select: { codigo: true, nombre: true } },
        cargo: { select: { codigo: true, nombre: true } },
        roles: {
          include: { role: { select: { codigo: true, nombre: true } } },
        },
      },
    });
    return users.map((u) => ({
      email: u.email,
      nombres: u.nombres ?? '',
      apellidos: u.apellidos ?? '',
      dependencia: u.dependencia
        ? `${u.dependencia.codigo} — ${u.dependencia.nombre}`
        : '—',
      cargo: u.cargo ? `${u.cargo.codigo} — ${u.cargo.nombre}` : '—',
      roles: u.roles.map((r) => r.role.codigo).join(', '),
      ultimoLoginAt: u.ultimoLoginAt,
      createdAt: u.createdAt,
    }));
  }

  async aggregateDocumentosPorDependencia(
    viewer: JwtRequestUser,
    filter?: { fechaDesde?: Date; fechaHasta?: Date },
  ) {
    const baseWhere: Prisma.DocumentoWhereInput = {
      activo: true,
      ...(filter?.fechaDesde || filter?.fechaHasta
        ? {
            fechaDocumento: {
              ...(filter.fechaDesde ? { gte: filter.fechaDesde } : {}),
              ...(filter.fechaHasta ? { lte: filter.fechaHasta } : {}),
            },
          }
        : {}),
    };
    const vis = documentoVisibilityWhere(viewer);
    const where: Prisma.DocumentoWhereInput = vis
      ? { AND: [baseWhere, vis] }
      : baseWhere;

    const grouped = await this.prisma.documento.groupBy({
      by: ['dependenciaId'],
      where,
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const depIds = grouped
      .map((g) => g.dependenciaId)
      .filter((id): id is string => Boolean(id));
    const deps = depIds.length
      ? await this.prisma.dependencia.findMany({
          where: { id: { in: depIds } },
          select: { id: true, codigo: true, nombre: true },
        })
      : [];
    const depMap = new Map(deps.map((d) => [d.id, d]));

    return grouped.map((g) => {
      const dep = g.dependenciaId ? depMap.get(g.dependenciaId) : null;
      return {
        dependenciaCodigo: dep?.codigo ?? 'SIN-DEP',
        dependenciaNombre: dep?.nombre ?? 'Sin dependencia',
        total: g._count._all,
      };
    });
  }

  async aggregateDocumentosPorEstado(
    viewer: JwtRequestUser,
    filter?: { fechaDesde?: Date; fechaHasta?: Date },
  ) {
    const baseWhere: Prisma.DocumentoWhereInput = {
      activo: true,
      ...(filter?.fechaDesde || filter?.fechaHasta
        ? {
            fechaDocumento: {
              ...(filter.fechaDesde ? { gte: filter.fechaDesde } : {}),
              ...(filter.fechaHasta ? { lte: filter.fechaHasta } : {}),
            },
          }
        : {}),
    };
    const vis = documentoVisibilityWhere(viewer);
    const where: Prisma.DocumentoWhereInput = vis
      ? { AND: [baseWhere, vis] }
      : baseWhere;

    const grouped = await this.prisma.documento.groupBy({
      by: ['estado'],
      where,
      _count: { _all: true },
      orderBy: { estado: 'asc' },
    });

    return grouped.map((g) => ({
      estado: g.estado,
      total: g._count._all,
    }));
  }

  async findActividadRevision(filter?: { from?: Date; to?: Date }) {
    const MAX_ROWS = 5000;
    const actions = ['DOC_SUBMITTED_FOR_REVIEW', 'DOC_REVIEW_RESOLVED'];
    const raw = await this.prisma.auditLog.findMany({
      where: {
        action: { in: actions },
        ...(filter?.from || filter?.to
          ? {
              createdAt: {
                ...(filter.from ? { gte: filter.from } : {}),
                ...(filter.to ? { lte: filter.to } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: MAX_ROWS,
    });
    const enriched = await enrichAuditLogsWithDocumentoCodigo(this.prisma, raw);
    return enriched.map((row) => {
      let meta: Record<string, unknown> = {};
      if (row.metaJson) {
        try {
          const parsed: unknown = JSON.parse(row.metaJson);
          if (typeof parsed === 'object' && parsed !== null) {
            meta = parsed as Record<string, unknown>;
          }
        } catch {
          meta = {};
        }
      }
      return {
        fecha: row.createdAt,
        accion: row.action,
        actorEmail: row.actorEmail ?? '—',
        documentoCodigo: row.resourceCodigo ?? '—',
        documentoId: row.resourceId ?? '',
        decision: typeof meta.decision === 'string' ? meta.decision : undefined,
        motivoRechazo:
          typeof meta.motivoRechazo === 'string'
            ? meta.motivoRechazo
            : undefined,
      };
    });
  }

  /**
   * Reporte institucional: documentos por usuario creador + última resolución
   * DOC_REVIEW_RESOLVED (revisor, fecha, decisión, motivo de rechazo).
   * Respeta documentoVisibilityWhere (anti-IDOR). Sin N+1 de auditoría.
   */
  async findDocumentosPorUsuario(
    filter: DocumentosPorUsuarioFilter,
    viewer: JwtRequestUser,
  ): Promise<DocumentosPorUsuarioReport> {
    const estadoRaw = filter.estado?.trim();
    if (estadoRaw && !esEstadoDocumentoValido(estadoRaw)) {
      throw new BadRequestException('Estado documental no válido');
    }
    const estado = estadoRaw ? estadoRaw.toUpperCase() : undefined;
    const createdByUserId = filter.createdByUserId?.trim() || undefined;

    const baseWhere: Prisma.DocumentoWhereInput = {
      activo: true,
      ...(estado ? { estado } : {}),
      ...(createdByUserId ? { createdById: createdByUserId } : {}),
      ...(filter.tipoDocumentalId
        ? { tipoDocumentalId: filter.tipoDocumentalId }
        : {}),
      ...(filter.dependenciaId ? { dependenciaId: filter.dependenciaId } : {}),
      ...(filter.fechaDesde || filter.fechaHasta
        ? {
            fechaDocumento: {
              ...(filter.fechaDesde ? { gte: filter.fechaDesde } : {}),
              ...(filter.fechaHasta ? { lte: filter.fechaHasta } : {}),
            },
          }
        : {}),
    };

    const vis = documentoVisibilityWhere(viewer);
    const where: Prisma.DocumentoWhereInput = vis
      ? { AND: [baseWhere, vis] }
      : baseWhere;

    const MAX_ROWS = 5000;
    const docs = await this.prisma.documento.findMany({
      where,
      orderBy: [{ fechaDocumento: 'desc' }, { codigo: 'asc' }],
      take: MAX_ROWS,
      select: {
        id: true,
        codigo: true,
        asunto: true,
        fechaDocumento: true,
        estado: true,
        createdById: true,
        tipoDocumental: {
          select: { id: true, codigo: true, nombre: true },
        },
        dependencia: {
          select: { id: true, codigo: true, nombre: true },
        },
        createdBy: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true,
          },
        },
      },
    });

    const docIds = docs.map((d) => d.id);
    const reviewByDoc = await this.loadLatestReviewResolutions(docIds);

    const reviewerIds = Array.from(
      new Set(
        Array.from(reviewByDoc.values())
          .map((r) => r.actorUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const reviewers = reviewerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: reviewerIds } },
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true,
          },
        })
      : [];
    const reviewerMap = new Map(reviewers.map((u) => [u.id, u]));

    const items: DocumentosPorUsuarioItem[] = docs.map((d) => {
      const audit = reviewByDoc.get(d.id);
      return {
        id: d.id,
        codigo: d.codigo,
        asunto: d.asunto,
        tipoDocumental: d.tipoDocumental,
        dependencia: d.dependencia,
        creadoPor: d.createdBy,
        fechaDocumento: d.fechaDocumento,
        estado: d.estado,
        revision: buildRevisionFromAudit(audit, reviewerMap),
      };
    });

    const summary = buildDocumentosPorUsuarioSummary(docs.map((d) => d.estado));
    const porUsuario = buildResumenPorUsuario(
      docs.map((d) => ({
        createdById: d.createdById,
        estado: d.estado,
        creadoPor: d.createdBy,
      })),
    );

    return { items, summary, porUsuario };
  }

  /** Último DOC_REVIEW_RESOLVED por documento (batch, sin N+1). */
  private async loadLatestReviewResolutions(
    documentoIds: string[],
  ): Promise<Map<string, AuditReviewRow>> {
    if (documentoIds.length === 0) return new Map();

    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: 'DOC_REVIEW_RESOLVED',
        resourceType: 'Documento',
        resourceId: { in: documentoIds },
        result: 'OK',
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        resourceId: true,
        actorUserId: true,
        actorEmail: true,
        createdAt: true,
        metaJson: true,
      },
    });

    const map = new Map<string, AuditReviewRow>();
    for (const row of logs) {
      const id = row.resourceId?.trim();
      if (!id || map.has(id)) continue;
      map.set(id, row);
    }
    return map;
  }

  async findProximosVencimiento(viewer: JwtRequestUser, diasAhead = 30) {
    const days = Math.min(365, Math.max(1, Math.trunc(diasAhead)));
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + days);
    to.setHours(23, 59, 59, 999);

    const baseWhere: Prisma.DocumentoWhereInput = {
      activo: true,
      fechaVencimiento: { gte: from, lte: to },
      estado: { notIn: ['ARCHIVADO', 'BORRADOR'] },
    };
    const vis = documentoVisibilityWhere(viewer);
    const where: Prisma.DocumentoWhereInput = vis
      ? { AND: [baseWhere, vis] }
      : baseWhere;

    const MAX_ROWS = 5000;
    const items = await this.prisma.documento.findMany({
      where,
      orderBy: [{ fechaVencimiento: 'asc' }, { codigo: 'asc' }],
      take: MAX_ROWS,
      include: {
        tipoDocumental: { select: { codigo: true, nombre: true } },
        dependencia: { select: { codigo: true, nombre: true } },
        createdBy: { select: { email: true } },
        archivos: { where: { activo: true }, select: { id: true } },
      },
    });

    return items.map((d) => ({
      id: d.id,
      codigo: d.codigo,
      asunto: d.asunto,
      fechaVencimiento: d.fechaVencimiento,
      estado: d.estado,
      dependenciaCodigo: d.dependencia?.codigo ?? '—',
      tipoDocumental: `${d.tipoDocumental.codigo} — ${d.tipoDocumental.nombre}`,
      createdBy: d.createdBy.email,
      archivosActivos: d.archivos.length,
    }));
  }
}
