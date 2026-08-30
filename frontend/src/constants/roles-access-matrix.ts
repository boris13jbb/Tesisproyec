/**
 * Respaldo local solo si falla GET /usuarios/matriz-acceso-referencia (ADMIN).
 *
 * Mantener sincronizada con `backend/src/usuarios/access-matrix.reference.ts`.
 * Textos de ayuda: lenguaje institucional (sin rutas HTTP en la tabla visible).
 */
export const ROLES_MATRIX_COLS = [
  'ADMIN',
  'REVISOR',
  'USUARIO',
  'EDITOR_DOC',
  'AUDITOR',
  'CONSULTA',
] as const;

export type RolMatrixCodigo = (typeof ROLES_MATRIX_COLS)[number];

export type ModuloMatrixRow = {
  modulo: string;
  ayuda?: string;
} & Record<RolMatrixCodigo, boolean>;

export type AccessMatrixReferencia = {
  columnas: readonly string[];
  filas: Array<{ modulo: string; ayuda?: string; porRol: Record<string, boolean> }>;
  nota: string;
  generadoEn: string;
};

export const MODULOS_ACCESO_REFERENCIA: ModuloMatrixRow[] = [
  {
    modulo: 'Inicio / panel',
    ayuda: 'Panel principal tras iniciar sesión',
    ADMIN: true,
    REVISOR: true,
    USUARIO: true,
    EDITOR_DOC: true,
    AUDITOR: true,
    CONSULTA: true,
  },
  {
    modulo: 'Consulta documental (ámbitos del servidor)',
    ayuda: 'Listado, detalle y exportaciones según permisos del documento',
    ADMIN: true,
    REVISOR: true,
    USUARIO: true,
    EDITOR_DOC: true,
    AUDITOR: true,
    CONSULTA: true,
  },
  {
    modulo: 'Alta/edición/eliminaciones administrativas de documento',
    ayuda: 'Crear y modificar expedientes y adjuntos (según rol)',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    EDITOR_DOC: true,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Enviar a revisión (propiedad del registro)',
    ayuda: 'Cuando el estado del documento lo permite',
    ADMIN: true,
    REVISOR: true,
    USUARIO: true,
    EDITOR_DOC: true,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Resolver revisión (aprobar/rechazar)',
    ayuda: 'Decisión de revisión en el expediente',
    ADMIN: true,
    REVISOR: true,
    USUARIO: false,
    EDITOR_DOC: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Trámites (tablero) · Clasificación',
    ayuda: 'Vistas de organización y seguimiento documental',
    ADMIN: true,
    REVISOR: true,
    USUARIO: true,
    EDITOR_DOC: true,
    AUDITOR: true,
    CONSULTA: true,
  },
  {
    modulo: 'Reportes servidor (documentos y auditoría)',
    ayuda: 'Exportaciones administrativas de inventario y auditoría',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    EDITOR_DOC: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Reporte pendientes de revisión',
    ayuda: 'Bandeja de documentos en revisión',
    ADMIN: true,
    REVISOR: true,
    USUARIO: false,
    EDITOR_DOC: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Catálogos (CRUD)',
    ayuda: 'Dependencias, cargos, tipos documentales, contrapartes y beneficiarios',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    EDITOR_DOC: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Usuarios / roles',
    ayuda: 'Alta y administración de cuentas institucionales',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    EDITOR_DOC: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Auditoría del sistema',
    ayuda: 'Consulta de eventos de seguridad y operación',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    EDITOR_DOC: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Respaldos y seguridad',
    ayuda: 'Registro de verificación de copias y procedimiento documentado',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    EDITOR_DOC: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Configuración de seguridad',
    ayuda: 'Consulta de controles en uso y registro de revisiones',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    EDITOR_DOC: false,
    AUDITOR: false,
    CONSULTA: false,
  },
];

/** Si la API no responde, misma forma que `/usuarios/matriz-acceso-referencia`. */
export function buildLocalAccessMatrixFallback(): AccessMatrixReferencia {
  return {
    columnas: [...ROLES_MATRIX_COLS],
    filas: MODULOS_ACCESO_REFERENCIA.map((row) => ({
      modulo: row.modulo,
      ...(row.ayuda != null ? { ayuda: row.ayuda } : {}),
      porRol: Object.fromEntries(
        ROLES_MATRIX_COLS.map((c) => [c, row[c]] as const),
      ) as Record<string, boolean>,
    })),
    nota: 'Respaldo en el cliente (revise red o sesión ADMIN).',
    generadoEn: new Date().toISOString(),
  };
}
