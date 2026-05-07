import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';
export declare class AuditoriaController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(q: AuditQueryDto): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            action: string;
            result: string;
            id: string;
            createdAt: Date;
            actorEmail: string | null;
            resourceType: string | null;
            resourceId: string | null;
            ip: string | null;
            userAgent: string | null;
            correlationId: string | null;
            metaJson: string | null;
            actorUserId: string | null;
        }[];
    }>;
}
