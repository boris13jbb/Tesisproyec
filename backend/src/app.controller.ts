import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from './auth/decorators/roles.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /** Comprueba JWT + rol ADMIN (base para rutas administrativas). */
  @Get('admin/ping')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminPing(): { ok: boolean; scope: string } {
    return { ok: true, scope: 'admin' };
  }

  @Get('health')
  async health(): Promise<{
    status: string;
    service: string;
    database: 'up' | 'down';
  }> {
    let database: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }
    return {
      status: 'ok',
      service: 'sgd-gadpr-lm-api',
      database,
    };
  }
}
