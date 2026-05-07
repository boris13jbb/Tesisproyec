import { PrismaService } from '../prisma/prisma.service';
import type { AuditContext, AuditResource, AuditResult } from './audit.types';
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(input: {
        action: string;
        result: AuditResult;
        resource?: AuditResource;
        context?: AuditContext;
        meta?: Record<string, unknown>;
    }): Promise<void>;
}
