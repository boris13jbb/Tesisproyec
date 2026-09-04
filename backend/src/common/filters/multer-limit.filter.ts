import { Catch, type ArgumentsHost, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';
import { DOCUMENTO_ARCHIVO_MAX_BYTES } from '../../documentos/documento-archivo-storage.util';

/** Multer LIMIT_FILE_SIZE no debe filtrarse como 500 con detalle interno. */
@Catch(MulterError)
export class MulterLimitFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception.code === 'LIMIT_FILE_SIZE') {
      const mb = Math.round(DOCUMENTO_ARCHIVO_MAX_BYTES / (1024 * 1024));
      return res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: `El archivo excede el tamaño permitido (máx. ${mb} MB).`,
      });
    }

    return res.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'No se pudo recibir el archivo.',
    });
  }
}
