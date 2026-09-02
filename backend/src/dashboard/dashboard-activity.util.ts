import {
  parseAuditMetaJson,
  profileActivityLabel,
  profileDocumentoIdFromMeta,
} from '../auditoria/audit-action-labels.util';

export type DashboardActivityItem = {
  id: string;
  at: string;
  action: string;
  label: string;
};

const DASHBOARD_DOC_ACTIONS = [
  'DOC_CREATED',
  'DOC_STATE_CHANGED',
  'DOC_SUBMITTED_FOR_REVIEW',
  'DOC_REVIEW_RESOLVED',
  'DOC_FILE_UPLOADED',
  'DOC_FILE_DOWNLOADED',
  'DOC_FILE_DELETED',
  'DOC_ACCESS_UPDATED',
  'DOC_DEACTIVATED',
] as const;

const DASHBOARD_ADMIN_EXTRA_ACTIONS = [
  'USER_CREATED',
  'USER_UPDATED',
  'BACKUP_VERIFIED',
  'REPORT_EXPORTED',
] as const;

type AuditRow = {
  id: string;
  createdAt: Date;
  action: string;
  result: string;
  actorEmail: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metaJson: string | null;
};

function dashboardActivityLabel(
  row: AuditRow,
  codigoById: Map<string, string>,
  includeActor: boolean,
): string | null {
  const base = profileActivityLabel(row, codigoById);
  if (!base) {
    if (row.action === 'DOC_CREATED') {
      const meta = parseAuditMetaJson(row.metaJson);
      const codigo = typeof meta.codigo === 'string' ? meta.codigo : undefined;
      return codigo ? `Documento ${codigo} creado` : 'Documento creado';
    }
    if (row.action === 'DOC_REVIEW_RESOLVED') {
      const meta = parseAuditMetaJson(row.metaJson);
      const docId = profileDocumentoIdFromMeta(meta) ?? row.resourceId;
      const codigo = docId ? codigoById.get(docId) : undefined;
      const decision =
        typeof meta.decision === 'string' ? meta.decision.toUpperCase() : '';
      if (decision === 'APROBADO') {
        return codigo ? `Documento ${codigo} aprobado` : 'Documento aprobado';
      }
      if (decision === 'RECHAZADO') {
        return codigo ? `Documento ${codigo} rechazado` : 'Documento rechazado';
      }
      return codigo
        ? `Revisión resuelta en documento ${codigo}`
        : 'Revisión documental resuelta';
    }
    return null;
  }
  if (!includeActor || !row.actorEmail?.trim()) {
    return base;
  }
  return `${base} (${row.actorEmail.trim()})`;
}

export function buildDashboardActivityItems(
  rows: AuditRow[],
  codigoById: Map<string, string>,
  opts: { includeActor: boolean; max?: number },
): DashboardActivityItem[] {
  const max = opts.max ?? 8;
  const items: DashboardActivityItem[] = [];
  for (const row of rows) {
    if (row.result !== 'OK') continue;
    const label = dashboardActivityLabel(row, codigoById, opts.includeActor);
    if (!label) continue;
    items.push({
      id: row.id,
      at: row.createdAt.toISOString(),
      action: row.action,
      label,
    });
    if (items.length >= max) break;
  }
  return items;
}

export function dashboardActivityActionsForAdmin(): string[] {
  return [...DASHBOARD_DOC_ACTIONS, ...DASHBOARD_ADMIN_EXTRA_ACTIONS];
}

export function dashboardActivityActionsForUser(): string[] {
  return [...DASHBOARD_DOC_ACTIONS, 'AUTH_LOGIN_OK', 'AUTH_LOGOUT'];
}
