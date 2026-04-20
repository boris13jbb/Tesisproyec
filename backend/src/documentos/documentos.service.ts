import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Prisma } from '@prisma/client';
import { isPrismaCode } from '../common/prisma-util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';

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
  createdBy: { select: { id: true, email: true } },
} as const;

type DocumentoSnapshot = {
  codigo: string;
  asunto: string;
  descripcion: string | null;
  fechaDocumento: Date;
  estado: string;
  activo: boolean;
  tipoDocumentalId: string;
  subserieId: string;
  createdById: string;
};

@Injectable()
export class DocumentosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
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
    const pageSize = Math.min(100, Math.max(5, filters?.pageSize ?? 20));
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

    const where = {
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
      ...(q
        ? {
            OR: [
              { codigo: { contains: q } },
              { asunto: { contains: q } },
              { descripcion: { contains: q } },
            ],
          }
        : {}),
    } as const;

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

  async findOne(id: string) {
    const row = await this.prisma.documento.findUnique({
      where: { id },
      include: includeCatalogos,
    });
    if (!row) {
      throw new NotFoundException('Documento no encontrado');
    }
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

  async create(dto: CreateDocumentoDto, createdById: string) {
    await this.assertTipoDocumentalExists(dto.tipoDocumentalId);
    await this.assertSubserieExists(dto.subserieId);

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
          activo: documento.activo,
          tipoDocumentalId: documento.tipoDocumentalId,
          subserieId: documento.subserieId,
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

  async findEventos(documentoId: string) {
    await this.findOne(documentoId);
    return this.prisma.documentoEvento.findMany({
      where: { documentoId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, email: true } },
      },
    });
  }

  async findArchivos(documentoId: string) {
    await this.findOne(documentoId);
    return this.prisma.documentoArchivo.findMany({
      where: { documentoId, activo: true },
      orderBy: [{ createdAt: 'desc' }],
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
  ) {
    await this.findOne(documentoId);
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

      return created;
    } catch (e) {
      await fs.unlink(absPath).catch(() => undefined);
      throw e;
    }
  }

  async prepareDownloadArchivo(
    documentoId: string,
    archivoId: string,
    userId: string,
    ip: string | null,
  ) {
    await this.findOne(documentoId);
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
  ) {
    await this.findOne(documentoId);
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

    return { ok: true };
  }

  async findArchivoEventos(documentoId: string, archivoId: string) {
    await this.findOne(documentoId);
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

  async update(id: string, dto: UpdateDocumentoDto, updatedById: string) {
    const beforeFull = await this.findOne(id);
    if (dto.tipoDocumentalId !== undefined) {
      await this.assertTipoDocumentalExists(dto.tipoDocumentalId);
    }
    if (dto.subserieId !== undefined) {
      await this.assertSubserieExists(dto.subserieId);
    }
    if (
      dto.asunto === undefined &&
      dto.descripcion === undefined &&
      dto.fechaDocumento === undefined &&
      dto.tipoDocumentalId === undefined &&
      dto.subserieId === undefined &&
      dto.estado === undefined &&
      dto.activo === undefined
    ) {
      return this.findOne(id);
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
            ...(dto.estado !== undefined && { estado: dto.estado.trim() }),
            ...(dto.activo !== undefined && { activo: dto.activo }),
          },
          include: includeCatalogos,
        });

        const before: DocumentoSnapshot = {
          codigo: beforeFull.codigo,
          asunto: beforeFull.asunto,
          descripcion: beforeFull.descripcion,
          fechaDocumento: beforeFull.fechaDocumento,
          estado: beforeFull.estado,
          activo: beforeFull.activo,
          tipoDocumentalId: beforeFull.tipoDocumentalId,
          subserieId: beforeFull.subserieId,
          createdById: beforeFull.createdById,
        };
        const after: DocumentoSnapshot = {
          codigo: documento.codigo,
          asunto: documento.asunto,
          descripcion: documento.descripcion,
          fechaDocumento: documento.fechaDocumento,
          estado: documento.estado,
          activo: documento.activo,
          tipoDocumentalId: documento.tipoDocumentalId,
          subserieId: documento.subserieId,
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

      return updated;
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2025')) {
        throw new NotFoundException('Documento no encontrado');
      }
      throw e;
    }
  }
}
