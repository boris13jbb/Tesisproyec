const DOCUMENTO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Solo rutas internas de documento con UUID. Bloquea javascript:/URLs externas. */
export function documentoPathFromNotification(
  resourceType: string | null | undefined,
  resourceId: string | null | undefined,
): string | null {
  if (resourceType !== 'Documento' || !resourceId) return null;
  if (!DOCUMENTO_UUID.test(resourceId.trim())) return null;
  return `/documentos/${resourceId.trim()}`;
}
