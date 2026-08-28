import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaCode } from '../common/prisma-util';
import {
  mergePartyUpdate,
  normalizePartyInput,
  type PartyNormalized,
} from '../common/party-catalog.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBeneficiarioDto } from './dto/create-beneficiario.dto';
import { UpdateBeneficiarioDto } from './dto/update-beneficiario.dto';

function rowToParty(row: {
  tipo: string;
  cedula: string | null;
  ruc: string | null;
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
}): PartyNormalized {
  return {
    tipo: row.tipo as PartyNormalized['tipo'],
    cedula: row.cedula,
    ruc: row.ruc,
    nombres: row.nombres,
    apellidos: row.apellidos,
    razonSocial: row.razonSocial,
    correo: row.correo,
    telefono: row.telefono,
    direccion: row.direccion,
  };
}

@Injectable()
export class BeneficiariosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(incluirInactivos: boolean) {
    return this.prisma.beneficiario.findMany({
      where: incluirInactivos ? undefined : { activo: true },
      orderBy: [
        { razonSocial: 'asc' },
        { apellidos: 'asc' },
        { nombres: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.beneficiario.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Beneficiario no encontrado');
    return row;
  }

  async create(dto: CreateBeneficiarioDto) {
    const data = normalizePartyInput(dto);
    try {
      return await this.prisma.beneficiario.create({ data });
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException(
          'Ya existe un beneficiario con esa cédula o RUC',
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateBeneficiarioDto) {
    const existing = await this.findOne(id);
    if (
      dto.tipo === undefined &&
      dto.cedula === undefined &&
      dto.ruc === undefined &&
      dto.nombres === undefined &&
      dto.apellidos === undefined &&
      dto.razonSocial === undefined &&
      dto.correo === undefined &&
      dto.telefono === undefined &&
      dto.direccion === undefined &&
      dto.activo === undefined
    ) {
      return existing;
    }

    const merged =
      dto.tipo !== undefined ||
      dto.cedula !== undefined ||
      dto.ruc !== undefined ||
      dto.nombres !== undefined ||
      dto.apellidos !== undefined ||
      dto.razonSocial !== undefined ||
      dto.correo !== undefined ||
      dto.telefono !== undefined ||
      dto.direccion !== undefined
        ? mergePartyUpdate(rowToParty(existing), dto)
        : null;

    try {
      return await this.prisma.beneficiario.update({
        where: { id },
        data: {
          ...(merged ?? {}),
          ...(dto.activo !== undefined && { activo: dto.activo }),
        },
      });
    } catch (e: unknown) {
      if (isPrismaCode(e, 'P2002')) {
        throw new ConflictException(
          'Ya existe un beneficiario con esa cédula o RUC',
        );
      }
      if (isPrismaCode(e, 'P2025')) {
        throw new NotFoundException('Beneficiario no encontrado');
      }
      throw e;
    }
  }
}
