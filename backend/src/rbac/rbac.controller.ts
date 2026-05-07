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

/** Gestión de la matriz rol ↔ permiso en BD (`role_permissions`). Sin `@Permissions`: bootstrap solo con rol ADMIN. */
@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('permissions')
  listPermissions() {
    return this.rbac.listPermissions();
  }

  @Get('roles')
  listRoles() {
    return this.rbac.listRoles();
  }

  @Get('me/permissions')
  @Roles('ADMIN', 'USUARIO', 'REVISOR', 'AUDITOR', 'CONSULTA')
  myPermissions(@Req() req: Request & { user: JwtRequestUser }) {
    return this.rbac.myPermissionCodes(req.user);
  }

  @Get('roles/:codigo/permissions')
  rolePermissions(@Param('codigo') codigo: string) {
    return this.rbac.permissionsForRoleCodigo(codigo.trim().toUpperCase());
  }

  @Put('roles/:codigo/permissions')
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
