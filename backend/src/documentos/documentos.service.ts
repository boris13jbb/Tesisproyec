import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Prisma } from '@prisma/client';
import type { AuditContext } from '../auditoria/audit.types';
import { AuditService } from '../auditoria/audit.service';
import { isPrismaCode } from '../common/prisma-util';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  JwtRequestUser,
  jwtUserIsAdmin,
  jwtUserIsRevisor,
} from '../auth/request-user';
import {
  assertUsuarioPuedeVerDocumento,
  documentoVisibilityWhere,
} from './documento-scope.util';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { ResolverRevisionDto } from './dto/resolver-revision.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import {
  assertEstadoCreacionPermitido,
  assertTransicionEstado,
  normalizeDocumentoEstado,
  type DocumentoEstado,
} from './documento-estado.util';
import { documentoWhereLibre } from './documento-q-filter.util';

function escapeRegExpSegment(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `_count._all` en `documento.groupBy` con `_count: { _all: true }` (tipificación Prisma estricta). */
function documentoGroupByAll(row: {
  _count?: true | { _all?: number };
}): number {
  const c = row._count;
  if (c === undefined || c === true) return 0;
  return typeof c._all === 'number' ? c._all : 0;
}

const includeCatalogos = {
  tipoDocumental: { select: { id: true, codigo: true, nombre: true } },
  subserie: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      serie: { select: { id: true, codigo: true, nombre: true } },
    },
  },
  dependencia: { select: { id: true, codigo: true, nombre: true } },
  createdBy: {
    select: { id: true, email: true, nombres: true, apellidos: true },
  },
} as const;

