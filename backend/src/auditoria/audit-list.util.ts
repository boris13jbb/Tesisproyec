import type { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditListQueryFilter = {
  action?: string;
  result?: 'OK' | 'FAIL';
  actorEmail?: string;
  actorUserId?: string;
  resourceType?: string;
  resourceId?: string;
  from?: Date;
  to?: Date;
};

/**
 * Predicado coherentes con listados y exportaciones (evita `contains` en códigos de acción RBAC).
 */
export function buildAuditWhere(
  q: AuditListQueryFilter,
): Prisma.AuditLogWhereInput {
  const action = q.action?.trim();
  const actorUid = q.actorUserId?.trim();
  const actorMail = q.actorEmail?.trim();

  return {
    ...(action ? { action } : {}),
    ...(q.result ? { result: q.result } : {}),
    ...(actorUid
      ? { actorUserId: actorUid }
      : actorMail
        ? { actorEmail: { contains: actorMail } }
        : {}),
    ...(q.resourceType?.trim()
      ? { resourceType: q.resourceType.trim() }
      : {}),
    ...(q.resourceId?.trim() ? { resourceId: q.resourceId.trim() } : {}),
    ...(q.from || q.to
      ? {
          createdAt: {
            ...(q.from ? { gte: q.from } : {}),
            ...(q.to ? { lte: q.to } : {}),
          },
        }
      : {}),
  };
}

/** `documentoId` en meta de eventos ligados a `DocumentoArchivo` u otros. */
export function parseDocumentoIdFromAuditMeta(metaJson: string | null): string | null {
  if (!metaJson?.trim()) return null;
  try {
    const m = JSON.parse(metaJson) as { documentoId?: unknown };
    const id = m?.documentoId;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

function collectDocumentoIds(rows: AuditLog[]): string[] {
  const ids = new Set<string>();
  for (const r of rows) {
    const tipo = (r.resourceType ?? '').trim();
    if (tipo === 'Documento' && r.resourceId?.trim()) {
      ids.add(r.resourceId.trim());
    }
    const fromMeta = parseDocumentoIdFromAuditMeta(r.metaJson);
    if (fromMeta) ids.add(fromMeta);
  }
  return [...ids];
}

function codigoParaFila(
  r: AuditLog,
  codigoById: Map<string, string>,
): string | null {
  const tipo = (r.resourceType ?? '').trim();
  if (tipo === 'Documento' && r.resourceId?.trim()) {
    return codigoById.get(r.resourceId.trim()) ?? null;
  }
  const metaId = parseDocumentoIdFromAuditMeta(r.metaJson);
  if (metaId) return codigoById.get(metaId) ?? null;
  return null;
}

/** Adjuntar `resourceCodigo` (p. ej. expediente institucional) para UI y exportaciones legibles. */
export async function enrichAuditLogsWithDocumentoCodigo(
  prisma: PrismaService,
  rows: AuditLog[],
): Promise<Array<AuditLog & { resourceCodigo: string | null }>> {
  const docIds = collectDocumentoIds(rows);
  if (docIds.length === 0) {
    return rows.map((r) => ({ ...r, resourceCodigo: null }));
  }
  const docs = await prisma.documento.findMany({
    where: { id: { in: docIds } },
    select: { id: true, codigo: true },
  });
  const codigoById = new Map(docs.map((d) => [d.id, d.codigo]));
  return rows.map((r) => ({
    ...r,
    resourceCodigo: codigoParaFila(r, codigoById),
  }));
}
