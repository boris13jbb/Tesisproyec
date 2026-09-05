import { Transform } from 'class-transformer';

/**
 * Convierte booleanos JSON y strings explícitos.
 * No usa Boolean(string): Boolean("false") === true.
 */
export function parseStrictBoolean(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const n = value.trim().toLowerCase();
    if (n === 'true') return true;
    if (n === 'false') return false;
  }
  return value;
}

/** Lee el valor crudo: implicit conversion ya habría hecho Boolean("false") === true. */
export function ToSafeBoolean(): PropertyDecorator {
  return Transform((params: { value: unknown; obj?: object; key?: string }) => {
    const { value, obj, key } = params;
    const record =
      obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : null;
    const raw =
      record && typeof key === 'string' && Object.hasOwn(record, key)
        ? record[key]
        : value;
    return parseStrictBoolean(raw);
  });
}
