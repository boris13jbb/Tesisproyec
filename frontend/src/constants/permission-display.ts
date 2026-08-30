import { DIRECT_PERMISSIONS_BLOCKED_FOR_ADMIN } from './direct-permissions-policy';

/** Orden de módulos en listados de permisos. */
export const PERMISSION_MODULE_ORDER = [
  'Documentos',
  'Revisiones',
  'Reportes',
  'Auditoría',
  'Panel',
  'Catálogos',
  'Usuarios',
  'Seguridad',
] as const;

export type PermissionModule = (typeof PERMISSION_MODULE_ORDER)[number];

type PermissionDisplayMeta = {
  label: string;
  description: string;
  module: PermissionModule;
};

/** Presentación humana — no define autorización (eso viene de BD/API). */
const PERMISSION_DISPLAY: Record<string, PermissionDisplayMeta> = {
  DOC_READ: {
    label: 'Ver documentos',
    description: 'Consultar listados, detalle, tablón y clasificación documental.',
    module: 'Documentos',
  },
  DOC_CREATE: {
    label: 'Crear documentos',
    description: 'Registrar nuevos documentos administrativamente.',
    module: 'Documentos',
  },
  DOC_UPDATE: {
    label: 'Editar documentos',
    description: 'Modificar metadatos de documentos existentes.',
    module: 'Documentos',
  },
  DOC_ACCESS_MANAGE: {
    label: 'Administrar acceso por documento',
    description: 'Otorgar o revocar visibilidad de documentos a usuarios o roles.',
    module: 'Documentos',
  },
  DOC_FILES_READ: {
    label: 'Ver archivos adjuntos',
    description: 'Listar archivos adjuntos y eventos de archivo.',
    module: 'Documentos',
  },
  DOC_FILES_UPLOAD: {
    label: 'Subir archivos',
    description: 'Adjuntar archivos digitales a documentos.',
    module: 'Documentos',
  },
  DOC_FILES_DOWNLOAD: {
    label: 'Descargar archivos',
    description: 'Descargar archivos adjuntos de documentos.',
    module: 'Documentos',
  },
  DOC_FILES_DELETE: {
    label: 'Eliminar archivos',
    description: 'Eliminar archivos adjuntos de documentos.',
    module: 'Documentos',
  },
  DOC_REVISION_SEND: {
    label: 'Enviar documentos a revisión',
    description: 'Enviar un documento al flujo de revisión institucional.',
    module: 'Revisiones',
  },
  DOC_REVISION_RESOLVE: {
    label: 'Aprobar o rechazar documentos',
    description: 'Resolver revisiones pendientes (aprobar o rechazar).',
    module: 'Revisiones',
  },
  REPORTS_EXPORT: {
    label: 'Exportar reportes',
    description: 'Exportar reportes institucionales de documentos y auditoría.',
    module: 'Reportes',
  },
  REPORTS_PENDIENTES: {
    label: 'Exportar pendientes de revisión',
    description: 'Exportar listado de documentos pendientes de revisión.',
    module: 'Reportes',
  },
  AUDIT_READ: {
    label: 'Consultar auditoría',
    description: 'Ver líneas de auditoría del sistema.',
    module: 'Auditoría',
  },
  AUDIT_EXPORT: {
    label: 'Exportar auditoría',
    description: 'Exportar registros de auditoría en formatos institucionales.',
    module: 'Auditoría',
  },
  DASHBOARD_SUMMARY: {
    label: 'Ver resumen del panel',
    description: 'Acceder al resumen principal del panel de inicio.',
    module: 'Panel',
  },
  DASHBOARD_ADMIN_READ: {
    label: 'Ver indicadores administrativos',
    description: 'Consultar KPI y métricas administrativas del panel.',
    module: 'Panel',
  },
  BACKUP_VERIFICATION_RECORD: {
    label: 'Registrar verificación de respaldo',
    description: 'Registrar evidencia de verificación de respaldos en auditoría.',
    module: 'Seguridad',
  },
  BACKUP_RUN: {
    label: 'Ejecutar respaldos',
    description: 'Ejecutar respaldo de base de datos bajo demanda.',
    module: 'Seguridad',
  },
  SECURITY_POLICY_READ: {
    label: 'Consultar política de seguridad',
    description: 'Leer resumen y política de seguridad (sin secretos).',
    module: 'Seguridad',
  },
  SECURITY_POLICY_WRITE: {
    label: 'Configurar política de seguridad',
    description: 'Actualizar la política de seguridad institucional.',
    module: 'Seguridad',
  },
  DEPENDENCIAS_WRITE: {
    label: 'Administrar dependencias',
    description: 'Crear o editar dependencias en catálogos.',
    module: 'Catálogos',
  },
  CARGOS_WRITE: {
    label: 'Administrar cargos',
    description: 'Crear o editar cargos en catálogos.',
    module: 'Catálogos',
  },
  TIPOS_DOCUMENTALES_WRITE: {
    label: 'Administrar tipos documentales',
    description: 'Crear o editar tipos documentales.',
    module: 'Catálogos',
  },
  SERIES_WRITE: {
    label: 'Administrar series documentales',
    description: 'Crear o editar series documentales.',
    module: 'Catálogos',
  },
  SUBSERIES_WRITE: {
    label: 'Administrar subseries documentales',
    description: 'Crear o editar subseries documentales.',
    module: 'Catálogos',
  },
  CONTRAPARTES_WRITE: {
    label: 'Administrar contrapartes',
    description: 'Crear o editar contrapartes (persona natural/jurídica).',
    module: 'Catálogos',
  },
  BENEFICIARIOS_WRITE: {
    label: 'Administrar beneficiarios',
    description: 'Crear o editar beneficiarios del documento.',
    module: 'Catálogos',
  },
  USERS_READ: {
    label: 'Ver usuarios',
    description: 'Listar y consultar usuarios del sistema.',
    module: 'Usuarios',
  },
  USERS_CREATE: {
    label: 'Crear usuarios',
    description: 'Registrar nuevas cuentas e invitar por correo.',
    module: 'Usuarios',
  },
  USERS_UPDATE: {
    label: 'Editar usuarios',
    description: 'Modificar datos, roles y permisos de usuarios.',
    module: 'Usuarios',
  },
  USERS_DISABLE: {
    label: 'Activar o desactivar usuarios',
    description: 'Cambiar el estado activo/inactivo de cuentas.',
    module: 'Usuarios',
  },
  USERS_RESET_PASSWORD: {
    label: 'Restablecer contraseñas',
    description: 'Restablecer la contraseña de otro usuario.',
    module: 'Usuarios',
  },
};

