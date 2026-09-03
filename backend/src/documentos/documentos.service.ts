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
import {
  assertFechaEmisionNoFutura,
  parseFechaVencimientoOptional,
} from '../common/date-validation.util';
import { normalizeAdministrativeText } from '../common/text-normalize.util';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { TiposDocumentalesService } from '../tipos-documentales/tipos-documentales.service';
import {
  JwtRequestUser,
  jwtUserIsAdmin,
  jwtUserIsRevisor,
} from '../auth/request-user';
import {
  computeFechaLimiteSla,
  computeSlaEstado,
  diasEnRevision,
  slaDiasRevisionFromEnv,
} from './documento-sla.util';
import { documentoVisibilityWhere } from './documento-scope.util';
import {
  documentoLikertWhere,
  parseLikertNivel,
} from '../dashboard/evaluacion-likert.util';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { ResolverRevisionDto } from './dto/resolver-revision.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import {
  assertEstadoCreacionPermitido,
  assertEstadoNoResuelveRevisionViaPatch,
  assertTransicionEstado,
  normalizeDocumentoEstado,
  type DocumentoEstado,
} from './documento-estado.util';
import { documentoWhereLibre } from './documento-q-filter.util';

function escapeRegExpSegment(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Delegado mínimo para correlativo (PrismaService o cliente de transacción). */
type DocumentoCodigoDb = {
  documento: {
    findMany: (
      args: Prisma.DocumentoFindManyArgs,
    ) => Promise<Array<{ codigo: string }>>;
  };
};

const partyCatalogSelect = {
  id: true,
  tipo: true,
  cedula: true,
  ruc: true,
  nombres: true,
  apellidos: true,
  razonSocial: true,
} as const;

const includeCatalogos = {
  tipoDocumental: { select: { id: true, codigo: true, nombre: true } },
  dependencia: { select: { id: true, codigo: true, nombre: true } },
  contraparte: { select: partyCatalogSelect },
  beneficiario: { select: partyCatalogSelect },
  createdBy: {
    select: { id: true, email: true, nombres: true, apellidos: true },
  },
} as const;

type DocumentoSnapshot = {
  codigo: string;
  asunto: string;
  descripcion: string | null;
  fechaDocumento: Date;
  fechaVencimiento: Date | null;
  responsableInstitucional: string | null;
  estado: string;
  nivelConfidencialidad: string;
  activo: boolean;
  tipoDocumentalId: string;
  dependenciaId: string | null;
  contraparteId: string | null;
  beneficiarioId: string | null;
  createdById: string;
};

function documentoToSnapshot(row: {
  codigo: string;
  asunto: string;
  descripcion: string | null;
  fechaDocumento: Date;
  fechaVencimiento: Date | null;
  responsableInstitucional: string | null;
  estado: string;
  nivelConfidencialidad: string;
  activo: boolean;
  tipoDocumentalId: string;
  dependenciaId: string | null;
  contraparteId: string | null;
  beneficiarioId: string | null;
  createdById: string;
}): DocumentoSnapshot {
  return {
    codigo: row.codigo,
    asunto: row.asunto,
    descripcion: row.descripcion,
    fechaDocumento: row.fechaDocumento,
    fechaVencimiento: row.fechaVencimiento,
    responsableInstitucional: row.responsableInstitucional,
    estado: row.estado,
    nivelConfidencialidad: row.nivelConfidencialidad,
    activo: row.activo,
    tipoDocumentalId: row.tipoDocumentalId,
    dependenciaId: row.dependenciaId,
    contraparteId: row.contraparteId,
    beneficiarioId: row.beneficiarioId,
    createdById: row.createdById,
  };
}

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly tiposDocumentales: TiposDocumentalesService,
  ) {}

  private enrichSlaFields<
    T extends {
      fechaIngresoRevision?: Date | null;
      fechaLimiteSla?: Date | null;
    },
  >(row: T) {
    const now = new Date();
    const slaEstado = computeSlaEstado(row.fechaLimiteSla ?? null, now);
    return {
      ...row,
      slaEstado,
      diasEnRevision: diasEnRevision(row.fechaIngresoRevision ?? null, now),
    };
  }

  private slaWhereFromFilter(
    slaEstado?: string,
  ): Prisma.DocumentoWhereInput | undefined {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const norm = slaEstado?.trim().toUpperCase();
    if (!norm || norm === 'SIN_SLA') {
      if (norm === 'SIN_SLA') return { fechaLimiteSla: null };
      return undefined;
    }
    if (norm === 'VENCIDO') {
      return { fechaLimiteSla: { lt: now } };
    }
    if (norm === 'POR_VENCER') {
      return {
        fechaLimiteSla: { gte: now, lte: tomorrow },
      };
    }
    if (norm === 'EN_PLAZO') {
      return { fechaLimiteSla: { gt: tomorrow } };
    }
    return undefined;
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

  private async loadDocumentoVisibleById(id: string, viewer: JwtRequestUser) {
    const scope = documentoVisibilityWhere(viewer);
    const row = await this.prisma.documento.findFirst({
      where: scope ? { AND: [{ id }, scope] } : { id },
      include: includeCatalogos,
    });
    if (!row) {
      // anti-IDOR: ocultar existencia
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
   * Siguiente código correlativo:
   * - Si existe algún documento con formato **`PREFIJO-NN...`** (solo dígitos tras el primer guion): continúa esa serie (mínimo 4 dígitos, ancho crece si hace falta), p. ej. `DOC-0001` → `DOC-0002`.
   * - Si no hay correlativos «simples» pero sí o solo hay **`PREFIJO-YYYY-NNNNN`**: sigue la serie anual del año indicado (5 dígitos).
   * - Base vacía para el prefijo: empieza en **`PREFIJO-0001`**.
   *
   * `DOCUMENTO_CODIGO_PREFIX` opcional; por defecto `DOC`.
   */
  async sugerirSiguienteCodigo(anioParam?: number): Promise<{
    codigo: string;
    prefijo: string;
    anio?: number;
    secuencia?: number;
  }> {
    const y =
      typeof anioParam === 'number' && Number.isFinite(anioParam)
        ? Math.trunc(anioParam)
        : new Date().getFullYear();
    return this.computeNextCodigoDesdeDb(this.prisma, y);
  }

  /** Cálculo interno (misma transacción que `create` cuando el código es automático). */
  private async computeNextCodigoDesdeDb(
    db: DocumentoCodigoDb,
    anioCalendarioDoc: number,
  ): Promise<{
    codigo: string;
    prefijo: string;
    anio?: number;
    secuencia?: number;
  }> {
    const prefijo = this.codigoPrefijoDesdeEnv();
    const prefixDash = `${prefijo}-`;

    const rows = await db.documento.findMany({
      where: { codigo: { startsWith: prefixDash } },
      select: { codigo: true },
    });

    if (rows.length === 0) {
      return { codigo: `${prefijo}-0001`, prefijo };
    }

    const simpleRe = new RegExp(
      `^${escapeRegExpSegment(prefijo)}-(\\d+)$`,
      'i',
    );
    const annualRe = new RegExp(
      `^${escapeRegExpSegment(prefijo)}-(\\d{4})-(\\d{5})$`,
      'i',
    );

    let maxSimple = 0;
    let hasSimple = false;
    let maxAnnualForY = 0;
    let hasAnnualForY = false;

    const y = Math.trunc(anioCalendarioDoc);
    for (const row of rows) {
      const c = row.codigo.trim();
      const sm = simpleRe.exec(c);
      if (sm) {
        hasSimple = true;
        const n = Number.parseInt(sm[1], 10);
        if (Number.isFinite(n)) {
          maxSimple = Math.max(maxSimple, n);
        }
        continue;
      }
      const am = annualRe.exec(c);
      if (am) {
        const year = Number.parseInt(am[1], 10);
        const seq = Number.parseInt(am[2], 10);
        if (year === y && Number.isFinite(seq)) {
          hasAnnualForY = true;
          maxAnnualForY = Math.max(maxAnnualForY, seq);
        }
      }
    }

    if (hasSimple) {
      const next = maxSimple + 1;
      if (next > 9_999_999) {
        throw new BadRequestException(
          'Correlativo simple agotado para el prefijo configurado.',
        );
      }
      const width = Math.max(4, String(next).length);
      const secStr = String(next).padStart(width, '0');
      return { codigo: `${prefijo}-${secStr}`, prefijo };
    }

    if (y < 2000 || y > 2100) {
      throw new BadRequestException('El año debe estar entre 2000 y 2100');
    }

    if (!hasAnnualForY && rows.length > 0) {
      /** Hay códigos con prefijo pero sin formato reconocido: nueva serie anual. */
      return {
        codigo: `${prefijo}-${y}-00001`,
        prefijo,
        anio: y,
        secuencia: 1,
      };
    }

    const next = maxAnnualForY + 1;
    if (next > 99_999) {
      throw new BadRequestException(
        'Correlativo anual agotado (máximo 99999 con esta convención).',
      );
    }

    const secStr = String(next).padStart(5, '0');
    const codigo = `${prefijo}-${y}-${secStr}`;
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
      dependenciaId?: string;
      fechaDesde?: Date;
      fechaHasta?: Date;
      slaEstado?: string;
      /** Filtro escala Likert (Óptimo / Moderado / Crítico). */
      likertNivel?: string;
      sortBy?:
        | 'codigo'
        | 'fechaDocumento'
        | 'estado'
        | 'fechaIngresoRevision'
        | 'fechaLimiteSla';
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
    const likertNivel = parseLikertNivel(filters?.likertNivel);
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
          : sortBy === 'fechaIngresoRevision'
            ? [
                { fechaIngresoRevision: sortDir },
                { fechaDocumento: 'desc' },
                { createdAt: 'desc' },
              ]
            : sortBy === 'fechaLimiteSla'
              ? [
                  { fechaLimiteSla: sortDir },
                  { fechaIngresoRevision: 'asc' },
                  { createdAt: 'desc' },
                ]
              : [{ fechaDocumento: sortDir }, { createdAt: 'desc' }];

    const slaWhere = this.slaWhereFromFilter(filters?.slaEstado);
    const likertWhere = likertNivel
      ? documentoLikertWhere(likertNivel)
      : undefined;
    /** Con Likert el propio filtro define activo/inactivo; no forzar solo activos. */
    const activoWhere = likertWhere
      ? {}
      : incluirInactivos
        ? {}
        : { activo: true };

    const baseWhere: Prisma.DocumentoWhereInput = {
      ...activoWhere,
      ...(estado ? { estado } : {}),
      ...(filters?.tipoDocumentalId
        ? { tipoDocumentalId: filters.tipoDocumentalId }
        : {}),
      ...(filters?.dependenciaId
        ? { dependenciaId: filters.dependenciaId }
        : {}),
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
      ...(slaWhere ?? {}),
      ...(likertWhere ?? {}),
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

    return {
      page,
      pageSize,
      total,
      items: items.map((row) => this.enrichSlaFields(row)),
    };
  }

  /**
   * Bandeja operativa de trámites en revisión con filtros SLA (R-27/R-28).
   */
  async findBandejaTramites(
    viewer: JwtRequestUser,
    filters?: {
      q?: string;
      dependenciaId?: string;
      tipoDocumentalId?: string;
      slaEstado?: string;
      page?: number;
      pageSize?: number;
      sortBy?: 'fechaIngresoRevision' | 'fechaLimiteSla' | 'codigo';
      sortDir?: 'asc' | 'desc';
    },
  ) {
    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, filters?.pageSize ?? 20));

    const list = await this.findAll(viewer, false, {
      estado: 'EN_REVISION',
      q: filters?.q,
      dependenciaId: filters?.dependenciaId,
      tipoDocumentalId: filters?.tipoDocumentalId,
      slaEstado: filters?.slaEstado,
      page,
      pageSize,
      sortBy: filters?.sortBy ?? 'fechaIngresoRevision',
      sortDir: filters?.sortDir ?? 'asc',
    });

    const slaResumen = await this.countSlaResumen(viewer);

    return {
      ...list,
      slaResumen,
      slaDiasInstitucional: slaDiasRevisionFromEnv(
        process.env.SLA_DIAS_REVISION,
      ),
    };
  }

  private async countSlaResumen(viewer: JwtRequestUser) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const base: Prisma.DocumentoWhereInput = {
      activo: true,
      estado: 'EN_REVISION',
    };
    const scope = documentoVisibilityWhere(viewer);
    const where: Prisma.DocumentoWhereInput = scope
      ? { AND: [base, scope] }
      : base;

    const [total, vencidos, porVencer, enPlazo] = await Promise.all([
      this.prisma.documento.count({ where }),
      this.prisma.documento.count({
        where: { AND: [where, { fechaLimiteSla: { lt: now } }] },
      }),
      this.prisma.documento.count({
        where: {
          AND: [where, { fechaLimiteSla: { gte: now, lte: tomorrow } }],
        },
      }),
      this.prisma.documento.count({
        where: { AND: [where, { fechaLimiteSla: { gt: tomorrow } }] },
      }),
    ]);

    return { total, vencidos, porVencer, enPlazo };
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

  async findOne(id: string, viewer: JwtRequestUser) {
    return this.loadDocumentoVisibleById(id, viewer);
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

  /**
   * Resuelve la dependencia efectiva al crear un documento.
   * ADMIN/SUPERADMIN: pueden elegir cualquier dependencia activa (o fallback a la propia).
   * Resto: solo su dependencia institucional; no pueden inyectar área ajena.
   */
  private async resolveCreateDocumentoDependencia(
    viewer: JwtRequestUser,
    requestedDependenciaId: string | undefined,
    creatorDependenciaId: string | null,
  ): Promise<string | null> {
    const requested = requestedDependenciaId?.trim() || undefined;
    const own = creatorDependenciaId ?? viewer.dependenciaId ?? null;

    if (jwtUserIsAdmin(viewer)) {
      if (requested) {
        await this.assertDependenciaExists(requested);
        return requested;
      }
      return own;
    }

    if (!own) {
      if (requested) {
        throw new ForbiddenException(
          'No puede asignar una dependencia: su cuenta no tiene dependencia institucional',
        );
      }
      return null;
    }

    if (requested && requested !== own) {
      throw new ForbiddenException(
        'No puede registrar el documento en una dependencia distinta a la suya',
      );
    }

    await this.assertDependenciaExists(own);
    return own;
  }

  async create(
    dto: CreateDocumentoDto,
    viewer: JwtRequestUser,
    ctx?: AuditContext,
  ) {
    const createdById = viewer.id;
    await this.tiposDocumentales.assertAssignable(dto.tipoDocumentalId);
    const creator = await this.prisma.user.findUnique({
      where: { id: createdById },
      select: { dependenciaId: true },
    });
    const dependenciaId = await this.resolveCreateDocumentoDependencia(
      viewer,
      dto.dependenciaId,
      creator?.dependenciaId ?? null,
    );

    const nivelConfidencialidad = dto.nivelConfidencialidad ?? 'INTERNO';
    const estadoInicial = normalizeDocumentoEstado(dto.estado ?? 'REGISTRADO');
    assertEstadoCreacionPermitido(estadoInicial);

    if (dto.contraparteId) {
      const c = await this.prisma.contraparte.findUnique({
        where: { id: dto.contraparteId },
      });
      if (!c?.activo) {
        throw new BadRequestException('Contraparte no encontrada o inactiva');
      }
    }
    if (dto.beneficiarioId) {
      const b = await this.prisma.beneficiario.findUnique({
        where: { id: dto.beneficiarioId },
      });
      if (!b?.activo) {
        throw new BadRequestException('Beneficiario no encontrado o inactivo');
      }
    }

    const fechaDocumento = new Date(dto.fechaDocumento);
    assertFechaEmisionNoFutura(fechaDocumento);
    const fechaVencimiento = parseFechaVencimientoOptional(
      dto.fechaVencimiento,
    );
    const responsableInstitucional = normalizeAdministrativeText(
      dto.responsableInstitucional,
    );
    const anioCorrelativo = fechaDocumento.getUTCFullYear();

    const explicitRaw = dto.codigo?.trim();
    const codigoUsuario = explicitRaw ? explicitRaw.toUpperCase() : null;
    const maxAttempts = codigoUsuario ? 1 : 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const created = await this.prisma.$transaction(async (tx) => {
          const codigo = codigoUsuario
            ? codigoUsuario
            : (await this.computeNextCodigoDesdeDb(tx, anioCorrelativo)).codigo;

          const documento = await tx.documento.create({
            data: {
              codigo,
              asunto:
                normalizeAdministrativeText(dto.asunto.trim()) ??
                dto.asunto.trim(),
              descripcion:
                normalizeAdministrativeText(dto.descripcion?.trim()) ?? null,
              fechaDocumento,
              fechaVencimiento: fechaVencimiento ?? null,
              responsableInstitucional,
              tipoDocumentalId: dto.tipoDocumentalId,
              dependenciaId,
              contraparteId: dto.contraparteId ?? null,
              beneficiarioId: dto.beneficiarioId ?? null,
              nivelConfidencialidad,
              estado: estadoInicial,
              createdById,
            },
            include: includeCatalogos,
          });

          const snapshot = documentoToSnapshot(documento);

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

        await this.audit.log({
          action: 'DOC_CREATED',
          result: 'OK',
          resource: { type: 'Documento', id: created.id },
          context: {
            actorUserId: ctx?.actorUserId ?? createdById,
            actorEmail: ctx?.actorEmail ?? null,
            ip: ctx?.ip ?? null,
            userAgent: ctx?.userAgent ?? null,
            correlationId: ctx?.correlationId ?? null,
          },
          meta: {
            codigo: created.codigo,
            estado: created.estado,
          },
        });

        return created;
      } catch (e: unknown) {
        if (isPrismaCode(e, 'P2002')) {
          if (codigoUsuario) {
            throw new ConflictException(
              'Ya existe un documento con ese código',
            );
          }
          if (attempt >= maxAttempts - 1) {
            throw new ConflictException(
              'No fue posible asignar un código único tras varios intentos. Intente de nuevo.',
            );
          }
          continue;
        }
        throw e;
      }
    }

    throw new ConflictException(
      'No fue posible crear el documento. Intente de nuevo.',
    );
  }

  async findEventos(documentoId: string, viewer: JwtRequestUser) {
    await this.loadDocumentoVisibleById(documentoId, viewer);
    return this.prisma.documentoEvento.findMany({
      where: { documentoId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, email: true } },
      },
    });
  }

  async findArchivos(documentoId: string, viewer: JwtRequestUser) {
    await this.loadDocumentoVisibleById(documentoId, viewer);
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

  /** Solo PDF institucional (MIME declarado). */
  private allowedMimes(): Set<string> {
    return new Set(['application/pdf']);
  }

  private assertPdfUpload(file: Express.Multer.File): void {
    const original = (file.originalname || '').trim().toLowerCase();
    if (!original.endsWith('.pdf')) {
      throw new BadRequestException('Solo se permiten archivos PDF (.pdf)');
    }
    const mime = (file.mimetype || '').trim().toLowerCase();
    if (mime && !this.allowedMimes().has(mime)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido (${file.mimetype || 'desconocido'}). Solo PDF.`,
      );
    }
    const head = file.buffer?.subarray(0, 5)?.toString('latin1') ?? '';
    if (!head.startsWith('%PDF')) {
      throw new BadRequestException(
        'El contenido no corresponde a un PDF válido',
      );
    }
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

  /**
   * Resuelve pathRel bajo storage y rechaza traversal (`../`, absolutos).
   * Defensa en profundidad: pathRel en BD debe permanecer anclado al root.
   */
  private resolveStoragePathOrThrow(pathRel: string): string {
    const root = this.storageRootAbs();
    if (!pathRel?.trim() || pathRel.includes('\0')) {
      throw new NotFoundException('Archivo físico no disponible');
    }
    const rawParts = pathRel.split(/[/\\]+/).filter((s) => s.length > 0);
    if (!rawParts.length || rawParts.some((s) => s === '..' || s === '.')) {
      throw new NotFoundException('Archivo físico no disponible');
    }
    const absPath = path.resolve(root, ...rawParts);
    const rootNorm = path.resolve(root);
    const rel = path.relative(rootNorm, absPath);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new NotFoundException('Archivo físico no disponible');
    }
    return absPath;
  }

  async uploadArchivo(
    documentoId: string,
    file: Express.Multer.File | undefined,
    viewer: JwtRequestUser,
    ctx?: AuditContext,
  ) {
    // Anti-IDOR: mismo alcance que detalle/descarga (no basta conocer el UUID).
    const docBase = await this.loadDocumentoVisibleById(documentoId, viewer);
    const createdById = viewer.id;
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
    if (!file.buffer || !file.buffer.length) {
      throw new BadRequestException('Archivo vacío');
    }
    this.assertPdfUpload(file);

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
    await this.loadDocumentoVisibleById(documentoId, viewer);
    const userId = viewer.id;
    const row = await this.prisma.documentoArchivo.findFirst({
      where: { id: archivoId, documentoId, activo: true },
    });
    if (!row) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const absPath = this.resolveStoragePathOrThrow(row.pathRel);
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
    await this.loadDocumentoVisibleById(documentoId, viewer);
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
    const desde = normalizeDocumentoEstado(beforeFull.estado);
    assertTransicionEstado(beforeFull.estado, nuevoEstado);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Condición de estado origen: bloquea doble resolución / envío concurrente.
      const changed = await tx.documento.updateMany({
        where: { id, estado: desde },
        data: { estado: nuevoEstado },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'El estado del documento cambió; refresque e intente de nuevo',
        );
      }

      const documento = await tx.documento.findUniqueOrThrow({
        where: { id },
        include: includeCatalogos,
      });

      const before = documentoToSnapshot(beforeFull);
      const after = documentoToSnapshot(documento);
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

  /**
   * R-28: REGISTRADO|RECHAZADO → EN_REVISION (creador o ADMIN, con visibilidad).
   * RECHAZADO permite reenvío formal (misma auditoría SLA que el primer envío).
   */
  async enviarRevision(id: string, viewer: JwtRequestUser, ctx?: AuditContext) {
    const doc = await this.loadDocumentoVisibleById(id, viewer);

    const puedeEnviar = jwtUserIsAdmin(viewer) || doc.createdById === viewer.id;
    if (!puedeEnviar) {
      throw new ForbiddenException(
        'Solo el administrador o quien registró el documento puede enviarlo a revisión',
      );
    }

    const estadoActual = normalizeDocumentoEstado(doc.estado);
    if (estadoActual !== 'REGISTRADO' && estadoActual !== 'RECHAZADO') {
      throw new BadRequestException(
        'Solo documentos en estado REGISTRADO o RECHAZADO pueden enviarse a revisión',
      );
    }

    const updated = await this.aplicarCambioEstadoSoloEstado(
      doc,
      'EN_REVISION',
      viewer.id,
      ctx,
      { action: 'DOC_SUBMITTED_FOR_REVIEW' },
    );

    const ingreso = new Date();
    const diasSla = slaDiasRevisionFromEnv(process.env.SLA_DIAS_REVISION);
    const limite = computeFechaLimiteSla(ingreso, diasSla);
    const withSla = await this.prisma.documento.update({
      where: { id: updated.id },
      data: {
        fechaIngresoRevision: ingreso,
        fechaLimiteSla: limite,
      },
      include: includeCatalogos,
    });

    await this.notifications.notifyRevisionSubmitted({
      documentoId: withSla.id,
      codigo: withSla.codigo,
      asunto: withSla.asunto,
    });

    return this.enrichSlaFields(withSla);
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

    const doc = await this.loadDocumentoVisibleById(id, viewer);

    if (normalizeDocumentoEstado(doc.estado) !== 'EN_REVISION') {
      throw new BadRequestException(
        'Solo documentos EN_REVISION pueden resolverse',
      );
    }

    const extraMeta: Record<string, unknown> = { decision: dto.decision };
    const motivoNormalizado =
      dto.decision === 'RECHAZADO' && dto.motivo
        ? normalizeAdministrativeText(dto.motivo)
        : null;
    if (motivoNormalizado) {
      extraMeta.motivoRechazo = motivoNormalizado;
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

    const cleared = await this.prisma.documento.update({
      where: { id: updated.id },
      data: { fechaIngresoRevision: null, fechaLimiteSla: null },
      include: includeCatalogos,
    });

    await this.notifications.notifyRevisionResolved({
      documentoId: doc.id,
      codigo: doc.codigo,
      asunto: doc.asunto,
      decision: dto.decision,
      motivo: motivoNormalizado ?? dto.motivo,
      creatorUserId: doc.createdById,
      creatorEmail: doc.createdBy.email,
    });

    return this.enrichSlaFields(cleared);
  }

  async getAccess(documentoId: string) {
    const doc = await this.prisma.documento.findUnique({
      where: { id: documentoId },
      select: {
        id: true,
        accessPolicy: true,
        userAccess: { select: { userId: true, access: true } },
        roleAccess: {
          select: { role: { select: { codigo: true } }, access: true },
        },
      },
    });
    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }
    return {
      documentoId: doc.id,
      accessPolicy: doc.accessPolicy,
      userIds: doc.userAccess
        .filter((x) => x.access === 'READ')
        .map((x) => x.userId),
      roleCodigos: doc.roleAccess
        .filter((x) => x.access === 'READ')
        .map((x) => x.role.codigo),
    };
  }

  async updateAccess(
    documentoId: string,
    input: {
      accessPolicy: 'INHERIT' | 'RESTRICTED';
      userIds: string[];
      roleCodigos?: string[];
    },
    actor: JwtRequestUser,
    ctx?: AuditContext,
  ) {
    const before = await this.getAccess(documentoId);
    const roleCodigos = (input.roleCodigos ?? []).map((r) =>
      String(r).trim().toUpperCase(),
    );

    const roles = roleCodigos.length
      ? await this.prisma.role.findMany({
          where: { codigo: { in: roleCodigos } },
          select: { id: true, codigo: true },
        })
      : [];
    const roleIdByCodigo = new Map(roles.map((r) => [r.codigo, r.id]));

    await this.prisma.$transaction(async (tx) => {
      await tx.documento.update({
        where: { id: documentoId },
        data: { accessPolicy: input.accessPolicy },
      });
      await tx.documentoUserAccess.deleteMany({ where: { documentoId } });
      await tx.documentoRoleAccess.deleteMany({ where: { documentoId } });

      if (input.accessPolicy === 'RESTRICTED') {
        const cleanedUserIds = [...new Set(input.userIds)].filter(Boolean);
        if (cleanedUserIds.length) {
          await tx.documentoUserAccess.createMany({
            data: cleanedUserIds.map((userId) => ({
              documentoId,
              userId,
              access: 'READ',
              createdById: actor.id,
            })),
          });
        }

        const cleanedRoleIds = [...new Set(roleCodigos)]
          .map((c) => roleIdByCodigo.get(c))
          .filter((x): x is string => Boolean(x));
        if (cleanedRoleIds.length) {
          await tx.documentoRoleAccess.createMany({
            data: cleanedRoleIds.map((roleId) => ({
              documentoId,
              roleId,
              access: 'READ',
              createdById: actor.id,
            })),
          });
        }
      }
    });

    const after = await this.getAccess(documentoId);
    void this.audit.log({
      action: 'DOC_ACCESS_UPDATED',
      result: 'OK',
      resource: { type: 'Documento', id: documentoId },
      context: {
        actorUserId: actor.id,
        actorEmail: actor.email,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
        correlationId: ctx?.correlationId ?? null,
      },
      meta: { before, after },
    });

    return after;
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
        dto.fechaVencimiento !== undefined ||
        dto.responsableInstitucional !== undefined ||
        dto.contraparteId !== undefined ||
        dto.beneficiarioId !== undefined ||
        dto.tipoDocumentalId !== undefined ||
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
      const estadoDestino = normalizeDocumentoEstado(dto.estado.trim());
      assertTransicionEstado(beforeFull.estado, estadoDestino);
      assertEstadoNoResuelveRevisionViaPatch(beforeFull.estado, estadoDestino);
    }
    // Nueva asignación: tipo activo. Mismo id histórico (p. ej. luego inactivo): no revalidar activo.
    if (
      dto.tipoDocumentalId !== undefined &&
      dto.tipoDocumentalId !== beforeFull.tipoDocumentalId
    ) {
      await this.tiposDocumentales.assertAssignable(dto.tipoDocumentalId);
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
      dto.fechaVencimiento === undefined &&
      dto.responsableInstitucional === undefined &&
      dto.contraparteId === undefined &&
      dto.beneficiarioId === undefined &&
      dto.tipoDocumentalId === undefined &&
      dto.estado === undefined &&
      dto.activo === undefined &&
      dto.dependenciaId === undefined &&
      dto.nivelConfidencialidad === undefined
    ) {
      return this.loadDocumentoById(id);
    }
    if (dto.fechaDocumento !== undefined) {
      const fd = new Date(dto.fechaDocumento);
      assertFechaEmisionNoFutura(fd);
    }
    if (dto.contraparteId) {
      const c = await this.prisma.contraparte.findUnique({
        where: { id: dto.contraparteId },
      });
      if (!c?.activo) {
        throw new BadRequestException('Contraparte no encontrada o inactiva');
      }
    }
    if (dto.beneficiarioId) {
      const b = await this.prisma.beneficiario.findUnique({
        where: { id: dto.beneficiarioId },
      });
      if (!b?.activo) {
        throw new BadRequestException('Beneficiario no encontrado o inactivo');
      }
    }
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const documento = await tx.documento.update({
          where: { id },
          data: {
            ...(dto.asunto !== undefined && {
              asunto:
                normalizeAdministrativeText(dto.asunto.trim()) ??
                dto.asunto.trim(),
            }),
            ...(dto.descripcion !== undefined && {
              descripcion:
                dto.descripcion === null || dto.descripcion === ''
                  ? null
                  : normalizeAdministrativeText(dto.descripcion.trim()),
            }),
            ...(dto.fechaDocumento !== undefined && {
              fechaDocumento: new Date(dto.fechaDocumento),
            }),
            ...(dto.fechaVencimiento !== undefined && {
              fechaVencimiento: parseFechaVencimientoOptional(
                dto.fechaVencimiento,
              ),
            }),
            ...(dto.responsableInstitucional !== undefined && {
              responsableInstitucional: normalizeAdministrativeText(
                dto.responsableInstitucional,
              ),
            }),
            ...(dto.contraparteId !== undefined && {
              contraparteId: dto.contraparteId,
            }),
            ...(dto.beneficiarioId !== undefined && {
              beneficiarioId: dto.beneficiarioId,
            }),
            ...(dto.tipoDocumentalId !== undefined && {
              tipoDocumentalId: dto.tipoDocumentalId,
            }),
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

        const before = documentoToSnapshot(beforeFull);
        const after = documentoToSnapshot(documento);
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

      if (dto.activo === false && beforeFull.activo) {
        await this.audit.log({
          action: 'DOC_DEACTIVATED',
          result: 'OK',
          resource: { type: 'Documento', id },
          context: {
            actorUserId: ctx?.actorUserId ?? updatedById,
            actorEmail: ctx?.actorEmail ?? null,
            ip: ctx?.ip ?? null,
            userAgent: ctx?.userAgent ?? null,
            correlationId: ctx?.correlationId ?? null,
          },
          meta: { codigo: beforeFull.codigo },
        });
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
