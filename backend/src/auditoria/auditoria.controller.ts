import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditoriaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query() q: AuditQueryDto) {
    const page = Math.max(1, Number(q.page ?? '1'));
    const pageSize = Math.min(100, Math.max(5, Number(q.pageSize ?? '20')));
    const skip = (page - 1) * pageSize;

    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;

    const where = {
      ...(q.action ? { action: { contains: q.action.trim() } } : {}),
      ...(q.result ? { result: q.result } : {}),
      ...(q.actorEmail
        ? { actorEmail: { contains: q.actorEmail.trim() } }
        : {}),
      ...(q.resourceType ? { resourceType: q.resourceType.trim() } : {}),
      ...(q.resourceId ? { resourceId: q.resourceId.trim() } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    } as const;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }
}
