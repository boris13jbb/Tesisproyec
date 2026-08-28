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
import { ContrapartesService } from './contrapartes.service';
import { CreateContraparteDto } from './dto/create-contraparte.dto';
import { UpdateContraparteDto } from './dto/update-contraparte.dto';

@Controller('contrapartes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContrapartesController {
  constructor(private readonly service: ContrapartesService) {}

  @Get()
  @Permissions(PERM.DOC_READ)
  findAll(@Query('incluirInactivos') incluirInactivos?: string) {
    const todos = incluirInactivos === 'true' || incluirInactivos === '1';
    return this.service.findAll(todos);
  }

  @Get(':id')
  @Permissions(PERM.DOC_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.CONTRAPARTES_WRITE)
  create(@Body() dto: CreateContraparteDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.CONTRAPARTES_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContraparteDto,
  ) {
    return this.service.update(id, dto);
  }
}
