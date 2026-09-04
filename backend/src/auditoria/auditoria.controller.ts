import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuditLog } from '@prisma/client';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import { PrismaService } from '../prisma/prisma.service';
import { redactAuditMetaJsonForRead } from './audit-export-meta.util';
import {
  assertAuditDateRange,
  buildAuditWhere,
  enrichAuditLogsWithDocumentoCodigo,
  parseOptionalAuditIsoDate,
  resolveAuditPaging,
} from './audit-list.util';
import { AuditoriaService } from './auditoria.service';
import { AuditQueryDto } from './dto/audit-query.dto';

type AuditLogApiRow = AuditLog & { resourceCodigo?: string | null };

function withRedactedMeta(row: AuditLogApiRow): AuditLogApiRow {
  const redacted = redactAuditMetaJsonForRead(row.metaJson);
  return {
    ...row,
    metaJson: redacted.length > 0 ? redacted : null,
  };
}

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN')
export class AuditoriaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  @Get()
  @Permissions(PERM.AUDIT_READ)
  async findAll(@Query() q: AuditQueryDto) {
    const { page, pageSize, skip } = resolveAuditPaging(q.page, q.pageSize);
    const from = parseOptionalAuditIsoDate(q.from);
    const to = parseOptionalAuditIsoDate(q.to);
    assertAuditDateRange(from, to);

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
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    const enriched = await enrichAuditLogsWithDocumentoCodigo(
      this.prisma,
      rawItems,
    );

    return {
      page,
      pageSize,
      total,
      items: enriched.map(withRedactedMeta),
    };
  }

  @Get('stats')
  @Permissions(PERM.AUDIT_READ)
  getStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('action') action?: string,
  ) {
    const fromDate = parseOptionalAuditIsoDate(from);
    const toDate = parseOptionalAuditIsoDate(to);
    assertAuditDateRange(fromDate, toDate);
    return this.auditoriaService.getStats({
      from: fromDate,
      to: toDate,
      actorUserId: actorUserId?.trim() || undefined,
      action: action?.trim() || undefined,
    });
  }

  @Get(':id')
  @Permissions(PERM.AUDIT_READ)
  async findOne(@Param('id') id: string) {
    const row = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Registro de auditoría no encontrado');
    }
    const [enriched] = await enrichAuditLogsWithDocumentoCodigo(this.prisma, [
      row,
    ]);
    return withRedactedMeta(enriched);
  }
}
