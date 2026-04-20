import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaCode } from '../common/prisma-util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

@Injectable()
export class DependenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(incluirInactivos: boolean) {
    return this.prisma.dependencia.findMany({
      where: incluirInactivos ? undefined : { activo: true },
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.dependencia.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Dependencia no encontrada');
    }
    return row;
  }

  async create(dto: CreateDependenciaDto) {
    const codigo = dto.codigo.trim().toUpperCase();
    try {
      return await this.prisma.dependencia.create({
        data: {
          codigo,
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
        },
      });
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException('Ya existe una dependencia con ese código');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateDependenciaDto) {
    await this.findOne(id);
    if (
      dto.nombre === undefined &&
      dto.descripcion === undefined &&
      dto.activo === undefined
    ) {
      return this.findOne(id);
    }
    try {
      return await this.prisma.dependencia.update({
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
        throw new NotFoundException('Dependencia no encontrada');
      }
      throw e;
    }
  }
}
