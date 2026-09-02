import type { EvaluacionLikertData } from '../EvaluacionLikertCharts';
import type { ActividadDocumentalPeriodo } from './actividad-documental-periodo';

export type DashboardActividadPorUsuarioMeta = {
  periodo: ActividadDocumentalPeriodo;
  sumaDocumentosPorUsuario: number;
  documentosSinCreadorIdentificado: number;
};

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

export type DashboardDistribucionPorTipoItem = {
  codigo: string;
  nombre: string;
  cantidad: number;
  porcentaje: number;
};

export type DashboardTipoDocumentalSerie = {
  codigo: string;
  nombre: string;
};

export type DashboardTipoPorMesSegmento = {
  codigo: string;
  nombre: string;
  cantidad: number;
};

export type DashboardTipoPorMesItem = {
  anio: number;
  mes: number;
  nombreMes: string;
  tipos: DashboardTipoPorMesSegmento[];
  total: number;
};

export type DashboardActividadPorUsuarioTipoItem = {
  tipoId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
};

export type DashboardActividadPorUsuarioItem = {
  usuarioId: string;
  nombre: string;
  email: string;
  rol: string;
  totalRegistrados: number;
  totalEnRevision: number;
  totalAprobados: number;
  totalRechazados: number;
  totalBorradores: number;
  tipos: DashboardActividadPorUsuarioTipoItem[];
};

export type DashboardMiActividadDocumental = {
  totalRegistrados: number;
  totalEnRevision: number;
  totalAprobados: number;
  totalRechazados: number;
  totalBorradores: number;
  documentosVisibles: number;
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
  distribucionPorTipo: DashboardDistribucionPorTipoItem[];
  tiposDocumentalesSeries: DashboardTipoDocumentalSerie[];
  tiposPorMes: DashboardTipoPorMesItem[];
  actividadPorUsuario: DashboardActividadPorUsuarioItem[] | null;
  actividadPorUsuarioMeta: DashboardActividadPorUsuarioMeta | null;
  actividadPeriodo: ActividadDocumentalPeriodo;
  miActividadDocumental: DashboardMiActividadDocumental | null;
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
