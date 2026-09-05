import type { TrafficLightLevel } from '../../../utils/traffic-light';

/** Respuesta de `GET /auditoria/stats` (contrato existente). */
export type AuditStatsResponse = {
  totales: { registros: number; ok: number; fail: number };
  documentos: {
    creados: number;
    modificados: number;
    archivosEliminados: number;
    desactivados: number;
  };
  porUsuario: {
    actorUserId: string | null;
    actorEmail: string | null;
    count: number;
  }[];
  sensiblesPorUsuario: {
    actorUserId: string | null;
    actorEmail: string | null;
    count: number;
    nivel: TrafficLightLevel;
  }[];
};

export type AuditSummaryCardDatum = {
  id: string;
  label: string;
  value: number;
  accent: 'default' | 'success' | 'error' | 'primary' | 'warning';
  icon: 'records' | 'ok' | 'fail' | 'created' | 'disabled' | 'deleted';
};

export type AuditOutcomeDatum = {
  name: 'OK' | 'Fallo';
  value: number;
};

export type AuditUserActionDatum = {
  label: string;
  fullLabel: string;
  value: number;
};

export type SensitiveAuditLevel = 'high' | 'medium' | 'low';

export type SensitiveAuditDatum = {
  label: string;
  fullLabel: string;
  value: number;
  level: SensitiveAuditLevel;
};
