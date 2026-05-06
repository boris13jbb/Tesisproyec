import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  InternalServerErrorException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { DocumentosService } from './documentos.service';

@Controller('documentos')
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get()
  findAll(
    @Query('incluirInactivos') incluirInactivos?: string,
    @Query('q') q?: string,
    @Query('archivoNombre') archivoNombre?: string,
    @Query('archivoMime') archivoMime?: string,
    @Query('archivoSha256') archivoSha256?: string,
    @Query('estado') estado?: string,
    @Query('tipoDocumentalId') tipoDocumentalId?: string,
    @Query('serieId') serieId?: string,
    @Query('subserieId') subserieId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('sortBy') sortBy?: 'codigo' | 'fechaDocumento' | 'estado',
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const todos = incluirInactivos === 'true' || incluirInactivos === '1';
    return this.service.findAll(todos, {
      q,
      archivoNombre,
      archivoMime,
      archivoSha256,
      estado,
      tipoDocumentalId,
      serieId,
      subserieId,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      sortBy,
      sortDir,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(
    @Body() dto: CreateDocumentoDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const createdById = req.user?.id;
    if (!createdById) {
      throw new InternalServerErrorException(
        'Usuario no disponible en request',
      );
    }
    return this.service.create(dto, createdById);
  }

  @Get(':id/eventos')
  findEventos(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findEventos(id);
  }

  @Get(':id/archivos')
  findArchivos(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findArchivos(id);
  }

  @Post(':id/archivos')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  uploadArchivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: { id?: string; email?: string } },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const createdById = req.user?.id;
    if (!createdById) {
      throw new InternalServerErrorException(
        'Usuario no disponible en request',
      );
    }
    return this.service.uploadArchivo(id, file, createdById, {
      actorUserId: createdById,
      actorEmail: req.user?.email ?? null,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Get(':id/archivos/:archivoId/download')
  @Header('Cache-Control', 'no-store')
  async downloadArchivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('archivoId', ParseUUIDPipe) archivoId: string,
    @Req() req: Request & { user?: { id?: string; email?: string } },
    @Res() res: Response,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new InternalServerErrorException(
        'Usuario no disponible en request',
      );
    }
    const { absPath, downloadName, mimeType } =
      await this.service.prepareDownloadArchivo(
        id,
        archivoId,
        userId,
        req.ip ?? null,
        {
          actorUserId: userId,
          actorEmail: req.user?.email ?? null,
          ip: req.ip ?? null,
          userAgent: req.headers['user-agent'] ?? null,
        },
      );
    res.setHeader('Content-Type', mimeType);
    return res.download(absPath, downloadName);
  }

  @Get(':id/archivos/:archivoId/eventos')
  findArchivoEventos(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('archivoId', ParseUUIDPipe) archivoId: string,
  ) {
    return this.service.findArchivoEventos(id, archivoId);
  }

  @Delete(':id/archivos/:archivoId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteArchivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('archivoId', ParseUUIDPipe) archivoId: string,
    @Req() req: Request & { user?: { id?: string; email?: string } },
  ) {
    const deletedById = req.user?.id;
    if (!deletedById) {
      throw new InternalServerErrorException(
        'Usuario no disponible en request',
      );
    }
    return this.service.deleteArchivo(id, archivoId, deletedById, {
      actorUserId: deletedById,
      actorEmail: req.user?.email ?? null,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentoDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const updatedById = req.user?.id;
    if (!updatedById) {
      throw new InternalServerErrorException(
        'Usuario no disponible en request',
      );
    }
    return this.service.update(id, dto, updatedById);
  }
}
