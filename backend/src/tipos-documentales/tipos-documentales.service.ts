import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../auditoria/audit.service';
import type { AuditContext } from '../auditoria/audit.types';
import { jwtUserIsAdmin, type JwtRequestUser } from '../auth/request-user';
import { isPrismaCode } from '../common/prisma-util';
import {
  normalizeAdministrativeCodigo,
  normalizeAdministrativeText,
  normalizeOptionalAdministrativeText,
} from '../common/text-normalize.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoDocumentalDto } from './dto/create-tipo-documental.dto';
import { UpdateTipoDocumentalDto } from './dto/update-tipo-documental.dto';

@Injectable()
export class TiposDocumentalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Catálogo operativo: solo activos por defecto.
   * `incluirInactivos` solo ADMIN/SUPERADMIN.
   */
  async findAll(incluirInactivos: boolean, viewer: JwtRequestUser) {
    if (incluirInactivos && !jwtUserIsAdmin(viewer)) {
      throw new ForbiddenException(
        'No puede listar tipos documentales inactivos',
      );
    }
    return this.prisma.tipoDocumental.findMany({
      where: incluirInactivos ? undefined : { activo: true },
      orderBy: { codigo: 'asc' },
    });
  }

  /** Detalle: inactivo → 404 seguro para no-admin. */
  async findOne(id: string, viewer: JwtRequestUser) {
    const row = await this.prisma.tipoDocumental.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Tipo documental no encontrado');
    }
    if (!row.activo && !jwtUserIsAdmin(viewer)) {
      throw new NotFoundException('Tipo documental no encontrado');
    }
    return row;
  }

  /**
   * Nueva asignación a documento: tipo existente y activo.
   * `null`/`undefined` no-op (el DTO de creación exige el campo).
   */
  async assertAssignable(id: string | null | undefined): Promise<void> {
    if (id === undefined || id === null) {
      return;
    }
    const t = await this.prisma.tipoDocumental.findUnique({
      where: { id },
      select: { id: true, activo: true },
    });
    if (!t) {
      throw new BadRequestException('Tipo documental no encontrado');
    }
    if (!t.activo) {
      throw new BadRequestException('Tipo documental inactivo');
    }
  }

  async create(dto: CreateTipoDocumentalDto, ctx?: AuditContext) {
    const codigo = normalizeAdministrativeCodigo(dto.codigo);
    const nombre = normalizeAdministrativeText(dto.nombre);
    if (!nombre) {
      throw new BadRequestException('Nombre de tipo documental requerido');
    }
    try {
      const created = await this.prisma.tipoDocumental.create({
        data: {
          codigo,
          nombre,
          descripcion:
            normalizeOptionalAdministrativeText(dto.descripcion) ?? null,
        },
      });
      await this.audit.log({
        action: 'TIPO_DOCUMENTAL_CREATED',
        result: 'OK',
        resource: { type: 'TipoDocumental', id: created.id },
        context: ctx,
        meta: { codigo: created.codigo },
      });
      return created;
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException(
          'Ya existe un tipo documental con ese código',
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateTipoDocumentalDto, ctx?: AuditContext) {
    const before = await this.prisma.tipoDocumental.findUnique({
      where: { id },
    });
    if (!before) {
      throw new NotFoundException('Tipo documental no encontrado');
    }
    if (
      dto.nombre === undefined &&
      dto.descripcion === undefined &&
      dto.activo === undefined
    ) {
      return before;
    }
    if (dto.nombre !== undefined) {
      const nombre = normalizeAdministrativeText(dto.nombre);
      if (!nombre) {
        throw new BadRequestException('Nombre de tipo documental requerido');
      }
    }
    try {
      const updated = await this.prisma.tipoDocumental.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined && {
            nombre: normalizeAdministrativeText(dto.nombre)!,
          }),
          ...(dto.descripcion !== undefined && {
            descripcion:
              normalizeOptionalAdministrativeText(dto.descripcion) ?? null,
          }),
          ...(dto.activo !== undefined && { activo: dto.activo }),
        },
      });
      const action =
        dto.activo === undefined
          ? 'TIPO_DOCUMENTAL_UPDATED'
          : dto.activo
            ? 'TIPO_DOCUMENTAL_ACTIVATED'
            : 'TIPO_DOCUMENTAL_DEACTIVATED';
      await this.audit.log({
        action,
        result: 'OK',
        resource: { type: 'TipoDocumental', id: updated.id },
        context: ctx,
        meta: {
          codigo: updated.codigo,
          ...(dto.activo !== undefined && { activo: updated.activo }),
        },
      });
      return updated;
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2025')) {
        throw new NotFoundException('Tipo documental no encontrado');
      }
      throw e;
    }
  }
}
