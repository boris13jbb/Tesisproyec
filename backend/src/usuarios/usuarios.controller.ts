import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ResetUsuarioPasswordDto } from './dto/reset-usuario-password.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { buildAccessMatrixReference } from './access-matrix.reference';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  /** Matriz efectiva (solo referencia; permisos reales = roles en cada usuario). */
  @Get('matriz-acceso-referencia')
  matrizAccesoReferencia() {
    return buildAccessMatrixReference();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateUsuarioDto,
    @Req() req: Request & { user?: { id?: string; email?: string } },
  ) {
    return this.usuariosService.create(dto, {
      actorUserId: req.user?.id ?? null,
      actorEmail: req.user?.email ?? null,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsuarioDto,
    @Req() req: Request & { user?: { id?: string; email?: string } },
  ) {
    return this.usuariosService.update(id, dto, {
      actorUserId: req.user?.id ?? null,
      actorEmail: req.user?.email ?? null,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetUsuarioPasswordDto,
    @Req() req: Request & { user?: { id?: string; email?: string } },
  ) {
    return this.usuariosService.resetPassword(id, dto.newPassword, {
      actorUserId: req.user?.id ?? null,
      actorEmail: req.user?.email ?? null,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }
}
