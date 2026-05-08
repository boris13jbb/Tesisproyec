import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Permisos efectivos: unión de permisos de roles + permisos directos (`user_permissions`). */
  async getCodesForUserId(userId: string): Promise<Set<string>> {
    const [roleRows, directRows] = await Promise.all([
      this.prisma.userRole.findMany({
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
      }),
      this.prisma.userPermission.findMany({
        where: { userId },
        select: { permission: { select: { codigo: true } } },
      }),
    ]);
    const out = new Set<string>();
    for (const ur of roleRows) {
      for (const rp of ur.role.permissions) {
        out.add(rp.permission.codigo);
      }
    }
    for (const up of directRows) {
      out.add(up.permission.codigo);
    }
    return out;
  }
}
