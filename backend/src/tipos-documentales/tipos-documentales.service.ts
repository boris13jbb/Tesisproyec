import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaCode } from '../common/prisma-util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoDocumentalDto } from './dto/create-tipo-documental.dto';
import { UpdateTipoDocumentalDto } from './dto/update-tipo-documental.dto';

@Injectable()
export class TiposDocumentalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(incluirInactivos: boolean) {
    return this.prisma.tipoDocumental.findMany({
      where: incluirInactivos ? undefined : { activo: true },
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.tipoDocumental.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Tipo documental no encontrado');
    }
    return row;
  }

  async create(dto: CreateTipoDocumentalDto) {
    const codigo = dto.codigo.trim().toUpperCase();
    try {
      return await this.prisma.tipoDocumental.create({
        data: {
          codigo,
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
        },
      });
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException(
          'Ya existe un tipo documental con ese código',
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateTipoDocumentalDto) {
    await this.findOne(id);
    if (
      dto.nombre === undefined &&
      dto.descripcion === undefined &&
      dto.activo === undefined
    ) {
      return this.findOne(id);
    }
    try {
      return await this.prisma.tipoDocumental.update({
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
        throw new NotFoundException('Tipo documental no encontrado');
      }
      throw e;
    }
  }
}
