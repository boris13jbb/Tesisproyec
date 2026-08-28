/** Campos administrativos abiertos que se almacenan en MAYÚSCULAS. */
const UPPERCASE_FIELD_KEYS = new Set([
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
]);

const NEVER_UPPERCASE_KEYS = new Set([
  'email',
  'correo',
  'password',
  'passwordHash',
  'url',
  'token',
  'id',
  'cedula',
  'ruc',
]);

export function normalizeAdministrativeText(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (!t) return null;
  return t.toUpperCase();
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
