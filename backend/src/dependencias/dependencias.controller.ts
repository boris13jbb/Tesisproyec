import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import type { JwtRequestUser } from '../auth/request-user';
import { DependenciasService } from './dependencias.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

@Controller('dependencias')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DependenciasController {
  constructor(private readonly dependenciasService: DependenciasService) {}

  /** Catálogo operativo (activas). `incluirInactivos` solo ADMIN/SUPERADMIN. */
  @Get()
  findAll(
    @Req() req: Request & { user: JwtRequestUser },
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    const todos = incluirInactivos === 'true' || incluirInactivos === '1';
    return this.dependenciasService.findAll(todos, req.user);
  }

  @Get(':id')
  findOne(
    @Req() req: Request & { user: JwtRequestUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dependenciasService.findOne(id, req.user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.DEPENDENCIAS_WRITE)
  create(
    @Req() req: Request & { user: JwtRequestUser },
    @Body() dto: CreateDependenciaDto,
  ) {
    return this.dependenciasService.create(dto, {
      actorUserId: req.user.id,
      actorEmail: req.user.email ?? null,
      ip: req.ip ?? null,
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : null,
      correlationId: null,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.DEPENDENCIAS_WRITE)
  update(
    @Req() req: Request & { user: JwtRequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDependenciaDto,
  ) {
    return this.dependenciasService.update(id, dto, {
      actorUserId: req.user.id,
      actorEmail: req.user.email ?? null,
      ip: req.ip ?? null,
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : null,
      correlationId: null,
    });
  }
}