const CRITICAL_EXTRA = new Set<string>([
  'USERS_READ',
  'DOC_ACCESS_MANAGE',
  'DOC_FILES_DELETE',
  'SECURITY_POLICY_READ',
  'BACKUP_VERIFICATION_RECORD',
  'DASHBOARD_ADMIN_READ',
  'AUDIT_EXPORT',
]);

const BLOCKED_DIRECT = new Set<string>(DIRECT_PERMISSIONS_BLOCKED_FOR_ADMIN);

export function permissionLabel(codigo: string): string {
  return PERMISSION_DISPLAY[codigo]?.label ?? codigo;
}

export function permissionDescription(
  codigo: string,
  serverDescription?: string | null,
): string {
  const local = PERMISSION_DISPLAY[codigo]?.description;
  if (local?.trim()) return local;
  return serverDescription?.trim() ?? '';
}

export function permissionModule(codigo: string): PermissionModule {
  return PERMISSION_DISPLAY[codigo]?.module ?? 'Documentos';
}

/** Permisos administrativos sensibles (política existente + gestión/seguridad). */
export function isCriticalPermission(codigo: string): boolean {
  return BLOCKED_DIRECT.has(codigo) || CRITICAL_EXTRA.has(codigo);
}

export function permissionMatchesSearch(
  codigo: string,
  query: string,
  serverDescription?: string | null,
): boolean {
  const t = query.trim().toLowerCase();
  if (!t) return true;
  const label = permissionLabel(codigo).toLowerCase();
  const desc = permissionDescription(codigo, serverDescription).toLowerCase();
  return codigo.toLowerCase().includes(t) || label.includes(t) || desc.includes(t);
}

export function groupPermissionsByModule(codigos: string[]): Map<PermissionModule, string[]> {
  const map = new Map<PermissionModule, string[]>();
  for (const mod of PERMISSION_MODULE_ORDER) {
    map.set(mod, []);
  }
  for (const c of codigos) {
    const mod = permissionModule(c);
    map.get(mod)?.push(c);
  }
  for (const [mod, list] of map) {
    map.set(
      mod,
      list.sort((a, b) => permissionLabel(a).localeCompare(permissionLabel(b), 'es')),
    );
  }
  return map;
}
