/**
 * Utilidades puras del reporte «Documentos por usuario».
 * La resolución de revisión se toma de AuditLog DOC_REVIEW_RESOLVED (metaJson).
 */

export type ReviewActorRef = {
  id: string | null;
  nombres: string | null;
  apellidos: string | null;
  email: string;
};

export type DocumentoRevisionInfo = {
  revisadoPor: ReviewActorRef | null;
  fecha: Date;
  decision: string;
  motivoRechazo: string | null;
};

export type AuditReviewRow = {
  resourceId: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  createdAt: Date;
  metaJson: string | null;
};

export type DocumentosPorUsuarioSummary = {
  total: number;
  aprobados: number;
  rechazados: number;
  enRevision: number;
  registrados: number;
  borradores: number;
  archivados: number;
};

export type ResumenPorUsuarioRow = {
  userId: string;
  nombres: string | null;
  apellidos: string | null;
  email: string;
  total: number;
  aprobados: number;
  rechazados: number;
  enRevision: number;
  registrados: number;
  borradores: number;
  archivados: number;
};

export type DocEstadoCountInput = {
  createdById: string;
  estado: string;
  creadoPor: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
    email: string;
  };
};

/** Parsea metaJson de DOC_REVIEW_RESOLVED. */
export function parseDocReviewResolvedMeta(
  metaJson: string | null | undefined,
): {
  decision: string | undefined;
  motivoRechazo: string | null;
} {
  if (!metaJson?.trim()) {
    return { decision: undefined, motivoRechazo: null };
  }
  try {
    const parsed: unknown = JSON.parse(metaJson);
    if (typeof parsed !== 'object' || parsed === null) {
      return { decision: undefined, motivoRechazo: null };
    }
    const meta = parsed as Record<string, unknown>;
    const decision =
      typeof meta.decision === 'string' ? meta.decision.trim() : undefined;
    const motivoRaw =
      typeof meta.motivoRechazo === 'string' ? meta.motivoRechazo.trim() : '';
    return {
      decision: decision || undefined,
      motivoRechazo: motivoRaw.length > 0 ? motivoRaw : null,
    };
  } catch {
    return { decision: undefined, motivoRechazo: null };
  }
}

/**
 * Por cada documento, conserva solo el DOC_REVIEW_RESOLVED más reciente.
 * Entradas sin resourceId se ignoran.
 */
export function pickLatestReviewByDocumentoId(
  rows: AuditReviewRow[],
): Map<string, AuditReviewRow> {
  const map = new Map<string, AuditReviewRow>();
  for (const row of rows) {
    const id = row.resourceId?.trim();
    if (!id) continue;
    const prev = map.get(id);
    if (!prev || row.createdAt.getTime() > prev.createdAt.getTime()) {
      map.set(id, row);
    }
  }
  return map;
}

export function emptyDocumentosPorUsuarioSummary(): DocumentosPorUsuarioSummary {
  return {
    total: 0,
    aprobados: 0,
    rechazados: 0,
    enRevision: 0,
    registrados: 0,
    borradores: 0,
    archivados: 0,
  };
}

export function buildDocumentosPorUsuarioSummary(
  estados: string[],
): DocumentosPorUsuarioSummary {
  const summary = emptyDocumentosPorUsuarioSummary();
  summary.total = estados.length;
  for (const raw of estados) {
    const e = raw.trim().toUpperCase();
    switch (e) {
      case 'APROBADO':
        summary.aprobados += 1;
        break;
      case 'RECHAZADO':
        summary.rechazados += 1;
        break;
      case 'EN_REVISION':
        summary.enRevision += 1;
        break;
      case 'REGISTRADO':
        summary.registrados += 1;
        break;
      case 'BORRADOR':
        summary.borradores += 1;
        break;
      case 'ARCHIVADO':
        summary.archivados += 1;
        break;
      default:
        break;
    }
  }
  return summary;
}

/** Agrupa conteos por usuario creador (orden: total desc, email asc). */
export function buildResumenPorUsuario(
  docs: DocEstadoCountInput[],
): ResumenPorUsuarioRow[] {
  const map = new Map<string, ResumenPorUsuarioRow>();
  for (const d of docs) {
    let row = map.get(d.createdById);
    if (!row) {
      row = {
        userId: d.creadoPor.id,
        nombres: d.creadoPor.nombres,
        apellidos: d.creadoPor.apellidos,
        email: d.creadoPor.email,
        total: 0,
        aprobados: 0,
        rechazados: 0,
        enRevision: 0,
        registrados: 0,
        borradores: 0,
        archivados: 0,
      };
      map.set(d.createdById, row);
    }
    row.total += 1;
    const e = d.estado.trim().toUpperCase();
    if (e === 'APROBADO') row.aprobados += 1;
    else if (e === 'RECHAZADO') row.rechazados += 1;
    else if (e === 'EN_REVISION') row.enRevision += 1;
    else if (e === 'REGISTRADO') row.registrados += 1;
    else if (e === 'BORRADOR') row.borradores += 1;
    else if (e === 'ARCHIVADO') row.archivados += 1;
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.email.localeCompare(b.email, 'es');
  });
}

export function resolveRevisorDisplay(
  audit: AuditReviewRow | undefined,
  userById: Map<
    string,
    {
      id: string;
      nombres: string | null;
      apellidos: string | null;
      email: string;
    }
  >,
): ReviewActorRef | null {
  if (!audit) return null;
  if (audit.actorUserId) {
    const u = userById.get(audit.actorUserId);
    if (u) {
      return {
        id: u.id,
        nombres: u.nombres,
        apellidos: u.apellidos,
        email: u.email,
      };
    }
  }
  const email = audit.actorEmail?.trim();
  if (email) {
    return {
      id: audit.actorUserId,
      nombres: null,
      apellidos: null,
      email,
    };
  }
  return null;
}

export function buildRevisionFromAudit(
  audit: AuditReviewRow | undefined,
  userById: Map<
    string,
    {
      id: string;
      nombres: string | null;
      apellidos: string | null;
      email: string;
    }
  >,
): DocumentoRevisionInfo | null {
  if (!audit) return null;
  const meta = parseDocReviewResolvedMeta(audit.metaJson);
  return {
    revisadoPor: resolveRevisorDisplay(audit, userById),
    fecha: audit.createdAt,
    decision: meta.decision ?? '—',
    motivoRechazo: meta.motivoRechazo,
  };
}
