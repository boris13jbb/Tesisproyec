/**
 * Códigos estables de permiso (`Permission.codigo`).
 * Mantener alineados con seed (`prisma/seed.ts`) y con `@Permissions(...)` en controladores.
 */
export const PERM = {
  // Usuarios (docs/07)
  USERS_READ: 'USERS_READ',
  USERS_CREATE: 'USERS_CREATE',
  USERS_UPDATE: 'USERS_UPDATE',
  USERS_DISABLE: 'USERS_DISABLE',
  USERS_RESET_PASSWORD: 'USERS_RESET_PASSWORD',

  // Catálogos
  DEPENDENCIAS_WRITE: 'DEPENDENCIAS_WRITE',
  CARGOS_WRITE: 'CARGOS_WRITE',
  TIPOS_DOCUMENTALES_WRITE: 'TIPOS_DOCUMENTALES_WRITE',
  SERIES_WRITE: 'SERIES_WRITE',
  SUBSERIES_WRITE: 'SUBSERIES_WRITE',

  // Documentos
  DOC_READ: 'DOC_READ',
  DOC_CREATE: 'DOC_CREATE',
  DOC_UPDATE: 'DOC_UPDATE',
  DOC_ACCESS_MANAGE: 'DOC_ACCESS_MANAGE',

  DOC_REVISION_SEND: 'DOC_REVISION_SEND',
  DOC_REVISION_RESOLVE: 'DOC_REVISION_RESOLVE',

  DOC_FILES_READ: 'DOC_FILES_READ',
  DOC_FILES_UPLOAD: 'DOC_FILES_UPLOAD',
  DOC_FILES_DOWNLOAD: 'DOC_FILES_DOWNLOAD',
  DOC_FILES_DELETE: 'DOC_FILES_DELETE',

  REPORTS_EXPORT: 'REPORTS_EXPORT',
  REPORTS_PENDIENTES: 'REPORTS_PENDIENTES',

  AUDIT_READ: 'AUDIT_READ',
  AUDIT_EXPORT: 'AUDIT_EXPORT',

  DASHBOARD_SUMMARY: 'DASHBOARD_SUMMARY',
  DASHBOARD_ADMIN_READ: 'DASHBOARD_ADMIN_READ',
  BACKUP_VERIFICATION_RECORD: 'BACKUP_VERIFICATION_RECORD',
  BACKUP_RUN: 'BACKUP_RUN',

  SECURITY_POLICY_READ: 'SECURITY_POLICY_READ',
  SECURITY_POLICY_WRITE: 'SECURITY_POLICY_WRITE',
} as const;

export type PermissionCode = (typeof PERM)[keyof typeof PERM];

export const PERM_DESCRIPTIONS: Record<PermissionCode, string> = {
  USERS_READ: 'Listar y ver usuarios; matriz referencia RBAC.',
  USERS_CREATE: 'Crear usuarios e invitar por correo.',
  USERS_UPDATE: 'Editar usuarios, roles y estado.',
  USERS_DISABLE: 'Activar o desactivar cuentas (vía edición/usuario).',
  USERS_RESET_PASSWORD: 'Restablecer contraseña de otro usuario.',

  DEPENDENCIAS_WRITE: 'Crear o editar dependencias (catálogo).',
  CARGOS_WRITE: 'Crear o editar cargos (catálogo).',
  TIPOS_DOCUMENTALES_WRITE: 'Crear o editar tipos documentales.',
  SERIES_WRITE: 'Crear o editar series documentales.',
  SUBSERIES_WRITE: 'Crear o editar subseries documentales.',

  DOC_READ: 'Consultar listados, detalle, tablón y clasificación documental.',
  DOC_CREATE: 'Registrar nuevos documentos administrativamente.',
  DOC_UPDATE: 'Editar metadatos de documentos administrativamente.',
  DOC_ACCESS_MANAGE:
    'Administrar acceso por documento (ACL): otorgar/revocar visibilidad a usuarios/roles.',

  DOC_REVISION_SEND: 'Enviar documento a revisión.',
  DOC_REVISION_RESOLVE: 'Resolver revisión (aprobar/rechazar).',

  DOC_FILES_READ: 'Listar archivos adjuntos y eventos de archivo.',
  DOC_FILES_UPLOAD: 'Subir archivos adjuntos.',
  DOC_FILES_DOWNLOAD: 'Descargar archivos adjuntos.',
  DOC_FILES_DELETE: 'Eliminar archivos adjuntos.',

  REPORTS_EXPORT:
    'Exportar reportes institucionales (documentos y auditoría en módulo reportes).',
  REPORTS_PENDIENTES: 'Exportar listado de pendientes de revisión.',

  AUDIT_READ: 'Consultar líneas de auditoría del sistema (UI/listado).',
  AUDIT_EXPORT: 'Exportar auditoría vía reportes (xlsx/pdf).',

  DASHBOARD_SUMMARY: 'Ver resumen del panel principal.',
  DASHBOARD_ADMIN_READ:
    'Indicadores administrativos (respaldos, KPI reportes en dashboard).',
  BACKUP_VERIFICATION_RECORD:
    'Registrar verificación de respaldo en auditoría.',
  BACKUP_RUN: 'Ejecutar respaldo MySQL bajo demanda.',

  SECURITY_POLICY_READ: 'Leer resumen y política de seguridad (sin secretos).',
  SECURITY_POLICY_WRITE: 'Actualizar política de seguridad institucional.',
};

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(PERM);
