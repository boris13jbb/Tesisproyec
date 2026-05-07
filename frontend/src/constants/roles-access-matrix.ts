/**
 * Respaldo local solo si falla GET /usuarios/matriz-acceso-referencia (ADMIN).
 *
 * Mantener sincronizada con `backend/src/usuarios/access-matrix.reference.ts`.
 * Refleja políticas efectivas (JwtAuthGuard + @Roles), no sustituye IdM corporativo.
 */
export const ROLES_MATRIX_COLS = [
  'ADMIN',
  'REVISOR',
  'USUARIO',
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
    ayuda: 'Panel con JWT',
    ADMIN: true,
    REVISOR: true,
    USUARIO: true,
    AUDITOR: true,
    CONSULTA: true,
  },
  {
    modulo: 'Consulta documental (ámbitos del servidor)',
    ayuda: 'Listado/detalle/exportaciones filtradas según reglas del documento',
    ADMIN: true,
    REVISOR: true,
    USUARIO: true,
    AUDITOR: true,
    CONSULTA: true,
  },
  {
    modulo: 'Alta/edición/eliminaciones administrativas de documento',
    ayuda: 'POST/PATCH documento y adjuntos',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Enviar a revisión (propiedad del registro)',
    ayuda: 'Flujo cuando el estado lo permite',
    ADMIN: true,
    REVISOR: true,
    USUARIO: true,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Resolver revisión (aprobar/rechazar)',
    ayuda: 'POST resolver-revision',
    ADMIN: true,
    REVISOR: true,
    USUARIO: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Trámites (tablero) · Clasificación',
    ayuda: 'Vistas dentro de sesión',
    ADMIN: true,
    REVISOR: true,
    USUARIO: true,
    AUDITOR: true,
    CONSULTA: true,
  },
  {
    modulo: 'Reportes servidor (documentos y auditoría)',
    ayuda: 'GET /reportes/documentos*, /reportes/auditoria* · UI /admin/reportes · indicador GET /dashboard/admin/documentos-por-tipo',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Reporte pendientes de revisión',
    ayuda: 'GET pendientes-revision.*',
    ADMIN: true,
    REVISOR: true,
    USUARIO: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Catálogos (CRUD)',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Usuarios / roles',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Auditoría del sistema',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Respaldos y seguridad',
    ayuda: 'Pantalla ADMIN /admin/respaldos (procedimiento en scripts/README-backups-mysql-xampp.md)',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
    AUDITOR: false,
    CONSULTA: false,
  },
  {
    modulo: 'Configuración de seguridad (solo lectura UI)',
    ayuda: '/admin/configuracion · GET /auth/admin/security-summary',
    ADMIN: true,
    REVISOR: false,
    USUARIO: false,
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
