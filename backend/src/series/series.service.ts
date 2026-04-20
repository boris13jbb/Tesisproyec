import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaCode } from '../common/prisma-util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSerieDto } from './dto/create-serie.dto';
import { UpdateSerieDto } from './dto/update-serie.dto';

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(incluirInactivos: boolean) {
    return this.prisma.serie.findMany({
      where: incluirInactivos ? undefined : { activo: true },
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.serie.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Serie no encontrada');
    }
    return row;
  }

  async create(dto: CreateSerieDto) {
    const codigo = dto.codigo.trim().toUpperCase();
    try {
      return await this.prisma.serie.create({
        data: {
          codigo,
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
        },
      });
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException('Ya existe una serie con ese código');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateSerieDto) {
    await this.findOne(id);
    if (
      dto.nombre === undefined &&
      dto.descripcion === undefined &&
      dto.activo === undefined
    ) {
      return this.findOne(id);
    }
    try {
      return await this.prisma.serie.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
          ...(dto.descripcion !== undefined && {
            descripcion:
              dto.descripcion === null || dto.descripcion === ''
                ? null
                : dto.descripcion.trim(),
          }),
          ...(dto.activo !== undefined && { activo: dto.activo }),
        },
      });
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2025')) {
        throw new NotFoundException('Serie no encontrada');
      }
      throw e;
    }
  }
}
