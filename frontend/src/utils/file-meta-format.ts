/**
 * Formato humano de metadatos de archivos / eventos de adjunto.
 * No renderizar JSON crudo al usuario.
 */

export type FileEventTipoCodigo = 'SUBIDO' | 'DESCARGADO' | 'ELIMINADO' | string;

export type FileEventMetaFields = {
  originalName?: string;
  version?: number;
  mimeType?: string;
  sizeBytes?: number;
  sha256?: string;
  ip?: string;
};

export type HumanMetaRow = {
  label: string;
  value: string;
};

export type FileEventDisplay = {
  tipoLabel: string;
  chipColor: 'default' | 'info' | 'success' | 'warning' | 'error';
  rows: HumanMetaRow[];
  /** SHA u otros datos técnicos; ocultos por defecto en UI. */
  technicalRows: HumanMetaRow[];
  emptyHint?: string;
};

export function safeParseMetaJson(
  raw: string | null | undefined,
): Record<string, unknown> | null {
  if (raw == null || !String(raw).trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatMimeType(mime: string | null | undefined): string {
  const m = (mime ?? '').toLowerCase().trim();
  if (!m) return '—';
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'Imagen JPEG',
    'image/jpg': 'Imagen JPEG',
    'image/png': 'Imagen PNG',
    'image/webp': 'Imagen WebP',
    'image/gif': 'Imagen GIF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'Documento Word',
    'application/msword': 'Documento Word',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      'Hoja de cálculo Excel',
    'application/vnd.ms-excel': 'Hoja de cálculo Excel',
    'text/plain': 'Texto',
    'text/csv': 'CSV',
  };
  if (map[m]) return map[m];
  if (m.startsWith('image/')) return 'Imagen';
  if (m.startsWith('video/')) return 'Video';
  if (m.startsWith('audio/')) return 'Audio';
  if (m.includes('word')) return 'Documento Word';
  if (m.includes('sheet') || m.includes('excel')) return 'Hoja de cálculo Excel';
  if (m.includes('pdf')) return 'PDF';
  return 'Archivo';
}

/**
 * Normaliza IPs IPv4-mapeadas / loopback a una presentación institucional.
 */
export function normalizeIpAddress(raw: string | null | undefined): {
  display: string;
  isLocal: boolean;
} {
  let ip = (raw ?? '').trim();
  if (!ip) return { display: '—', isLocal: false };

  const lower = ip.toLowerCase();
  if (lower.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }
  if (ip === '::1' || ip === '127.0.0.1' || ip === '0:0:0:0:0:0:0:1') {
    return { display: '127.0.0.1', isLocal: true };
  }
  return { display: ip, isLocal: false };
}

export function formatIpOrigenLabel(raw: string | null | undefined): string {
  const { display, isLocal } = normalizeIpAddress(raw);
  if (display === '—') return '—';
  if (isLocal) return `Equipo local · ${display}`;
  return display;
}

export function formatFileEventType(tipo: string): {
  label: string;
  chipColor: FileEventDisplay['chipColor'];
} {
  const t = tipo.trim().toUpperCase();
  switch (t) {
    case 'SUBIDO':
      return { label: 'Archivo subido', chipColor: 'success' };
    case 'DESCARGADO':
      return { label: 'Archivo descargado', chipColor: 'info' };
    case 'ELIMINADO':
      return { label: 'Archivo eliminado', chipColor: 'error' };
    case 'REEMPLAZADO':
      return { label: 'Nueva versión cargada', chipColor: 'warning' };
    case 'RESTAURADO':
      return { label: 'Archivo restaurado', chipColor: 'default' };
    default:
      return { label: tipo.trim() || 'Evento', chipColor: 'default' };
  }
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function extractFileEventMeta(
  meta: Record<string, unknown> | null,
): FileEventMetaFields {
  if (!meta) return {};
  return {
    originalName: asString(meta.originalName),
    version: asNumber(meta.version),
    mimeType: asString(meta.mimeType),
    sizeBytes: asNumber(meta.sizeBytes),
    sha256: asString(meta.sha256),
    ip: asString(meta.ip),
  };
}

/**
 * Construye filas legibles para un evento de historial de archivo.
 */
export function buildFileEventDisplay(
  tipo: string,
  metaJson: string | null | undefined,
): FileEventDisplay {
  const { label, chipColor } = formatFileEventType(tipo);
  const parsed = safeParseMetaJson(metaJson);
  const fields = extractFileEventMeta(parsed);
  const rows: HumanMetaRow[] = [];
  const technicalRows: HumanMetaRow[] = [];

  if (fields.originalName) {
    rows.push({ label: 'Archivo', value: fields.originalName });
  }
  if (fields.version != null) {
    rows.push({ label: 'Versión', value: `v${fields.version}` });
  }
  if (fields.mimeType) {
    rows.push({ label: 'Tipo', value: formatMimeType(fields.mimeType) });
  }
  if (fields.sizeBytes != null) {
    rows.push({ label: 'Tamaño', value: formatFileSize(fields.sizeBytes) });
  }
  if (fields.ip) {
    rows.push({ label: 'Origen', value: formatIpOrigenLabel(fields.ip) });
  }
  if (fields.sha256) {
    technicalRows.push({ label: 'SHA-256', value: fields.sha256 });
  }

  const hasMeta = metaJson != null && String(metaJson).trim().length > 0;
  const emptyHint =
    !rows.length && !technicalRows.length
      ? hasMeta && !parsed
        ? 'No hay información adicional disponible.'
        : undefined
      : undefined;

  return { tipoLabel: label, chipColor, rows, technicalRows, emptyHint };
}

export function formatDateTimeEc(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
