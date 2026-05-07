import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import { DependenciasService } from './dependencias.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

@Controller('dependencias')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DependenciasController {
  constructor(private readonly dependenciasService: DependenciasService) {}

  @Get()
  findAll(@Query('incluirInactivos') incluirInactivos?: string) {
    const todos = incluirInactivos === 'true' || incluirInactivos === '1';
    return this.dependenciasService.findAll(todos);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.dependenciasService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.DEPENDENCIAS_WRITE)
  create(@Body() dto: CreateDependenciaDto) {
    return this.dependenciasService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.DEPENDENCIAS_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDependenciaDto,
  ) {
    return this.dependenciasService.update(id, dto);
  }
}
