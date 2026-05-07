/**
 * Matriz de acceso de referencia servida por API (ADMIN).
 * Debe alinearse con JwtAuthGuard + @Roles + @Permissions (PermissionsGuard) en controladores NestJS.
 * Espejo del catálogo en `frontend/src/constants/roles-access-matrix.ts`.
 */
export const ACCESS_MATRIX_COLUMNAS = [
  'ADMIN',
  'REVISOR',
  'USUARIO',
  'AUDITOR',
  'CONSULTA',
] as const;

export type AccessMatrixColumna = (typeof ACCESS_MATRIX_COLUMNAS)[number];

export type AccessMatrixFila = {
  modulo: string;
  ayuda?: string;
  porRol: Record<AccessMatrixColumna, boolean>;
};

export const ACCESS_MATRIX_FILAS: AccessMatrixFila[] = [
  {
    modulo: 'Inicio / panel',
    ayuda: 'Panel con JWT',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: true,
      AUDITOR: true,
      CONSULTA: true,
    },
  },
  {
    modulo: 'Consulta documental (ámbitos del servidor)',
    ayuda: 'Listado/detalle/exportaciones filtradas según reglas del documento',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: true,
      AUDITOR: true,
      CONSULTA: true,
    },
  },
  {
    modulo: 'Alta/edición/eliminaciones administrativas de documento',
    ayuda: 'POST/PATCH documento y adjuntos',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Enviar a revisión (propiedad del registro)',
    ayuda: 'Flujo cuando el estado lo permite',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: true,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Resolver revisión (aprobar/rechazar)',
    ayuda: 'POST resolver-revision',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Trámites (tablero) · Clasificación',
    ayuda: 'Vistas dentro de sesión',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: true,
      AUDITOR: true,
      CONSULTA: true,
    },
  },
  {
    modulo: 'Reportes servidor (documentos y auditoría)',
    ayuda:
      'GET /reportes/documentos*, /reportes/auditoria* · UI /admin/reportes',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Reporte pendientes de revisión',
    ayuda: 'GET pendientes-revision.*',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Catálogos (CRUD)',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Usuarios / roles',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Auditoría del sistema',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Respaldos y seguridad',
    ayuda: 'Pantalla ADMIN /admin/respaldos',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Configuración de seguridad (solo lectura UI)',
    ayuda: '/admin/configuracion · GET /auth/admin/security-summary',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
];

export type AccessMatrixReferenceDto = {
  columnas: AccessMatrixColumna[];
  filas: AccessMatrixFila[];
  nota: string;
  generadoEn: string;
};

export function buildAccessMatrixReference(): AccessMatrixReferenceDto {
  return {
    columnas: [...ACCESS_MATRIX_COLUMNAS],
    filas: ACCESS_MATRIX_FILAS.map((f) => ({
      modulo: f.modulo,
      ...(f.ayuda != null ? { ayuda: f.ayuda } : {}),
      porRol: { ...f.porRol },
    })),
    nota: 'Referencia efectiva según código del backend; no es matriz editable. La asignación de capacidades es por roles de usuario en la tabla de la izquierda.',
    generadoEn: new Date().toISOString(),
  };
}