type DocumentoSnapshot = {
  codigo: string;
  asunto: string;
  descripcion: string | null;
  fechaDocumento: Date;
  estado: string;
  nivelConfidencialidad: string;
  activo: boolean;
  tipoDocumentalId: string;
  subserieId: string;
  dependenciaId: string | null;
  createdById: string;
};

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  private async notifyRevisionSubmitted(input: {
    documentoId: string;
    codigo: string;
    asunto: string;
  }) {
    if (!this.mail.isConfigured()) return;
    const recipients = await this.prisma.user.findMany({
      where: {
        activo: true,
        roles: {
          some: { role: { codigo: { in: ['ADMIN', 'REVISOR'] } } },
        },
      },
      select: { email: true },
      take: 200,
    });
    const to = recipients
      .map((r) => r.email)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!to.length) return;
    await this.mail.sendIfConfigured({
      to,
      subject: `SGD-GADPR-LM — Pendiente de revisión: ${input.codigo}`,
      text: [
        'Se ha enviado un documento a revisión.',
        '',
        `Código: ${input.codigo}`,
        `Asunto: ${input.asunto}`,
        `ID: ${input.documentoId}`,
        '',
        'Acción: ingrese al sistema → Documentos → filtre “Estado → En revisión”, o use el reporte “Pendientes de revisión”.',
      ].join('\n'),
    });
  }

  private async loadDocumentoById(id: string) {
    const row = await this.prisma.documento.findUnique({
      where: { id },
      include: includeCatalogos,
    });
    if (!row) {
      throw new NotFoundException('Documento no encontrado');
    }
    return row;
  }

  private codigoPrefijoDesdeEnv(): string {
    const raw = process.env.DOCUMENTO_CODIGO_PREFIX?.trim();
    const norm = (raw && raw.length > 0 ? raw : 'DOC').replace(/\s+/g, '');
    return norm.toUpperCase();
  }

  /**
   * Correlativo `{PREFIJO}-{YYYY}-{NNNNN}` (5 dígitos, sin espacios).
   * `DOCUMENTO_CODIGO_PREFIX` (opcional); por defecto `DOC`. El año es el indicado o el calendario del servidor.
   */
  async sugerirSiguienteCodigo(anioParam?: number): Promise<{
    codigo: string;
    prefijo: string;
    anio: number;
    secuencia: number;
  }> {
    const prefijo = this.codigoPrefijoDesdeEnv();
    const y =
      typeof anioParam === 'number' && Number.isFinite(anioParam)
        ? Math.trunc(anioParam)
        : new Date().getFullYear();

    if (y < 2000 || y > 2100) {
      throw new BadRequestException('El año debe estar entre 2000 y 2100');
    }

    const start = `${prefijo}-${y}-`;
    const matcher = new RegExp(
      `^${escapeRegExpSegment(start)}(\\d{5})$`,
      'i',
    );

    const rows = await this.prisma.documento.findMany({
      where: { codigo: { startsWith: start } },
      select: { codigo: true },
    });

    let maxSeq = 0;
    for (const row of rows) {
      const m = matcher.exec(row.codigo.trim());
      if (!m) continue;
      maxSeq = Math.max(maxSeq, Number.parseInt(m[1], 10));
    }

    const next = maxSeq + 1;
    if (next > 99999) {
      throw new BadRequestException(
        'Correlativo anual agotado (máximo 99999 con esta convención).',
      );
    }

    const secStr = String(next).padStart(5, '0');
    const codigo = `${start}${secStr}`;
    return { codigo, prefijo, anio: y, secuencia: next };
  }

  async findAll(
    viewer: JwtRequestUser,
    incluirInactivos: boolean,
    filters?: {
      q?: string;
      archivoNombre?: string;
      archivoMime?: string;
      archivoSha256?: string;
      estado?: string;
      tipoDocumentalId?: string;
      serieId?: string;
      subserieId?: string;
      fechaDesde?: Date;
      fechaHasta?: Date;
      sortBy?: 'codigo' | 'fechaDocumento' | 'estado';
      sortDir?: 'asc' | 'desc';
      page?: number;
      pageSize?: number;
    },
  ) {
    const q = filters?.q?.trim();
    const archivoNombre = filters?.archivoNombre?.trim();
    const archivoMime = filters?.archivoMime?.trim();
    const archivoSha256 = filters?.archivoSha256?.trim();
    const estado = filters?.estado?.trim();
    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.min(200, Math.max(5, filters?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const sortBy = filters?.sortBy ?? 'fechaDocumento';
    const sortDir = filters?.sortDir ?? 'desc';
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
      ...(filters?.tipoDocumentalId
        ? { tipoDocumentalId: filters.tipoDocumentalId }
        : {}),
      ...(filters?.subserieId ? { subserieId: filters.subserieId } : {}),
      ...(filters?.serieId ? { subserie: { serieId: filters.serieId } } : {}),
      ...(filters?.fechaDesde || filters?.fechaHasta
        ? {
            fechaDocumento: {
              ...(filters.fechaDesde ? { gte: filters.fechaDesde } : {}),
              ...(filters.fechaHasta ? { lte: filters.fechaHasta } : {}),
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

    const scope = documentoVisibilityWhere(viewer);
    const where: Prisma.DocumentoWhereInput = scope
      ? { AND: [baseWhere, scope] }
      : baseWhere;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.documento.count({ where }),
      this.prisma.documento.findMany({
        where,
        include: includeCatalogos,
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  /**
   * Tablero Kanban (tramites): misma visibilidad y reglas que `findAll`, en una sola respuesta HTTP
   * para evitar inconsistencias y reducir ruido en cliente.
   */
  async findTablonTramites(viewer: JwtRequestUser) {
    const boardPageSize = 150;

    const [reg, rev, apr, arc, borrador, rechazado] = await Promise.all([
      this.findAll(viewer, false, {
        estado: 'REGISTRADO',
        page: 1,
        pageSize: boardPageSize,
        sortBy: 'fechaDocumento',
        sortDir: 'desc',
      }),
      this.findAll(viewer, false, {
        estado: 'EN_REVISION',
        page: 1,
        pageSize: boardPageSize,
        sortBy: 'fechaDocumento',
        sortDir: 'desc',
      }),
      this.findAll(viewer, false, {
        estado: 'APROBADO',
        page: 1,
        pageSize: boardPageSize,
        sortBy: 'fechaDocumento',
        sortDir: 'desc',
      }),
      this.findAll(viewer, false, {
        estado: 'ARCHIVADO',
        page: 1,
        pageSize: boardPageSize,
        sortBy: 'fechaDocumento',
        sortDir: 'desc',
      }),
      this.findAll(viewer, false, {
        estado: 'BORRADOR',
        page: 1,
        pageSize: 1,
      }),
      this.findAll(viewer, false, {
        estado: 'RECHAZADO',
        page: 1,
        pageSize: 1,
      }),
    ]);

    return {
      kanban: {
        REGISTRADO: reg,
        EN_REVISION: rev,
        APROBADO: apr,
        ARCHIVADO: arc,
      },
      otrosTotales: {
        BORRADOR: borrador.total,
        RECHAZADO: rechazado.total,
      },
    };
  }

  /**
   * Agregados para «Clasificación documental»: conteos por subserie y serie con la misma
   * visibilidad que los listados; dependencia / confidencialidad predominantes por mayoría entre
   * expedientes visibles (sin inventar políticas ISO no modeladas).
   */
  async getClasificacionAgregados(viewer: JwtRequestUser) {
    type Agg = {
      expedientes: number;
      dependenciaId: string | null;
      dependenciaNombre: string | null;
      nivelConfidencialidad: string | null;
    };

    const baseWhere: Prisma.DocumentoWhereInput = { activo: true };
    const scope = documentoVisibilityWhere(viewer);
    const where: Prisma.DocumentoWhereInput = scope
      ? { AND: [baseWhere, scope] }
      : baseWhere;

    const [seriesRows, subs, todasSubseriePadres, countBySub, depRows, confRows] =
      await this.prisma.$transaction([
        this.prisma.serie.findMany({
          where: { activo: true },
          select: { id: true },
        }),
        this.prisma.subserie.findMany({
          where: { activo: true },
          select: { id: true, serieId: true },
        }),
        /** Todas las subseries (árbol agregados): para mapear documentos al padre Serie aunque la subserie esté inactiva. */
        this.prisma.subserie.findMany({
          select: { id: true, serieId: true },
        }),
        this.prisma.documento.groupBy({
          by: ['subserieId'],
          where,
          _count: { _all: true },
          orderBy: { subserieId: 'asc' },
        }),
        this.prisma.documento.groupBy({
          by: ['subserieId', 'dependenciaId'],
          where,
          _count: { _all: true },
          orderBy: [{ subserieId: 'asc' }, { dependenciaId: 'asc' }],
        }),
        this.prisma.documento.groupBy({
          by: ['subserieId', 'nivelConfidencialidad'],
          where,
          _count: { _all: true },
          orderBy: [
            { subserieId: 'asc' },
            { nivelConfidencialidad: 'asc' },
          ],
        }),
      ]);

    /** Mapa global subserie → serie (incluye inactivas en catálogo). */
    const subToSerieFull = new Map(
      todasSubseriePadres.map((s) => [s.id, s.serieId]),
    );

    const exBySub = new Map(
      countBySub.map((r) => [r.subserieId, documentoGroupByAll(r)]),
    );

    const depBySub = new Map<string, Map<string | null, number>>();
    for (const r of depRows) {
      const m = depBySub.get(r.subserieId) ?? new Map();
      m.set(
        r.dependenciaId,
        (m.get(r.dependenciaId) ?? 0) + documentoGroupByAll(r),
      );
      depBySub.set(r.subserieId, m);
    }
    const confBySub = new Map<string, Map<string, number>>();
    for (const r of confRows) {
      const m = confBySub.get(r.subserieId) ?? new Map();
      m.set(
        r.nivelConfidencialidad,
        (m.get(r.nivelConfidencialidad) ?? 0) + documentoGroupByAll(r),
      );
      confBySub.set(r.subserieId, m);
    }

    function pickTopNullableBucket(m: Map<string | null, number>): string | null {
      let bestK: string | null = null;
      let bestN = -1;
      const sorted = [...m.entries()].sort(([a], [b]) =>
        String(a ?? '').localeCompare(String(b ?? '')),
      );
      for (const [k, n] of sorted) {
        if (n > bestN) {
          bestN = n;
          bestK = k;
        }
      }
      return bestN <= 0 ? null : bestK;
    }

    function pickTopConf(m: Map<string, number>): string | null {
      let bestK = '';
      let bestN = -1;
      const sorted = [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
      for (const [k, n] of sorted) {
        if (n > bestN) {
          bestN = n;
          bestK = k;
        }
      }
      return bestN <= 0 ? null : bestK;
    }

    const serieEx = new Map<string, number>();
    const serieDep = new Map<string, Map<string | null, number>>();
    const serieConf = new Map<string, Map<string, number>>();
    const serieIds = new Set(seriesRows.map((x) => x.id));

    for (const sid of serieIds) {
      serieEx.set(sid, 0);
      serieDep.set(sid, new Map());
      serieConf.set(sid, new Map());
    }

    for (const row of countBySub) {
      const serId = subToSerieFull.get(row.subserieId);
      if (!serId || !serieEx.has(serId)) continue;
      serieEx.set(serId, (serieEx.get(serId) ?? 0) + documentoGroupByAll(row));
    }
    for (const row of depRows) {
      const serId = subToSerieFull.get(row.subserieId);
      if (!serId || !serieDep.has(serId)) continue;
      const m = serieDep.get(serId)!;
      m.set(
        row.dependenciaId,
        (m.get(row.dependenciaId) ?? 0) + documentoGroupByAll(row),
      );
    }
    for (const row of confRows) {
      const serId = subToSerieFull.get(row.subserieId);
      if (!serId || !serieConf.has(serId)) continue;
      const m = serieConf.get(serId)!;
      m.set(
        row.nivelConfidencialidad,
        (m.get(row.nivelConfidencialidad) ?? 0) + documentoGroupByAll(row),
      );
    }

    const subseries: Record<string, Agg> = {};
    const depIdsNeeded = new Set<string>();

    for (const sub of subs) {
      const expedientes = exBySub.get(sub.id) ?? 0;
      let dependenciaId: string | null = null;
      let nivelConfidencialidad: string | null = null;
      if (expedientes > 0) {
        dependenciaId = pickTopNullableBucket(depBySub.get(sub.id) ?? new Map());
        nivelConfidencialidad = pickTopConf(confBySub.get(sub.id) ?? new Map());
        if (dependenciaId) depIdsNeeded.add(dependenciaId);
      }
      subseries[sub.id] = {
        expedientes,
        dependenciaId,
        dependenciaNombre: null,
        nivelConfidencialidad,
      };
    }

    const seriesAgg: Record<string, Agg> = {};
    for (const sid of serieIds) {
      const expedientes = serieEx.get(sid) ?? 0;
      let dependenciaId: string | null = null;
      let nivelConfidencialidad: string | null = null;
      if (expedientes > 0) {
        dependenciaId = pickTopNullableBucket(serieDep.get(sid) ?? new Map());
        nivelConfidencialidad = pickTopConf(serieConf.get(sid) ?? new Map());
        if (dependenciaId) depIdsNeeded.add(dependenciaId);
      }
      seriesAgg[sid] = {
        expedientes,
        dependenciaId,
        dependenciaNombre: null,
        nivelConfidencialidad,
      };
    }

    if (depIdsNeeded.size > 0) {
      const deps = await this.prisma.dependencia.findMany({
        where: { id: { in: [...depIdsNeeded] } },
        select: { id: true, nombre: true },
      });
      const nameByDep = new Map(deps.map((d) => [d.id, d.nombre]));

      for (const v of Object.values(subseries)) {
        if (v.dependenciaId) {
          v.dependenciaNombre = nameByDep.get(v.dependenciaId) ?? null;
        }
      }
      for (const v of Object.values(seriesAgg)) {
        if (v.dependenciaId) {
          v.dependenciaNombre = nameByDep.get(v.dependenciaId) ?? null;
        }
      }
    }

    return { series: seriesAgg, subseries };
  }

  async findOne(id: string, viewer: JwtRequestUser) {
    const row = await this.loadDocumentoById(id);
    assertUsuarioPuedeVerDocumento(row, viewer);
    return row;
  }

  private async assertTipoDocumentalExists(id: string) {
    const t = await this.prisma.tipoDocumental.findUnique({ where: { id } });
    if (!t) {
      throw new BadRequestException('Tipo documental no encontrado');
    }
  }

  private async assertSubserieExists(id: string) {
    const s = await this.prisma.subserie.findUnique({ where: { id } });
    if (!s) {
      throw new BadRequestException('Subserie no encontrada');
    }
  }

  private async assertDependenciaExists(id: string) {
    const d = await this.prisma.dependencia.findUnique({ where: { id } });
    if (!d) {
      throw new BadRequestException('Dependencia no encontrada');
    }
    if (!d.activo) {
      throw new BadRequestException('Dependencia inactiva');
    }
  }

  async create(dto: CreateDocumentoDto, createdById: string) {
    await this.assertTipoDocumentalExists(dto.tipoDocumentalId);
    await this.assertSubserieExists(dto.subserieId);

    const creator = await this.prisma.user.findUnique({
      where: { id: createdById },
      select: { dependenciaId: true },
    });
    if (dto.dependenciaId) {
      await this.assertDependenciaExists(dto.dependenciaId);
    }
    const dependenciaId: string | null =
      dto.dependenciaId ?? creator?.dependenciaId ?? null;

    const nivelConfidencialidad = dto.nivelConfidencialidad ?? 'INTERNO';
    const estadoInicial = normalizeDocumentoEstado(dto.estado ?? 'REGISTRADO');
    assertEstadoCreacionPermitido(estadoInicial);

    const codigo = dto.codigo.trim().toUpperCase();
    const fechaDocumento = new Date(dto.fechaDocumento);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const documento = await tx.documento.create({
          data: {
            codigo,
            asunto: dto.asunto.trim(),
            descripcion: dto.descripcion?.trim() || null,
            fechaDocumento,
            tipoDocumentalId: dto.tipoDocumentalId,
            subserieId: dto.subserieId,
            dependenciaId,
            nivelConfidencialidad,
            estado: estadoInicial,
            createdById,
          },
          include: includeCatalogos,
        });

        const snapshot: DocumentoSnapshot = {
          codigo: documento.codigo,
          asunto: documento.asunto,
          descripcion: documento.descripcion,
          fechaDocumento: documento.fechaDocumento,
          estado: documento.estado,
          nivelConfidencialidad: documento.nivelConfidencialidad,
          activo: documento.activo,
          tipoDocumentalId: documento.tipoDocumentalId,
          subserieId: documento.subserieId,
          dependenciaId: documento.dependenciaId,
          createdById: documento.createdById,
        };

        await tx.documentoEvento.create({
          data: {
            documentoId: documento.id,
            tipo: 'CREADO',
            cambiosJson: JSON.stringify({ snapshot }),
            createdById,
          },
        });

        return documento;
      });

      return created;
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException('Ya existe un documento con ese código');
      }
      throw e;
    }
  }

  async findEventos(documentoId: string, viewer: JwtRequestUser) {
    const doc = await this.loadDocumentoById(documentoId);
    assertUsuarioPuedeVerDocumento(doc, viewer);
    return this.prisma.documentoEvento.findMany({
      where: { documentoId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, email: true } },
      },
    });
  }

  async findArchivos(documentoId: string, viewer: JwtRequestUser) {
    const doc = await this.loadDocumentoById(documentoId);
    assertUsuarioPuedeVerDocumento(doc, viewer);
    return this.prisma.documentoArchivo.findMany({
      where: { documentoId, activo: true },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        version: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        createdAt: true,
        createdBy: { select: { id: true, email: true } },
      },
    });
  }

  private allowedMimes(): Set<string> {
    return new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    ]);
  }

  private sanitizeName(name: string): string {
    const base = name.trim().replace(/[/\\?%*:|"<>]/g, '_');
    const safe = base.replace(/[^\w.\- ()]/g, '_');
    return safe.length > 120 ? safe.slice(-120) : safe;
  }

  private storageRootAbs(): string {
    // backend/dist queda en backend/dist; usamos la raíz del repo: backend/../storage
    return path.resolve(process.cwd(), '..', 'storage');
  }

  async uploadArchivo(
    documentoId: string,
    file: Express.Multer.File | undefined,
    createdById: string,
    ctx?: AuditContext,
  ) {
    const docBase = await this.loadDocumentoById(documentoId);
    if (normalizeDocumentoEstado(docBase.estado) === 'ARCHIVADO') {
      throw new BadRequestException(
        'No se pueden cargar archivos en un documento archivado',
      );
    }
    if (!file) {
      throw new BadRequestException(
        'Archivo requerido (campo multipart: file)',
      );
    }
    if (!file.mimetype || !this.allowedMimes().has(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido (${file.mimetype || 'desconocido'})`,
      );
    }
    if (!file.buffer || !file.buffer.length) {
      throw new BadRequestException('Archivo vacío');
    }

    const safeOriginal = this.sanitizeName(file.originalname || 'archivo');
    const nextVersion =
      (
        await this.prisma.documentoArchivo.aggregate({
          where: { documentoId, originalName: safeOriginal },
          _max: { version: true },
        })
      )._max.version ?? 0;
    const version = nextVersion + 1;

    const archivoId = crypto.randomUUID();
    const storedName = `${archivoId}_${safeOriginal}`;
    const relDir = path.posix.join('documentos', documentoId);
    const pathRel = path.posix.join(relDir, storedName);

    const sha256 = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const sizeBytes = file.size ?? file.buffer.length;

    const absDir = path.join(this.storageRootAbs(), 'documentos', documentoId);
    const absPath = path.join(absDir, storedName);

    await fs.mkdir(absDir, { recursive: true });
    await fs.writeFile(absPath, file.buffer);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const row = await tx.documentoArchivo.create({
          data: {
            id: archivoId,
            documentoId,
            version,
            originalName: safeOriginal,
            storedName,
            mimeType: file.mimetype,
            sizeBytes,
            sha256,
            pathRel,
            createdById,
          },
          select: {
            id: true,
            version: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            sha256: true,
            createdAt: true,
            createdBy: { select: { id: true, email: true } },
          },
        });

        await tx.documentoArchivoEvento.create({
          data: {
            documentoArchivoId: row.id,
            tipo: 'SUBIDO',
            metaJson: JSON.stringify({
              originalName: row.originalName,
              version: row.version,
              mimeType: row.mimeType,
              sizeBytes: row.sizeBytes,
              sha256: row.sha256,
            }),
            createdById,
          },
        });

        return row;
      });

      await this.audit.log({
        action: 'DOC_FILE_UPLOADED',
        result: 'OK',
        resource: { type: 'DocumentoArchivo', id: created.id },
        context: {
          actorUserId: ctx?.actorUserId ?? createdById,
          actorEmail: ctx?.actorEmail ?? null,
          ip: ctx?.ip ?? null,
          userAgent: ctx?.userAgent ?? null,
          correlationId: ctx?.correlationId ?? null,
        },
        meta: {
          documentoId,
          version: created.version,
          mimeType: created.mimeType,
        },
      });

      return created;
    } catch (e) {
      await fs.unlink(absPath).catch(() => undefined);
      await this.audit.log({
        action: 'DOC_FILE_UPLOADED',
        result: 'FAIL',
        resource: { type: 'Documento', id: documentoId },
        context: {
          actorUserId: ctx?.actorUserId ?? createdById,
          actorEmail: ctx?.actorEmail ?? null,
          ip: ctx?.ip ?? null,
          userAgent: ctx?.userAgent ?? null,
          correlationId: ctx?.correlationId ?? null,
        },
      });
      throw e;
    }
  }

  async prepareDownloadArchivo(
    documentoId: string,
    archivoId: string,
    viewer: JwtRequestUser,
    ip: string | null,
    ctx?: AuditContext,
  ) {
    const doc = await this.loadDocumentoById(documentoId);
    assertUsuarioPuedeVerDocumento(doc, viewer);
    const userId = viewer.id;
    const row = await this.prisma.documentoArchivo.findFirst({
      where: { id: archivoId, documentoId, activo: true },
    });
    if (!row) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const absPath = path.join(this.storageRootAbs(), ...row.pathRel.split('/'));
    try {
      await fs.stat(absPath);
    } catch {
      throw new NotFoundException('Archivo físico no disponible');
    }

    await this.prisma.documentoArchivoEvento.create({
      data: {
        documentoArchivoId: row.id,
        tipo: 'DESCARGADO',
        metaJson: JSON.stringify({ ip }),
        createdById: userId,
      },
    });

    await this.audit.log({
      action: 'DOC_FILE_DOWNLOADED',
      result: 'OK',
      resource: { type: 'DocumentoArchivo', id: row.id },
      context: {
        actorUserId: ctx?.actorUserId ?? userId,
        actorEmail: ctx?.actorEmail ?? null,
        ip: ctx?.ip ?? ip,
        userAgent: ctx?.userAgent ?? null,
        correlationId: ctx?.correlationId ?? null,
      },
      meta: { documentoId, mimeType: row.mimeType },
    });

    return {
      absPath,
      downloadName: row.originalName,
      mimeType: row.mimeType,
    };
  }

  async deleteArchivo(
    documentoId: string,
    archivoId: string,
    deletedById: string,
    ctx?: AuditContext,
  ) {
    const docBase = await this.loadDocumentoById(documentoId);
    if (normalizeDocumentoEstado(docBase.estado) === 'ARCHIVADO') {
      throw new BadRequestException(
        'No se pueden eliminar archivos en un documento archivado',
      );
    }
    const row = await this.prisma.documentoArchivo.findFirst({
      where: { id: archivoId, documentoId, activo: true },
      select: { id: true, originalName: true, version: true },
    });
    if (!row) {
      throw new NotFoundException('Archivo no encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.documentoArchivo.update({
        where: { id: row.id },
        data: { activo: false },
      });
      await tx.documentoArchivoEvento.create({
        data: {
          documentoArchivoId: row.id,
          tipo: 'ELIMINADO',
          metaJson: JSON.stringify({
            originalName: row.originalName,
            version: row.version,
          }),
          createdById: deletedById,
        },
      });
    });

    await this.audit.log({
      action: 'DOC_FILE_DELETED',
      result: 'OK',
      resource: { type: 'DocumentoArchivo', id: row.id },
      context: {
        actorUserId: ctx?.actorUserId ?? deletedById,
        actorEmail: ctx?.actorEmail ?? null,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
        correlationId: ctx?.correlationId ?? null,
      },
      meta: { documentoId, version: row.version },
    });

    return { ok: true };
  }

  async findArchivoEventos(
    documentoId: string,
    archivoId: string,
    viewer: JwtRequestUser,
  ) {
    const doc = await this.loadDocumentoById(documentoId);
    assertUsuarioPuedeVerDocumento(doc, viewer);
    const exists = await this.prisma.documentoArchivo.findFirst({
      where: { id: archivoId, documentoId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return this.prisma.documentoArchivoEvento.findMany({
      where: { documentoArchivoId: archivoId },
      orderBy: [{ createdAt: 'desc' }],
      include: { createdBy: { select: { id: true, email: true } } },
    });
  }

  /**
   * Actualiza únicamente `estado`, deja evento ACTUALIZADO y bitácoras (incl. workflow opcional).
   */
  private async aplicarCambioEstadoSoloEstado(
    beforeFull: Awaited<ReturnType<DocumentosService['loadDocumentoById']>>,
    nuevoEstado: DocumentoEstado,
    actorId: string,
    ctx?: AuditContext,
    workflowAudit?: { action: string; extraMeta?: Record<string, unknown> },
  ) {
    const id = beforeFull.id;
    assertTransicionEstado(beforeFull.estado, nuevoEstado);

    const updated = await this.prisma.$transaction(async (tx) => {
      const documento = await tx.documento.update({
        where: { id },
        data: { estado: nuevoEstado },
        include: includeCatalogos,
      });

      const before: DocumentoSnapshot = {
        codigo: beforeFull.codigo,
        asunto: beforeFull.asunto,
        descripcion: beforeFull.descripcion,
        fechaDocumento: beforeFull.fechaDocumento,
        estado: beforeFull.estado,
        nivelConfidencialidad: beforeFull.nivelConfidencialidad,
        activo: beforeFull.activo,
        tipoDocumentalId: beforeFull.tipoDocumentalId,
        subserieId: beforeFull.subserieId,
        dependenciaId: beforeFull.dependenciaId,
        createdById: beforeFull.createdById,
      };
      const after: DocumentoSnapshot = {
        codigo: documento.codigo,
        asunto: documento.asunto,
        descripcion: documento.descripcion,
        fechaDocumento: documento.fechaDocumento,
        estado: documento.estado,
        nivelConfidencialidad: documento.nivelConfidencialidad,
        activo: documento.activo,
        tipoDocumentalId: documento.tipoDocumentalId,
        subserieId: documento.subserieId,
        dependenciaId: documento.dependenciaId,
        createdById: documento.createdById,
      };
      const diff = this.diffDocumento(before, after);

      await tx.documentoEvento.create({
        data: {
          documentoId: documento.id,
          tipo: 'ACTUALIZADO',
          cambiosJson: JSON.stringify({ diff }),
          createdById: actorId,
        },
      });

      return documento;
    });

    const desde = normalizeDocumentoEstado(beforeFull.estado);
    await this.audit.log({
      action: 'DOC_STATE_CHANGED',
      result: 'OK',
      resource: { type: 'Documento', id },
      context: {
        actorUserId: ctx?.actorUserId ?? actorId,
        actorEmail: ctx?.actorEmail ?? null,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
        correlationId: ctx?.correlationId ?? null,
      },
      meta: { from: desde, to: nuevoEstado },
    });

    if (workflowAudit) {
      await this.audit.log({
        action: workflowAudit.action,
        result: 'OK',
        resource: { type: 'Documento', id },
        context: {
          actorUserId: ctx?.actorUserId ?? actorId,
          actorEmail: ctx?.actorEmail ?? null,
          ip: ctx?.ip ?? null,
          userAgent: ctx?.userAgent ?? null,
          correlationId: ctx?.correlationId ?? null,
        },
        meta: {
          documentoId: id,
          from: desde,
          to: nuevoEstado,
          ...workflowAudit.extraMeta,
        },
      });
    }

    return updated;
  }

  /** R-28: REGISTRADO → EN_REVISION (creador o ADMIN, con visibilidad). */
  async enviarRevision(id: string, viewer: JwtRequestUser, ctx?: AuditContext) {
    const doc = await this.loadDocumentoById(id);
    assertUsuarioPuedeVerDocumento(doc, viewer);

    const puedeEnviar = jwtUserIsAdmin(viewer) || doc.createdById === viewer.id;
    if (!puedeEnviar) {
      throw new ForbiddenException(
        'Solo el administrador o quien registró el documento puede enviarlo a revisión',
      );
    }

    if (normalizeDocumentoEstado(doc.estado) !== 'REGISTRADO') {
      throw new BadRequestException(
        'Solo documentos en estado REGISTRADO pueden enviarse a revisión',
      );
    }

    const updated = await this.aplicarCambioEstadoSoloEstado(
      doc,
      'EN_REVISION',
      viewer.id,
      ctx,
      { action: 'DOC_SUBMITTED_FOR_REVIEW' },
    );

    // R-44 (MVP): notificación por correo (best-effort) a ADMIN/REVISOR si SMTP está configurado.
    await this.notifyRevisionSubmitted({
      documentoId: updated.id,
      codigo: updated.codigo,
      asunto: updated.asunto,
    });

    return updated;
  }

  /** R-28: EN_REVISION → APROBADO | RECHAZADO (ADMIN o REVISOR). Rechazo con motivo auditable. */
  async resolverRevision(
    id: string,
    dto: ResolverRevisionDto,
    viewer: JwtRequestUser,
    ctx?: AuditContext,
  ) {
    if (!jwtUserIsAdmin(viewer) && !jwtUserIsRevisor(viewer)) {
      throw new ForbiddenException(
        'Solo un revisor o administrador puede resolver la revisión',
      );
    }

    const doc = await this.loadDocumentoById(id);
    assertUsuarioPuedeVerDocumento(doc, viewer);

    if (normalizeDocumentoEstado(doc.estado) !== 'EN_REVISION') {
      throw new BadRequestException(
        'Solo documentos EN_REVISION pueden resolverse',
      );
    }

    const extraMeta: Record<string, unknown> = { decision: dto.decision };
    if (dto.decision === 'RECHAZADO' && dto.motivo) {
      extraMeta.motivoRechazo = dto.motivo;
    }

    const updated = await this.aplicarCambioEstadoSoloEstado(
      doc,
      dto.decision,
      viewer.id,
      ctx,
      {
        action: 'DOC_REVIEW_RESOLVED',
        extraMeta,
      },
    );

    // R-44 (MVP): notificación al creador del documento (best-effort) si SMTP está configurado.
    await this.mail.sendIfConfigured({
      to: doc.createdBy.email,
      subject: `SGD-GADPR-LM — Revisión resuelta: ${doc.codigo} (${dto.decision})`,
      text: [
        'Se resolvió la revisión de su documento.',
        '',
        `Código: ${doc.codigo}`,
        `Asunto: ${doc.asunto}`,
        `Decisión: ${dto.decision}`,
        ...(dto.decision === 'RECHAZADO' && dto.motivo
          ? ['', `Motivo: ${dto.motivo}`]
          : []),
        '',
        `ID: ${doc.id}`,
      ].join('\n'),
    });

    return updated;
  }

  private diffDocumento(before: DocumentoSnapshot, after: DocumentoSnapshot) {
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    const keys = Object.keys(before) as (keyof DocumentoSnapshot)[];
    for (const k of keys) {
      const a = before[k];
      const b = after[k];
      const changed =
        a instanceof Date && b instanceof Date
          ? a.getTime() !== b.getTime()
          : a !== b;
      if (changed) {
        diff[k] = {
          from: a instanceof Date ? a.toISOString() : a,
          to: b instanceof Date ? b.toISOString() : b,
        };
      }
    }
    return diff;
  }

  async update(
    id: string,
    dto: UpdateDocumentoDto,
    updatedById: string,
    ctx?: AuditContext,
  ) {
    const beforeFull = await this.loadDocumentoById(id);

    const estadoPrevio = normalizeDocumentoEstado(beforeFull.estado);
    if (estadoPrevio === 'ARCHIVADO') {
      const intentaCambiarMetadatosOEstado =
        dto.asunto !== undefined ||
        dto.descripcion !== undefined ||
        dto.fechaDocumento !== undefined ||
        dto.tipoDocumentalId !== undefined ||
        dto.subserieId !== undefined ||
        dto.estado !== undefined ||
        dto.dependenciaId !== undefined ||
        dto.nivelConfidencialidad !== undefined;
      if (intentaCambiarMetadatosOEstado) {
        throw new BadRequestException(
          'Documento archivado: solo puede modificarse el indicador de registro activo.',
        );
      }
    }

    if (dto.estado !== undefined) {
      assertTransicionEstado(
        beforeFull.estado,
        normalizeDocumentoEstado(dto.estado.trim()),
      );
    }
    if (dto.tipoDocumentalId !== undefined) {
      await this.assertTipoDocumentalExists(dto.tipoDocumentalId);
    }
    if (dto.subserieId !== undefined) {
      await this.assertSubserieExists(dto.subserieId);
    }
    if (dto.dependenciaId !== undefined) {
      if (dto.dependenciaId === null) {
        /* allow clear */
      } else {
        await this.assertDependenciaExists(dto.dependenciaId);
      }
    }
    if (
      dto.asunto === undefined &&
      dto.descripcion === undefined &&
      dto.fechaDocumento === undefined &&
      dto.tipoDocumentalId === undefined &&
      dto.subserieId === undefined &&
      dto.estado === undefined &&
      dto.activo === undefined &&
      dto.dependenciaId === undefined &&
      dto.nivelConfidencialidad === undefined
    ) {
      return this.loadDocumentoById(id);
    }
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const documento = await tx.documento.update({
          where: { id },
          data: {
            ...(dto.asunto !== undefined && { asunto: dto.asunto.trim() }),
            ...(dto.descripcion !== undefined && {
              descripcion:
                dto.descripcion === null || dto.descripcion === ''
                  ? null
                  : dto.descripcion.trim(),
            }),
            ...(dto.fechaDocumento !== undefined && {
              fechaDocumento: new Date(dto.fechaDocumento),
            }),
            ...(dto.tipoDocumentalId !== undefined && {
              tipoDocumentalId: dto.tipoDocumentalId,
            }),
            ...(dto.subserieId !== undefined && { subserieId: dto.subserieId }),
            ...(dto.estado !== undefined && {
              estado: normalizeDocumentoEstado(dto.estado.trim()),
            }),
            ...(dto.activo !== undefined && { activo: dto.activo }),
            ...(dto.dependenciaId !== undefined && {
              dependenciaId: dto.dependenciaId,
            }),
            ...(dto.nivelConfidencialidad !== undefined && {
              nivelConfidencialidad: dto.nivelConfidencialidad,
            }),
          },
          include: includeCatalogos,
        });

        const before: DocumentoSnapshot = {
          codigo: beforeFull.codigo,
          asunto: beforeFull.asunto,
          descripcion: beforeFull.descripcion,
          fechaDocumento: beforeFull.fechaDocumento,
          estado: beforeFull.estado,
          nivelConfidencialidad: beforeFull.nivelConfidencialidad,
          activo: beforeFull.activo,
          tipoDocumentalId: beforeFull.tipoDocumentalId,
          subserieId: beforeFull.subserieId,
          dependenciaId: beforeFull.dependenciaId,
          createdById: beforeFull.createdById,
        };
        const after: DocumentoSnapshot = {
          codigo: documento.codigo,
          asunto: documento.asunto,
          descripcion: documento.descripcion,
          fechaDocumento: documento.fechaDocumento,
          estado: documento.estado,
          nivelConfidencialidad: documento.nivelConfidencialidad,
          activo: documento.activo,
          tipoDocumentalId: documento.tipoDocumentalId,
          subserieId: documento.subserieId,
          dependenciaId: documento.dependenciaId,
          createdById: documento.createdById,
        };
        const diff = this.diffDocumento(before, after);

        await tx.documentoEvento.create({
          data: {
            documentoId: documento.id,
            tipo: 'ACTUALIZADO',
            cambiosJson: JSON.stringify({ diff }),
            createdById: updatedById,
          },
        });

        return documento;
      });

      if (dto.estado !== undefined) {
        const desde = estadoPrevio;
        const hasta = normalizeDocumentoEstado(dto.estado.trim());
        if (desde !== hasta) {
          await this.audit.log({
            action: 'DOC_STATE_CHANGED',
            result: 'OK',
            resource: { type: 'Documento', id },
            context: {
              actorUserId: ctx?.actorUserId ?? updatedById,
              actorEmail: ctx?.actorEmail ?? null,
              ip: ctx?.ip ?? null,
              userAgent: ctx?.userAgent ?? null,
              correlationId: ctx?.correlationId ?? null,
            },
            meta: { from: desde, to: hasta },
          });
        }
      }

      return updated;
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2025')) {
        throw new NotFoundException('Documento no encontrado');
      }
      throw e;
    }
  }
}
