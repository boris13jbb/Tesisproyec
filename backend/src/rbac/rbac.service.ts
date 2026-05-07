import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { JwtRequestUser } from '../auth/request-user';
import { ALL_PERMISSION_CODES } from '../auth/permission-codes';
import type { PermissionCode } from '../auth/permission-codes';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../auditoria/audit.service';
import { PermissionsService } from '../auth/permissions.service';

const ALL_CODES_SET = new Set<string>(ALL_PERMISSION_CODES);

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permissionsService: PermissionsService,
  ) {}

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { codigo: 'asc' },
      select: { id: true, codigo: true, descripcion: true },
    });
  }

  listRoles() {
    return this.prisma.role.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' },
      select: { id: true, codigo: true, nombre: true },
    });
  }

  async permissionsForRoleCodigo(roleCodigo: string) {
    const role = await this.prisma.role.findUnique({
      where: { codigo: roleCodigo },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    const codigos = role.permissions.map((p) => p.permission.codigo).sort();
    return { roleCodigo: role.codigo, roleNombre: role.nombre, codigos };
  }

  async myPermissionCodes(actor: JwtRequestUser) {
    const codigos = [
      ...(await this.permissionsService.getCodesForUserId(actor.id)),
    ].sort();
    return { codigos };
  }

  async replaceRolePermissions(
    roleCodigo: string,
    permissionCodes: string[],
    actor: JwtRequestUser,
    reqMeta: {
      ip: string | null;
      userAgent: string | null;
    },
  ) {
    const invalid = permissionCodes.filter((c) => !ALL_CODES_SET.has(c));
    if (invalid.length) {
      throw new BadRequestException({
        message: 'Códigos de permiso desconocidos',
        invalid,
      });
    }

    const role = await this.prisma.role.findUnique({
      where: { codigo: roleCodigo },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    const before = role.permissions.map((p) => p.permission.codigo).sort();

    const perms = await this.prisma.permission.findMany({
      where: { codigo: { in: permissionCodes } },
      select: { id: true, codigo: true },
    });
    if (perms.length !== permissionCodes.length) {
      throw new BadRequestException('Inconsistencia al resolver permisos');
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      this.prisma.rolePermission.createMany({
        data: perms.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      }),
    ]);

    const afterSorted = [...permissionCodes].sort() as PermissionCode[];

    void this.audit.log({
      action: 'ROLE_PERMISSIONS_UPDATED',
      result: 'OK',
      resource: { type: 'Role', id: role.id },
      context: {
        actorUserId: actor.id,
        actorEmail: actor.email,
        ip: reqMeta.ip,
        userAgent: reqMeta.userAgent,
      },
      meta: {
        roleCodigo: role.codigo,
        antes: before,
        despues: afterSorted,
      },
    });

    return {
      ok: true as const,
      roleCodigo: role.codigo,
      codigos: afterSorted,
    };
  }
}
