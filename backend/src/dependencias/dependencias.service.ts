import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { isPrismaCode } from '../common/prisma-util';
import {
  normalizeAdministrativeCodigo,
  normalizeAdministrativeText,
  normalizeOptionalAdministrativeText,
} from '../common/text-normalize.util';
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
    const codigo = normalizeAdministrativeCodigo(dto.codigo);
    const nombre = normalizeAdministrativeText(dto.nombre);
    if (!nombre) {
      throw new BadRequestException('Nombre de dependencia requerido');
    }
    try {
      return await this.prisma.dependencia.create({
        data: {
          codigo,
          nombre,
          descripcion:
            normalizeOptionalAdministrativeText(dto.descripcion) ?? null,
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
          ...(dto.nombre !== undefined && {
            nombre: normalizeAdministrativeText(dto.nombre) ?? '',
          }),
          ...(dto.descripcion !== undefined && {
            descripcion:
              normalizeOptionalAdministrativeText(dto.descripcion) ?? null,
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
