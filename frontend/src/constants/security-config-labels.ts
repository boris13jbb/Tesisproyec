/**
 * Textos de la pantalla Administración → Configuración (parámetros de seguridad).
 * Solo controles verificables en servidor; detalle técnico en tooltips (soporte).
 */

export const SECURITY_CONFIG_COPY = {
  pageSubtitle:
    'Consulte los controles de autenticación y protección que el sistema aplica hoy, y registre revisiones institucionales.',
  infoBanner:
    'Esta pantalla muestra únicamente controles que el servidor aplica de forma verificable. Para dejar constancia de una revisión periódica use las notas al final; el registro queda en auditoría.',
  authPanelTitle: 'Autenticación y acceso',
  authPanelSubtitle: 'Valores efectivos comprobados en el servidor',
  opsNote:
    'El bloqueo de cuenta y la duración de sesión se definen en la configuración del servidor (entorno de despliegue). No se modifican desde esta pantalla; aquí solo se consultan como evidencia.',
  reviewSectionTitle: 'Registro de revisión institucional',
  reviewSectionHelper:
    'Opcional. Documente una revisión periódica, hallazgo o acuerdo del comité de seguridad. Se guarda con una instantánea de los valores en uso.',
  appPanelSubtitle: 'Protecciones generales ya activas en el sistema',
  loginLimitSummary: (attempts: number, minutes: number) =>
    `Inicio de sesión: máximo ${attempts} intentos cada ${minutes} minutos por conexión (evita ataques de fuerza bruta).`,
  saveSuccess:
    'Revisión registrada. La constancia quedó en auditoría junto con el estado verificado del servidor.',
  saveFail:
    'No se pudo registrar la revisión. Compruebe que sigue conectado como administrador y que el servidor está en línea.',
  notesLabel: 'Notas de la revisión (motivo, acuerdos, referencia)',
  notesHelper: 'Máximo 800 caracteres. No incluya contraseñas ni datos personales innecesarios.',
  loadFail:
    'No se pudo cargar la configuración de seguridad. Compruebe que inició sesión como administrador y que el servidor está en línea.',
  appPanelTitle: 'Protecciones del sistema',
  saveReviewButton: 'Registrar revisión',
  savingReviewButton: 'Registrando…',
} as const;

export const APPLICATION_CONTROL_ROWS: {
  title: string;
  description: string;
  technicalHint: string;
}[] = [
  {
    title: 'Validación de formularios',
    description:
      'Antes de guardar, el sistema comprueba tipos, formatos y campos obligatorios.',
    technicalHint: 'ValidationPipe global + DTO (OWASP ASVS V5).',
  },
  {
    title: 'Sesión y navegador',
    description:
      'La sesión se mantiene de forma segura; la contraseña no se vuelve a pedir en cada pantalla mientras la sesión siga vigente.',
    technicalHint: 'JWT en memoria, cookie HttpOnly de renovación, CORS con credenciales.',
  },
  {
    title: 'Protección en el navegador',
    description:
      'Reduce riesgos de páginas falsas incrustadas y de exposición indebida de contenido. Los errores se registran en auditoría sin filtrar datos sensibles al usuario.',
    technicalHint: 'Helmet (cabeceras HTTP de endurecimiento).',
  },
  {
    title: 'Archivos adjuntos',
    description:
      'Solo se permiten tipos de archivo autorizados y un tamaño máximo por archivo.',
    technicalHint: 'Lista MIME en servidor + límite de MB en upload.',
  },
];
