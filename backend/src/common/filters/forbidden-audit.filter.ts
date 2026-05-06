import {
  Catch,
  type ArgumentsHost,
  ForbiddenException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuditService } from '../../auditoria/audit.service';

/**
 * Registra intentos de acceso denegado por rol/guard (HTTP 403) en `audit_logs`.
 * Cubre brecha R-30 (cobertura de denegaciones autenticadas).
 */
@Catch(ForbiddenException)
@Injectable()
export class ForbiddenAuditFilter {
  constructor(private readonly audit: AuditService) {}

  catch(exception: ForbiddenException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const u = (req as unknown as { user?: { id?: string; email?: string } })
      .user;

    void this.audit.log({
      action: 'AUTHZ_FORBIDDEN',
      result: 'FAIL',
      resource: { type: 'HttpRoute', id: null },
      context: {
        actorUserId: u?.id ?? null,
        actorEmail: u?.email ?? null,
        ip: req.ip ?? null,
        userAgent:
          typeof req.headers['user-agent'] === 'string'
            ? req.headers['user-agent']
            : null,
      },
      meta: {
        method: req.method,
        path: req.originalUrl ?? req.url,
      },
    });

    return res.status(HttpStatus.FORBIDDEN).json(exception.getResponse());
  }
}
