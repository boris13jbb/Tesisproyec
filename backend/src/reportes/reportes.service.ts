import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { JwtRequestUser } from '../auth/request-user';
import {
  buildAuditWhere,
  enrichAuditLogsWithDocumentoCodigo,
} from '../auditoria/audit-list.util';
import { documentoWhereLibre } from '../documentos/documento-q-filter.util';
import { documentoVisibilityWhere } from '../documentos/documento-scope.util';
import { PrismaService } from '../prisma/prisma.service';

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
  serieId?: string;
  subserieId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  sortBy?: 'codigo' | 'fechaDocumento' | 'estado';
  sortDir?: 'asc' | 'desc';
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
      orderBy: [{ createdAt: 'desc' }],
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
      ...(filter.subserieId ? { subserieId: filter.subserieId } : {}),
      ...(filter.serieId ? { subserie: { serieId: filter.serieId } } : {}),
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
        subserie: {
          select: {
            codigo: true,
            nombre: true,
            serie: { select: { codigo: true, nombre: true } },
          },
        },
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
      clasificacion: `${d.subserie.serie.codigo}/${d.subserie.codigo} — ${d.subserie.nombre}`,
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
}
