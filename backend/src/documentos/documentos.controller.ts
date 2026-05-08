import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  InternalServerErrorException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import { JwtRequestUser } from '../auth/request-user';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { ResolverRevisionDto } from './dto/resolver-revision.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { UpdateDocumentAccessDto } from './dto/update-document-access.dto';
import { DocumentosService } from './documentos.service';

@Controller('documentos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get()
  @Permissions(PERM.DOC_READ)
  findAll(
    @Req() req: Request & { user: JwtRequestUser },
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
    return this.service.findAll(req.user, todos, {
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

  @Get('next-codigo')
  @Permissions(PERM.DOC_CREATE)
  getSiguienteCodigo(@Query('anio') anio?: string) {
    let y: number | undefined;
    if (anio !== undefined && String(anio).trim() !== '') {
      y = Number(String(anio).trim());
      if (!Number.isInteger(y)) {
        throw new BadRequestException(
          'Query «anio» debe ser un entero (ej. 2026).',
        );
      }
    }
    return this.service.sugerirSiguienteCodigo(y);
  }

  @Get('tablon-tramites')
  @Permissions(PERM.DOC_READ)
  tablonTramites(@Req() req: Request & { user: JwtRequestUser }) {
    return this.service.findTablonTramites(req.user);
  }

  @Get('clasificacion-agregados')
  @Permissions(PERM.DOC_READ)
  clasificacionAgregados(@Req() req: Request & { user: JwtRequestUser }) {
    return this.service.getClasificacionAgregados(req.user);
  }

  @Get(':id')
  @Permissions(PERM.DOC_READ)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtRequestUser },
  ) {
    return this.service.findOne(id, req.user);
  }

  /** ACL por documento (ADMIN). */
  @Get(':id/access')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.DOC_ACCESS_MANAGE)
  getAccess(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getAccess(id);
  }

  @Put(':id/access')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.DOC_ACCESS_MANAGE)
  updateAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentAccessDto,
    @Req() req: Request & { user: JwtRequestUser },
  ) {
    const ua = req.headers['user-agent'];
    return this.service.updateAccess(
      id,
      {
        accessPolicy: dto.accessPolicy,
        userIds: dto.userIds,
        roleCodigos: dto.roleCodigos ?? [],
      },
      req.user,
      {
        ip: req.ip ?? null,
        userAgent: typeof ua === 'string' ? ua : null,
      },
    );
  }

  @Post()
  @Permissions(PERM.DOC_CREATE)
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
  @Permissions(PERM.DOC_READ)
  findEventos(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtRequestUser },
  ) {
    return this.service.findEventos(id, req.user);
  }

  @Get(':id/archivos')
  @Permissions(PERM.DOC_FILES_READ)
  findArchivos(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtRequestUser },
  ) {
    return this.service.findArchivos(id, req.user);
  }

  @Post(':id/archivos')
  @Permissions(PERM.DOC_FILES_UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
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
  @Permissions(PERM.DOC_FILES_DOWNLOAD)
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
        req.user as JwtRequestUser,
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
  @Permissions(PERM.DOC_FILES_READ)
  findArchivoEventos(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('archivoId', ParseUUIDPipe) archivoId: string,
    @Req() req: Request & { user: JwtRequestUser },
  ) {
    return this.service.findArchivoEventos(id, archivoId, req.user);
  }

  @Post(':id/enviar-revision')
  @HttpCode(200)
  enviarRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtRequestUser },
  ) {
    const ua = req.headers['user-agent'];
    return this.service.enviarRevision(id, req.user, {
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      ip: req.ip ?? null,
      userAgent: typeof ua === 'string' ? ua : null,
    });
  }

  @Post(':id/resolver-revision')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'REVISOR')
  @Permissions(PERM.DOC_REVISION_RESOLVE)
  resolverRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolverRevisionDto,
    @Req() req: Request & { user: JwtRequestUser },
  ) {
    const ua = req.headers['user-agent'];
    return this.service.resolverRevision(id, dto, req.user, {
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      ip: req.ip ?? null,
      userAgent: typeof ua === 'string' ? ua : null,
    });
  }

  @Delete(':id/archivos/:archivoId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions(PERM.DOC_FILES_DELETE)
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
  @Permissions(PERM.DOC_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentoDto,
    @Req() req: Request & { user?: { id?: string; email?: string } },
  ) {
    const updatedById = req.user?.id;
    if (!updatedById) {
      throw new InternalServerErrorException(
        'Usuario no disponible en request',
      );
    }
    const ua = req.headers['user-agent'];
    return this.service.update(id, dto, updatedById, {
      actorUserId: updatedById,
      actorEmail: req.user?.email ?? null,
      ip: req.ip ?? null,
      userAgent: typeof ua === 'string' ? ua : null,
    });
  }
}
