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
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';

const cargoInclude = {
  dependencia: {
    select: { id: true, codigo: true, nombre: true, activo: true },
  },
} as const;

@Injectable()
export class CargosService {
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
      throw new ForbiddenException('No puede listar cargos inactivos');
    }
    return this.prisma.cargo.findMany({
      where: incluirInactivos ? undefined : { activo: true },
      include: cargoInclude,
      orderBy: [{ codigo: 'asc' }],
    });
  }

  /** Detalle: inactivo → 404 seguro para no-admin. */
  async findOne(id: string, viewer: JwtRequestUser) {
    const row = await this.prisma.cargo.findUnique({
      where: { id },
      include: cargoInclude,
    });
    if (!row) {
      throw new NotFoundException('Cargo no encontrado');
    }
    if (!row.activo && !jwtUserIsAdmin(viewer)) {
      throw new NotFoundException('Cargo no encontrado');
    }
    return row;
  }

  /**
   * Dependencia opcional al crear/editar cargo: debe existir y estar activa
   * (nuevas asociaciones). `null` limpia; `undefined` no cambia.
   */
  private async assertDependenciaAssignableForCargo(
    dependenciaId: string | null | undefined,
  ) {
    if (dependenciaId === undefined || dependenciaId === null) {
      return;
    }
    const d = await this.prisma.dependencia.findUnique({
      where: { id: dependenciaId },
      select: { id: true, activo: true },
    });
    if (!d) {
      throw new BadRequestException('Dependencia no encontrada');
    }
    if (!d.activo) {
      throw new BadRequestException('Dependencia inactiva');
    }
  }

  /**
   * Asignación a usuario: cargo activo; si tiene dependencia, esta activa;
   * si el usuario tiene dependencia, el cargo debe ser de esa dependencia o sin dependencia.
   */
  async assertAssignable(
    cargoId: string | null | undefined,
    userDependenciaId?: string | null,
  ): Promise<void> {
    if (cargoId === undefined || cargoId === null) {
      return;
    }
    const cargo = await this.prisma.cargo.findUnique({
      where: { id: cargoId },
      select: {
        id: true,
        activo: true,
        dependenciaId: true,
        dependencia: { select: { activo: true } },
      },
    });
    if (!cargo) {
      throw new BadRequestException('Cargo no encontrado');
    }
    if (!cargo.activo) {
      throw new BadRequestException('Cargo inactivo');
    }
    if (cargo.dependenciaId) {
      if (!cargo.dependencia?.activo) {
        throw new BadRequestException('Dependencia del cargo inactiva');
      }
      if (userDependenciaId && userDependenciaId !== cargo.dependenciaId) {
        throw new BadRequestException(
          'El cargo no pertenece a la dependencia del usuario',
        );
      }
    }
  }

  async create(dto: CreateCargoDto, ctx?: AuditContext) {
    const codigo = normalizeAdministrativeCodigo(dto.codigo);
    const nombre = normalizeAdministrativeText(dto.nombre);
    if (!nombre) {
      throw new BadRequestException('Nombre de cargo requerido');
    }
    await this.assertDependenciaAssignableForCargo(dto.dependenciaId ?? null);
    try {
      const created = await this.prisma.cargo.create({
        data: {
          codigo,
          nombre,
          descripcion:
            normalizeOptionalAdministrativeText(dto.descripcion) ?? null,
          dependenciaId: dto.dependenciaId ?? null,
        },
        include: cargoInclude,
      });
      await this.audit.log({
        action: 'CARGO_CREATED',
        result: 'OK',
        resource: { type: 'Cargo', id: created.id },
        context: ctx,
        meta: {
          codigo: created.codigo,
          dependenciaId: created.dependenciaId,
        },
      });
      return created;
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException('Ya existe un cargo con ese código');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateCargoDto, ctx?: AuditContext) {
    const before = await this.prisma.cargo.findUnique({
      where: { id },
      include: cargoInclude,
    });
    if (!before) {
      throw new NotFoundException('Cargo no encontrado');
    }
    await this.assertDependenciaAssignableForCargo(
      dto.dependenciaId === undefined ? undefined : dto.dependenciaId,
    );

    if (
      dto.dependenciaId !== undefined &&
      dto.dependenciaId !== before.dependenciaId
    ) {
      const assignedUsers = await this.prisma.user.count({
        where: { cargoId: id },
      });
      if (assignedUsers > 0) {
        throw new BadRequestException(
          'No se puede cambiar la dependencia del cargo: hay usuarios asignados',
        );
      }
    }

    if (
      dto.nombre === undefined &&
      dto.descripcion === undefined &&
      dto.activo === undefined &&
      dto.dependenciaId === undefined
    ) {
      return before;
    }
    if (dto.nombre !== undefined) {
      const nombre = normalizeAdministrativeText(dto.nombre);
      if (!nombre) {
        throw new BadRequestException('Nombre de cargo requerido');
      }
    }
    try {
      const updated = await this.prisma.cargo.update({
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
          ...(dto.dependenciaId !== undefined && {
            dependenciaId: dto.dependenciaId,
          }),
        },
        include: cargoInclude,
      });
      const action =
        dto.activo === undefined
          ? 'CARGO_UPDATED'
          : dto.activo
            ? 'CARGO_ACTIVATED'
            : 'CARGO_DEACTIVATED';
      await this.audit.log({
        action,
        result: 'OK',
        resource: { type: 'Cargo', id: updated.id },
        context: ctx,
        meta: {
          codigo: updated.codigo,
          ...(dto.activo !== undefined && { activo: updated.activo }),
          ...(dto.dependenciaId !== undefined && {
            dependenciaId: updated.dependenciaId,
          }),
        },
      });
      return updated;
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2025')) {
        throw new NotFoundException('Cargo no encontrado');
      }
      throw e;
    }
  }
}
