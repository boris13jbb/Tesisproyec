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
import { CargosService } from './cargos.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';

@Controller('cargos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CargosController {
  constructor(private readonly cargosService: CargosService) {}

  @Get()
  findAll(@Query('incluirInactivos') incluirInactivos?: string) {
    const todos = incluirInactivos === 'true' || incluirInactivos === '1';
    return this.cargosService.findAll(todos);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cargosService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateCargoDto) {
    return this.cargosService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.CARGOS_WRITE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCargoDto) {
    return this.cargosService.update(id, dto);
  }
}
