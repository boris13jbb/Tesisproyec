import {
  Catch,
  type ArgumentsHost,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuditService } from '../../auditoria/audit.service';

@Catch(ThrottlerException)
@Injectable()
export class ThrottlerAuditFilter {
  constructor(private readonly audit: AuditService) {}

  catch(_exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    void this.audit.log({
      action: 'AUTH_RATE_LIMITED',
      result: 'FAIL',
      context: {
        actorUserId:
          (req as unknown as { user?: { id?: string } }).user?.id ?? null,
        actorEmail:
          (req as unknown as { user?: { email?: string } }).user?.email ?? null,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
      meta: { method: req.method, path: req.originalUrl },
    });

    return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Demasiados intentos. Intenta más tarde.',
    });
  }
}
