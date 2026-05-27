import { isAxiosError } from 'axios';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Los datos enviados no son válidos. Revise el formulario e intente de nuevo.',
  401: 'Su sesión no es válida o expiró. Vuelva a iniciar sesión.',
  403: 'No tiene permiso para realizar esta acción. Si cree que es un error, contacte al administrador.',
  404: 'No se encontró la información solicitada.',
  409: 'La operación no se puede completar porque hay un conflicto con datos existentes.',
  429: 'Demasiados intentos en poco tiempo. Espere unos minutos e intente de nuevo.',
  500: 'Ocurrió un error en el servidor. Intente más tarde o contacte al administrador.',
};

function messageFromBody(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const m = (data as { message?: string | string[] }).message;
  if (Array.isArray(m)) {
    const joined = m.map((x) => String(x).trim()).filter(Boolean).join(' ');
    return joined.length > 0 ? joined : null;
  }
  if (typeof m === 'string' && m.trim()) {
    const t = m.trim();
    if (/^[A-Z][A-Z0-9_]+$/.test(t)) return null;
    return t;
  }
  return null;
}

/**
 * Mensaje de error entendible para el usuario a partir de una respuesta HTTP.
 * Usar en formularios y pantallas en lugar de mostrar códigos de permiso o stack traces.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return fallback;

  const status = err.response?.status;
  const fromBody = messageFromBody(err.response?.data);

  if (status === 401) return STATUS_MESSAGES[401]!;
  if (status === 403) return STATUS_MESSAGES[403]!;
  if (status === 429) return STATUS_MESSAGES[429]!;

  if (fromBody) return fromBody;

  if (typeof status === 'number' && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status]!;
  }

  if (!err.response) {
    return 'No se pudo conectar con el servidor. Compruebe su red y que el sistema esté en marcha.';
  }

  return fallback;
}
