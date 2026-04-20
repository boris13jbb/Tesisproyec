import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaCode } from '../common/prisma-util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';

const cargoInclude = {
  dependencia: {
    select: { id: true, codigo: true, nombre: true },
  },
} as const;

@Injectable()
export class CargosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(incluirInactivos: boolean) {
    return this.prisma.cargo.findMany({
      where: incluirInactivos ? undefined : { activo: true },
      include: cargoInclude,
      orderBy: [{ codigo: 'asc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.cargo.findUnique({
      where: { id },
      include: cargoInclude,
    });
    if (!row) {
      throw new NotFoundException('Cargo no encontrado');
    }
    return row;
  }

  private async assertDependenciaExists(
    dependenciaId: string | null | undefined,
  ) {
    if (dependenciaId === undefined || dependenciaId === null) {
      return;
    }
    const d = await this.prisma.dependencia.findUnique({
      where: { id: dependenciaId },
    });
    if (!d) {
      throw new BadRequestException('Dependencia no encontrada');
    }
  }

  async create(dto: CreateCargoDto) {
    const codigo = dto.codigo.trim().toUpperCase();
    await this.assertDependenciaExists(dto.dependenciaId ?? null);
    try {
      return await this.prisma.cargo.create({
        data: {
          codigo,
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
          dependenciaId: dto.dependenciaId ?? null,
        },
        include: cargoInclude,
      });
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException('Ya existe un cargo con ese código');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateCargoDto) {
    await this.findOne(id);
    await this.assertDependenciaExists(
      dto.dependenciaId === undefined ? undefined : dto.dependenciaId,
    );
    if (
      dto.nombre === undefined &&
      dto.descripcion === undefined &&
      dto.activo === undefined &&
      dto.dependenciaId === undefined
    ) {
      return this.findOne(id);
    }
    try {
      return await this.prisma.cargo.update({
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
          ...(dto.dependenciaId !== undefined && {
            dependenciaId: dto.dependenciaId,
          }),
        },
        include: cargoInclude,
      });
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2025')) {
        throw new NotFoundException('Cargo no encontrado');
      }
      throw e;
    }
  }
}
