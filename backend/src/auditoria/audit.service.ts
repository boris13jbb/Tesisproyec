import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { serializeAuditMetaForPersist } from './audit-export-meta.util';
import type { AuditContext, AuditResource, AuditResult } from './audit.types';

/**
 * Escritura única de `audit_logs`. Actor/acción/meta los define el servidor;
 * meta se redacta antes de persistir (defensa en profundidad ASVS V7/V8).
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    action: string;
    result: AuditResult;
    resource?: AuditResource;
    context?: AuditContext;
    meta?: Record<string, unknown>;
  }): Promise<void> {
    const { action, result, resource, context, meta } = input;
    await this.prisma.auditLog.create({
      data: {
        action,
        result,
        actorUserId: context?.actorUserId ?? null,
        actorEmail: context?.actorEmail ?? null,
        resourceType: resource?.type ?? null,
        resourceId: resource?.id ?? null,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
        correlationId: context?.correlationId ?? null,
        metaJson: serializeAuditMetaForPersist(meta ?? null),
      },
    });
  }
}
