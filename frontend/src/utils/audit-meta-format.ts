/**
 * Presentación humana de `AuditLog.metaJson` (sin JSON crudo en UI).
 */

import { labelDocumentoEstado } from '../constants/documento-estado';
import {
  formatFileSize,
  formatMimeType,
  formatIpOrigenLabel,
  safeParseMetaJson,
} from './file-meta-format';

export type AuditMetaRow = { label: string; value: string };

const META_LABELS: Record<string, string> = {
  decision: 'Decisión',
  motivoRechazo: 'Motivo de rechazo',
  motivo: 'Motivo',
  from: 'Estado anterior',
  to: 'Estado nuevo',
  documentoId: 'Documento',
  codigo: 'Código',
  format: 'Formato',
  kind: 'Tipo de reporte',
  reason: 'Motivo',
  method: 'Método',
  path: 'Ruta',
  notes: 'Notas',
  tipoRespaldo: 'Tipo de respaldo',
  tamanoLabel: 'Tamaño',
  tamanoBytes: 'Tamaño',
  source: 'Origen',
  mimeType: 'Tipo de archivo',
  version: 'Versión',
  originalName: 'Archivo',
  sizeBytes: 'Tamaño',
  sha256: 'SHA-256',
  ip: 'Origen',
  result: 'Resultado',
  before: 'Antes',
  after: 'Después',
};

function labelEstadoLike(v: string): string {
  const known = [
    'BORRADOR',
    'REGISTRADO',
    'EN_REVISION',
    'APROBADO',
    'RECHAZADO',
    'ARCHIVADO',
  ];
  if (known.includes(v.trim().toUpperCase())) {
    return labelDocumentoEstado(v);
  }
  return v;
}

function formatMetaValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') {
    if (key === 'sizeBytes' || key === 'tamanoBytes') {
      return formatFileSize(value);
    }
    if (key === 'version') return `v${value}`;
    return String(value);
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return null;
    if (key === 'decision' || key === 'from' || key === 'to' || key === 'estado') {
      return labelEstadoLike(t);
    }
    if (key === 'mimeType') return formatMimeType(t);
    if (key === 'ip') return formatIpOrigenLabel(t);
    if (key === 'path' || key === 'method') return t;
    if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
      try {
        return new Intl.DateTimeFormat('es-EC', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(t));
      } catch {
        return t.slice(0, 19).replace('T', ' ');
      }
    }
    return t;
  }
  if (typeof value === 'object') {
    /** Objetos anidados: no volcar JSON; omitir en filas planas. */
    return null;
  }
  return null;
}

/**
 * Filas legibles a partir de metaJson de auditoría.
 * Combina `from`+`to` en una sola línea de transición cuando ambos existen.
 */
export function humanizeAuditMetaRows(
  metaJson: string | null | undefined,
): AuditMetaRow[] {
  const meta = safeParseMetaJson(metaJson);
  if (!meta) {
    if (metaJson != null && String(metaJson).trim()) {
      return [
        {
          label: 'Detalle',
          value: 'No hay información adicional disponible.',
        },
      ];
    }
    return [];
  }

  const rows: AuditMetaRow[] = [];
  const used = new Set<string>();

  const from = typeof meta.from === 'string' ? meta.from : undefined;
  const to = typeof meta.to === 'string' ? meta.to : undefined;
  if (from && to) {
    rows.push({
      label: 'Estado',
      value: `${labelEstadoLike(from)} → ${labelEstadoLike(to)}`,
    });
    used.add('from');
    used.add('to');
  }

  const decision = typeof meta.decision === 'string' ? meta.decision : undefined;
  if (decision) {
    rows.push({ label: 'Decisión', value: labelEstadoLike(decision) });
    used.add('decision');
  }

  const motivo =
    (typeof meta.motivoRechazo === 'string' && meta.motivoRechazo.trim()) ||
    (typeof meta.motivo === 'string' && meta.motivo.trim()) ||
    '';
  if (motivo) {
    rows.push({ label: 'Motivo', value: motivo });
    used.add('motivoRechazo');
    used.add('motivo');
  }

  const method = typeof meta.method === 'string' ? meta.method.trim() : '';
  const path = typeof meta.path === 'string' ? meta.path.trim() : '';
  if (method || path) {
    rows.push({
      label: 'Ruta',
      value: [method.toUpperCase(), path].filter(Boolean).join(' '),
    });
    used.add('method');
    used.add('path');
  }

  for (const [key, value] of Object.entries(meta)) {
    if (used.has(key)) continue;
    if (key === 'documentoId' || key === 'sha256') {
      continue;
    }
    const label = META_LABELS[key];
    if (!label) continue;
    const formatted = formatMetaValue(key, value);
    if (!formatted) continue;
    rows.push({ label, value: formatted });
  }

  return rows;
}
