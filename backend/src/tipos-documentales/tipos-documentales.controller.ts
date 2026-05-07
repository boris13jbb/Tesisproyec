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
import { CreateTipoDocumentalDto } from './dto/create-tipo-documental.dto';
import { UpdateTipoDocumentalDto } from './dto/update-tipo-documental.dto';
import { TiposDocumentalesService } from './tipos-documentales.service';

@Controller('tipos-documentales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TiposDocumentalesController {
  constructor(private readonly service: TiposDocumentalesService) {}

  @Get()
  findAll(@Query('incluirInactivos') incluirInactivos?: string) {
    const todos = incluirInactivos === 'true' || incluirInactivos === '1';
    return this.service.findAll(todos);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.TIPOS_DOCUMENTALES_WRITE)
  create(@Body() dto: CreateTipoDocumentalDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.TIPOS_DOCUMENTALES_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTipoDocumentalDto,
  ) {
    return this.service.update(id, dto);
  }
}
