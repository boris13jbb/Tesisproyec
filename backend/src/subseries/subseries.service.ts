import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaCode } from '../common/prisma-util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubserieDto } from './dto/create-subserie.dto';
import { UpdateSubserieDto } from './dto/update-subserie.dto';

const includeSerie = {
  serie: { select: { id: true, codigo: true, nombre: true } },
} as const;

@Injectable()
export class SubseriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(incluirInactivos: boolean, serieId?: string) {
    return this.prisma.subserie.findMany({
      where: {
        ...(incluirInactivos ? {} : { activo: true }),
        ...(serieId ? { serieId } : {}),
      },
      include: includeSerie,
      orderBy: [{ codigo: 'asc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.subserie.findUnique({
      where: { id },
      include: includeSerie,
    });
    if (!row) {
      throw new NotFoundException('Subserie no encontrada');
    }
    return row;
  }

  private async assertSerieExists(serieId: string) {
    const s = await this.prisma.serie.findUnique({ where: { id: serieId } });
    if (!s) {
      throw new BadRequestException('Serie no encontrada');
    }
  }

  async create(dto: CreateSubserieDto) {
    await this.assertSerieExists(dto.serieId);
    const codigo = dto.codigo.trim().toUpperCase();
    try {
      return await this.prisma.subserie.create({
        data: {
          serieId: dto.serieId,
          codigo,
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
        },
        include: includeSerie,
      });
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException('Ya existe una subserie con ese código');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateSubserieDto) {
    await this.findOne(id);
    if (dto.serieId !== undefined) {
      await this.assertSerieExists(dto.serieId);
    }
    if (
      dto.serieId === undefined &&
      dto.nombre === undefined &&
      dto.descripcion === undefined &&
      dto.activo === undefined
    ) {
      return this.findOne(id);
    }
    try {
      return await this.prisma.subserie.update({
        where: { id },
        data: {
          ...(dto.serieId !== undefined && { serieId: dto.serieId }),
          ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
          ...(dto.descripcion !== undefined && {
            descripcion:
              dto.descripcion === null || dto.descripcion === ''
                ? null
                : dto.descripcion.trim(),
          }),
          ...(dto.activo !== undefined && { activo: dto.activo }),
        },
        include: includeSerie,
      });
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2025')) {
        throw new NotFoundException('Subserie no encontrada');
      }
      throw e;
    }
  }
}
