import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildAuditWhere,
  enrichAuditLogsWithDocumentoCodigo,
} from './audit-list.util';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN')
export class AuditoriaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions(PERM.AUDIT_READ)
  async findAll(@Query() q: AuditQueryDto) {
    const page = Math.max(1, Number(q.page ?? '1'));
    const pageSize = Math.min(100, Math.max(5, Number(q.pageSize ?? '20')));
    const skip = (page - 1) * pageSize;

    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;

    const where = buildAuditWhere({
      action: q.action,
      result: q.result,
      actorUserId: q.actorUserId,
      actorEmail: q.actorEmail,
      resourceType: q.resourceType,
      resourceId: q.resourceId,
      from,
      to,
    });

    const [total, rawItems] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    const items = await enrichAuditLogsWithDocumentoCodigo(
      this.prisma,
      rawItems,
    );

    return { page, pageSize, total, items };
  }
}
