import { type ArgumentsHost } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuditService } from '../../auditoria/audit.service';
export declare class ThrottlerAuditFilter {
    private readonly audit;
    constructor(audit: AuditService);
    catch(_exception: ThrottlerException, host: ArgumentsHost): Response<any, Record<string, any>>;
}
