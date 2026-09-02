export const ACTIVIDAD_DOCUMENTAL_PERIODOS = [
  'historico',
  'mes',
  '3m',
  'anio',
] as const;

export type ActividadDocumentalPeriodo =
  (typeof ACTIVIDAD_DOCUMENTAL_PERIODOS)[number];

export const ACTIVIDAD_DOCUMENTAL_PERIODO_DEFAULT: ActividadDocumentalPeriodo =
  'historico';

export const ACTIVIDAD_PERIODO_LABELS: Record<ActividadDocumentalPeriodo, string> = {
  historico: 'Histórico',
  mes: 'Este mes',
  '3m': 'Últimos 3 meses',
  anio: 'Este año',
};

export const ACTIVIDAD_PERIODO_SUBTITLES: Record<ActividadDocumentalPeriodo, string> = {
  historico:
    'Estado actual de todos los documentos registrados por cada usuario.',
  mes: 'Documentos registrados por cada usuario durante este mes.',
  '3m': 'Actividad documental de los últimos tres meses.',
  anio: 'Actividad documental correspondiente al año actual.',
};

export const USUARIO_NO_IDENTIFICADO_ID = '__sin_creador_identificado__';
