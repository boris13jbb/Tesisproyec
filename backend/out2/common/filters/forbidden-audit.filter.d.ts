import { type ArgumentsHost, ForbiddenException } from '@nestjs/common';
import type { Response } from 'express';
import { AuditService } from '../../auditoria/audit.service';
export declare class ForbiddenAuditFilter {
    private readonly audit;
    constructor(audit: AuditService);
    catch(exception: ForbiddenException, host: ArgumentsHost): Response<any, Record<string, any>>;
}
