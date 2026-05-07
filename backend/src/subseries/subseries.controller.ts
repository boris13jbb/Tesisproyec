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
import { CreateSubserieDto } from './dto/create-subserie.dto';
import { UpdateSubserieDto } from './dto/update-subserie.dto';
import { SubseriesService } from './subseries.service';

@Controller('subseries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubseriesController {
  constructor(private readonly service: SubseriesService) {}

  @Get()
  findAll(
    @Query('incluirInactivos') incluirInactivos?: string,
    @Query('serieId') serieId?: string,
  ) {
    const todos = incluirInactivos === 'true' || incluirInactivos === '1';
    return this.service.findAll(todos, serieId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.SUBSERIES_WRITE)
  create(@Body() dto: CreateSubserieDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.SUBSERIES_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubserieDto,
  ) {
    return this.service.update(id, dto);
  }
}
