import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma singleton. Sin $connect en onModuleInit para permitir arrancar
 * el API aunque MySQL no esté disponible (health reportará database: down).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
