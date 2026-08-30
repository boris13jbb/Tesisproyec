/**
 * Matriz de acceso de referencia servida por API (ADMIN).
 * Debe alinearse con JwtAuthGuard + @Roles + @Permissions (PermissionsGuard) en controladores NestJS.
 * Espejo del catálogo en `frontend/src/constants/roles-access-matrix.ts`.
 */
export const ACCESS_MATRIX_COLUMNAS = [
  'ADMIN',
  'REVISOR',
  'USUARIO',
  'EDITOR_DOC',
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
    ayuda: 'Panel principal tras iniciar sesión',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: true,
      EDITOR_DOC: true,
      AUDITOR: true,
      CONSULTA: true,
    },
  },
  {
    modulo: 'Consulta documental (ámbitos del servidor)',
    ayuda: 'Listado, detalle y exportaciones según permisos del documento',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: true,
      EDITOR_DOC: true,
      AUDITOR: true,
      CONSULTA: true,
    },
  },
  {
    modulo: 'Alta/edición/eliminaciones administrativas de documento',
    ayuda:
      'Crear, modificar y adjuntar expedientes (según rol, estado y ámbito; eliminar archivos requiere permiso adicional)',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: true,
      EDITOR_DOC: true,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Enviar a revisión (propiedad del registro)',
    ayuda: 'Cuando el estado del documento lo permite',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: true,
      EDITOR_DOC: true,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Resolver revisión (aprobar/rechazar)',
    ayuda: 'Decisión de revisión en el expediente',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: false,
      EDITOR_DOC: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Trámites (tablero) · Clasificación',
    ayuda: 'Vistas de organización y seguimiento documental',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: true,
      EDITOR_DOC: true,
      AUDITOR: true,
      CONSULTA: true,
    },
  },
  {
    modulo: 'Reportes servidor (documentos y auditoría)',
    ayuda: 'Exportaciones administrativas de inventario y auditoría',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      EDITOR_DOC: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Reporte pendientes de revisión',
    ayuda: 'Bandeja de documentos en revisión',
    porRol: {
      ADMIN: true,
      REVISOR: true,
      USUARIO: false,
      EDITOR_DOC: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Catálogos (CRUD)',
    ayuda:
      'Dependencias, cargos, tipos documentales, contrapartes y beneficiarios',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      EDITOR_DOC: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Usuarios / roles',
    ayuda: 'Alta y administración de cuentas institucionales',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      EDITOR_DOC: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Auditoría del sistema',
    ayuda: 'Consulta de eventos de seguridad y operación',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      EDITOR_DOC: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Respaldos y seguridad',
    ayuda: 'Registro de verificación de copias y procedimiento documentado',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      EDITOR_DOC: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
  {
    modulo: 'Configuración de seguridad',
    ayuda: 'Consulta de controles en uso y registro de revisiones',
    porRol: {
      ADMIN: true,
      REVISOR: false,
      USUARIO: false,
      EDITOR_DOC: false,
      AUDITOR: false,
      CONSULTA: false,
    },
  },
];

export type AccessMatrixReferenceDto = {
  columnas: readonly string[];
  filas: Array<{
    modulo: string;
    ayuda?: string;
    porRol: Record<string, boolean>;
  }>;
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
    nota: 'Referencia de capacidades por rol según reglas actuales del servidor. No sustituye políticas corporativas de identidad.',
    generadoEn: new Date().toISOString(),
  };
}
