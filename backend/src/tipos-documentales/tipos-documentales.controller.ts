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
import { CreateTipoDocumentalDto } from './dto/create-tipo-documental.dto';
import { UpdateTipoDocumentalDto } from './dto/update-tipo-documental.dto';
import { TiposDocumentalesService } from './tipos-documentales.service';

@Controller('tipos-documentales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TiposDocumentalesController {
  constructor(private readonly service: TiposDocumentalesService) {}

  /** Catálogo operativo (activos). `incluirInactivos` solo ADMIN/SUPERADMIN. */
  @Get()
  findAll(
    @Req() req: Request & { user: JwtRequestUser },
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    const todos = incluirInactivos === 'true' || incluirInactivos === '1';
    return this.service.findAll(todos, req.user);
  }

  @Get(':id')
  findOne(
    @Req() req: Request & { user: JwtRequestUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(id, req.user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.TIPOS_DOCUMENTALES_WRITE)
  create(
    @Req() req: Request & { user: JwtRequestUser },
    @Body() dto: CreateTipoDocumentalDto,
  ) {
    return this.service.create(dto, {
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      ip: null,
      userAgent: null,
      correlationId: null,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.TIPOS_DOCUMENTALES_WRITE)
  update(
    @Req() req: Request & { user: JwtRequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTipoDocumentalDto,
  ) {
    return this.service.update(id, dto, {
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      ip: null,
      userAgent: null,
      correlationId: null,
    });
  }
}
