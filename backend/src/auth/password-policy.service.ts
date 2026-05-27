import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PasswordPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cantidad de contraseñas anteriores a rechazar (0 = desactivado). */
  async getEffectivePasswordHistoryCount(): Promise<number> {
    const row = await this.prisma.securityPolicy.findUnique({
      where: { id: 'default' },
      select: { desiredPasswordHistoryCount: true },
    });
    const n = row?.desiredPasswordHistoryCount ?? 0;
    return Math.min(24, Math.max(0, Math.floor(n)));
  }

  async assertPasswordNotReused(
    userId: string,
    plainPassword: string,
    currentPasswordHash?: string,
  ): Promise<void> {
    const retain = await this.getEffectivePasswordHistoryCount();
    if (retain <= 0) {
      return;
    }

    if (
      currentPasswordHash &&
      (await argon2.verify(currentPasswordHash, plainPassword))
    ) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la contraseña actual',
      );
    }

    const history = await this.prisma.userPasswordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: retain,
      select: { passwordHash: true },
    });

    for (const row of history) {
      if (await argon2.verify(row.passwordHash, plainPassword)) {
        throw new BadRequestException(
          `La contraseña no puede repetir ninguna de las últimas ${retain} contraseñas registradas`,
        );
      }
    }
  }

  /** Guarda el hash anterior y recorta el historial al límite de política. */
  async recordPasswordChange(
    userId: string,
    previousPasswordHash: string,
  ): Promise<void> {
    const retain = await this.getEffectivePasswordHistoryCount();
    if (retain <= 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userPasswordHistory.create({
        data: { userId, passwordHash: previousPasswordHash },
      });
      const extra = await tx.userPasswordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: retain,
        select: { id: true },
      });
      if (extra.length > 0) {
        await tx.userPasswordHistory.deleteMany({
          where: { id: { in: extra.map((e) => e.id) } },
        });
      }
    });
  }
}
