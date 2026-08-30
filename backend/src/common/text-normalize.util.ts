const ADMINISTRATIVE_LOCALE = 'es-EC';

function toAdministrativeUpper(value: string): string {
  return value.toLocaleUpperCase(ADMINISTRATIVE_LOCALE);
}

/** Campos administrativos abiertos que se almacenan en MAYÚSCULAS. */
const UPPERCASE_FIELD_KEYS = new Set([
  'codigo',
  'nombre',
  'nombres',
  'apellidos',
  'razonSocial',
  'razon_social',
  'direccion',
  'cargo',
  'descripcion',
  'asunto',
  'responsableInstitucional',
  'responsable_institucional',
  'motivo',
  'motivoRechazo',
  'observacion',
  'comentario',
  'ciudad',
  'provincia',
]);

const NEVER_UPPERCASE_KEYS = new Set([
  'email',
  'correo',
  'password',
  'passwordHash',
  'newPassword',
  'confirmPassword',
  'url',
  'token',
  'id',
  'uuid',
  'cedula',
  'ruc',
  'telefono',
  'phone',
  'sha256',
  'mimeType',
  'storedName',
  'originalName',
  'q',
  'search',
  'query',
]);

export function normalizeAdministrativeText(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (!t) return null;
  return toAdministrativeUpper(t);
}

export function normalizeAdministrativeCodigo(value: string): string {
  return toAdministrativeUpper(value.trim());
}

export function normalizeOptionalAdministrativeText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  return normalizeAdministrativeText(value);
}

/** Normaliza un campo por nombre de clave (evita mayúsculas en email, cédula, etc.). */
export function normalizeFieldByKey(
  key: string,
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const k = key.trim();
  if (NEVER_UPPERCASE_KEYS.has(k)) {
    return value.trim() || null;
  }
  if (UPPERCASE_FIELD_KEYS.has(k)) {
    return normalizeAdministrativeText(value);
  }
  return value.trim() || null;
}
