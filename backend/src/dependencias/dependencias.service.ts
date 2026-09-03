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
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

@Injectable()
export class DependenciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Catálogo operativo: solo activas por defecto.
   * `incluirInactivos` queda restringido a ADMIN/SUPERADMIN (no ampliar a USER).
   */
  async findAll(incluirInactivos: boolean, viewer: JwtRequestUser) {
    if (incluirInactivos && !jwtUserIsAdmin(viewer)) {
      throw new ForbiddenException('No puede listar dependencias inactivas');
    }
    return this.prisma.dependencia.findMany({
      where: incluirInactivos ? undefined : { activo: true },
      orderBy: { codigo: 'asc' },
    });
  }

  /**
   * Detalle: USER/roles no admin no enumeran inactivas (404 seguro).
   * ADMIN puede ver históricas inactivas.
   */
  async findOne(id: string, viewer: JwtRequestUser) {
    const row = await this.prisma.dependencia.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Dependencia no encontrada');
    }
    if (!row.activo && !jwtUserIsAdmin(viewer)) {
      throw new NotFoundException('Dependencia no encontrada');
    }
    return row;
  }

  /** Asignación a usuario/documento: debe existir y estar activa. */
  async assertAssignable(id: string): Promise<void> {
    const d = await this.prisma.dependencia.findUnique({ where: { id } });
    if (!d) {
      throw new BadRequestException('Dependencia no encontrada');
    }
    if (!d.activo) {
      throw new BadRequestException('Dependencia inactiva');
    }
  }

  async create(dto: CreateDependenciaDto, ctx?: AuditContext) {
    const codigo = normalizeAdministrativeCodigo(dto.codigo);
    const nombre = normalizeAdministrativeText(dto.nombre);
    if (!nombre) {
      throw new BadRequestException('Nombre de dependencia requerido');
    }
    try {
      const created = await this.prisma.dependencia.create({
        data: {
          codigo,
          nombre,
          descripcion:
            normalizeOptionalAdministrativeText(dto.descripcion) ?? null,
        },
      });
      await this.audit.log({
        action: 'DEPENDENCIA_CREATED',
        result: 'OK',
        resource: { type: 'Dependencia', id: created.id },
        context: ctx,
        meta: { codigo: created.codigo },
      });
      return created;
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException('Ya existe una dependencia con ese código');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateDependenciaDto, ctx?: AuditContext) {
    const before = await this.prisma.dependencia.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException('Dependencia no encontrada');
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
        throw new BadRequestException('Nombre de dependencia requerido');
      }
    }
    try {
      const updated = await this.prisma.dependencia.update({
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
          ? 'DEPENDENCIA_UPDATED'
          : dto.activo
            ? 'DEPENDENCIA_ACTIVATED'
            : 'DEPENDENCIA_DEACTIVATED';
      await this.audit.log({
        action,
        result: 'OK',
        resource: { type: 'Dependencia', id: updated.id },
        context: ctx,
        meta: {
          codigo: updated.codigo,
          ...(dto.activo !== undefined && {
            activoAntes: before.activo,
            activoDespues: updated.activo,
          }),
        },
      });
      return updated;
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2025')) {
        throw new NotFoundException('Dependencia no encontrada');
      }
      throw e;
    }
  }
}
