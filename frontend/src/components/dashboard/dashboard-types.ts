import type { EvaluacionLikertData } from '../EvaluacionLikertCharts';

export type DashboardDocumentosBloque = {
  total: number;
  registrados: number;
  borradores: number;
  enRevision: number;
  aprobados: number;
  rechazados: number;
  creadosEsteMes: number;
  acumuladosAnteriores: number;
};

export type DashboardDocumentoPorMesItem = {
  anio: number;
  mes: number;
  nombreMes: string;
  cantidad: number;
};

export type DashboardActividadMes = {
  esteMes: number;
  mesAnterior: number;
  variacionPorcentaje: number | null;
  mensaje: string | null;
};

export type DashboardActivityItem = {
  id: string;
  at: string;
  action: string;
  label: string;
};

export type DashboardPendienteItem = {
  id: string;
  codigo: string;
  asunto: string;
  estado: string;
  fechaDocumento: string;
  tipoDocumental: string | null;
  ultimaActividadAt: string;
};

export type DashboardUsuariosResumen = {
  activos: number;
  inactivos: number;
};

export type DashboardAuditResumen = {
  accionesHoy: number;
  okHoy: number;
  failHoy: number;
};

export type DashboardViewerContext = {
  dependenciaNombre: string | null;
};

export type DashboardAlertItem = {
  codigo: string;
  mensaje: string;
};

export type ComplianceMetric = {
  key: string;
  title: string;
  standard: string;
  percent: number;
  evidence: Record<string, number | string | null>;
};

export type DocumentoRecentRow = {
  id: string;
  codigo: string;
  asunto: string;
  estado: string;
  fechaDocumento: string;
  ultimaActividadAt: string;
};

export type DashboardSummary = {
  generatedAt: string;
  kpis: {
    documentosTotal: number;
    documentosCreadosEsteMes: number;
    pendientesRevision: number;
    usuariosActivos: number | null;
    alertas: number;
    alertasItems: DashboardAlertItem[];
  };
  documentos: DashboardDocumentosBloque;
  documentosPorMes: DashboardDocumentoPorMesItem[];
  actividadMes: DashboardActividadMes;
  actividadReciente: DashboardActivityItem[];
  documentosPendientes: DashboardPendienteItem[];
  usuariosResumen: DashboardUsuariosResumen | null;
  auditResumen: DashboardAuditResumen | null;
  viewer: DashboardViewerContext;
  evaluacionLikert?: EvaluacionLikertData;
  documentosRecientes: DocumentoRecentRow[];
  compliance: ComplianceMetric[];
  lastSignals: {
    lastAuditAt: string | null;
    lastLoginOkAt: string | null;
    lastBackupVerifiedAt: string | null;
  };
};
