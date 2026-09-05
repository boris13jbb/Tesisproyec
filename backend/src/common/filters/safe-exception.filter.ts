import {
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

const GENERIC = 'Error interno del servidor';

function looksSensitive(raw: string): boolean {
  return /password|mysql:\/\/|mongodb:\/\/|postgres:\/\/|jwt|authorization|bearer |smtp_|secret=/i.test(
    raw,
  );
}

/**
 * Errores no-HTTP (Prisma, driver, bugs): respuesta genérica sin stack ni credenciales.
 * HttpException (400/403/404…) sigue su filtro específico o el cuerpo original.
 */
@Catch()
export class SafeExceptionFilter {
  private readonly log = new Logger(SafeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      return res.status(exception.getStatus()).json(exception.getResponse());
    }

    const raw =
      exception instanceof Error ? exception.message : 'unknown_error';
    if (!looksSensitive(raw)) {
      this.log.error('Error no controlado');
    } else {
      this.log.error('Error no controlado (detalle omitido)');
    }

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: GENERIC,
    });
  }
}
