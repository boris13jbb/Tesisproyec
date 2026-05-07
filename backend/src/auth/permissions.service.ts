import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Permisos efectivos del usuario (unión de permisos de todos sus roles). */
  async getCodesForUserId(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            permissions: {
              select: { permission: { select: { codigo: true } } },
            },
          },
        },
      },
    });
    const out = new Set<string>();
    for (const ur of rows) {
      for (const rp of ur.role.permissions) {
        out.add(rp.permission.codigo);
      }
    }
    return out;
  }
}
