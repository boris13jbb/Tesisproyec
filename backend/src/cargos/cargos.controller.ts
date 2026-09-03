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
import { CargosService } from './cargos.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';

@Controller('cargos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CargosController {
  constructor(private readonly cargosService: CargosService) {}

  /** Catálogo operativo (activos). `incluirInactivos` solo ADMIN/SUPERADMIN. */
  @Get()
  findAll(
    @Req() req: Request & { user: JwtRequestUser },
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    const todos = incluirInactivos === 'true' || incluirInactivos === '1';
    return this.cargosService.findAll(todos, req.user);
  }

  @Get(':id')
  findOne(
    @Req() req: Request & { user: JwtRequestUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cargosService.findOne(id, req.user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.CARGOS_WRITE)
  create(
    @Req() req: Request & { user: JwtRequestUser },
    @Body() dto: CreateCargoDto,
  ) {
    return this.cargosService.create(dto, {
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
  @Permissions(PERM.CARGOS_WRITE)
  update(
    @Req() req: Request & { user: JwtRequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCargoDto,
  ) {
    return this.cargosService.update(id, dto, {
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      ip: null,
      userAgent: null,
      correlationId: null,
    });
  }
}
