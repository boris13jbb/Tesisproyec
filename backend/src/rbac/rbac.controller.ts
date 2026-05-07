import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtRequestUser } from '../auth/request-user';
import { RbacService } from './rbac.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

/**
 * Gestión de la matriz rol ↔ permiso en BD (`role_permissions`).
 *
 * Regla de seguridad: **toda mutación** de RBAC (asignar/quitar permisos) es exclusiva de `ADMIN`.
 * Endpoints de lectura pueden abrirse a otros roles según necesidad, pero **no habilitan cambios**.
 */
@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('permissions')
  @Roles('ADMIN', 'USUARIO', 'REVISOR', 'AUDITOR', 'CONSULTA')
  listPermissions() {
    return this.rbac.listPermissions();
  }

  @Get('roles')
  @Roles('ADMIN', 'USUARIO', 'REVISOR', 'AUDITOR', 'CONSULTA')
  listRoles() {
    return this.rbac.listRoles();
  }

  @Get('me/permissions')
  @Roles('ADMIN', 'USUARIO', 'REVISOR', 'AUDITOR', 'CONSULTA')
  myPermissions(@Req() req: Request & { user: JwtRequestUser }) {
    return this.rbac.myPermissionCodes(req.user);
  }

  @Get('roles/:codigo/permissions')
  @Roles('ADMIN', 'USUARIO', 'REVISOR', 'AUDITOR', 'CONSULTA')
  rolePermissions(@Param('codigo') codigo: string) {
    return this.rbac.permissionsForRoleCodigo(codigo.trim().toUpperCase());
  }

  @Put('roles/:codigo/permissions')
  @Roles('ADMIN')
  async replaceRolePermissions(
    @Param('codigo') codigo: string,
    @Body() dto: UpdateRolePermissionsDto,
    @Req() req: Request & { user: JwtRequestUser },
  ) {
    const ua = req.headers['user-agent'];
    return this.rbac.replaceRolePermissions(
      codigo.trim().toUpperCase(),
      dto.permissionCodes.map((c) => c.trim()),
      req.user,
      {
        ip: req.ip ?? null,
        userAgent: typeof ua === 'string' ? ua : null,
      },
    );
  }
}
