export const ROLE_OPTIONS = [
  'ADMIN',
  'USUARIO',
  'EDITOR_DOC',
  'REVISOR',
  'AUDITOR',
  'CONSULTA',
] as const;

export type RoleCode = (typeof ROLE_OPTIONS)[number];

/** Roles institucionales principales (uno por cuenta). EDITOR_DOC es complemento. */
export const PRIMARY_ROLE_OPTIONS = ['USUARIO', 'REVISOR', 'AUDITOR', 'CONSULTA', 'ADMIN'] as const;

export type PrimaryRoleCode = (typeof PRIMARY_ROLE_OPTIONS)[number];

const PRIMARY_ROLE_PRECEDENCE: readonly PrimaryRoleCode[] = [
  'ADMIN',
  'REVISOR',
  'AUDITOR',
  'CONSULTA',
  'USUARIO',
];

export const ROLE_DISPLAY_NAME: Record<RoleCode, string> = {
  ADMIN: 'Administrador',
  USUARIO: 'Usuario',
  EDITOR_DOC: 'Editor documental',
  REVISOR: 'Revisor',
  AUDITOR: 'Auditor',
  CONSULTA: 'Consulta',
};

export const PRIMARY_ROLE_HELP: Record<PrimaryRoleCode, string> = {
  USUARIO: 'Acceso operativo básico y envío de documentos a revisión.',
  REVISOR: 'Puede revisar, aprobar o rechazar documentos enviados a revisión.',
  AUDITOR: 'Puede consultar información y trazabilidad sin modificar documentos.',
  CONSULTA: 'Acceso de solo lectura.',
  ADMIN: 'Control total de administración del sistema.',
};

/** Ayuda para roles complementarios o secundarios en selector RBAC. */
export const ROLE_SUPPLEMENT_HELP: Partial<Record<RoleCode, string>> = {
  EDITOR_DOC: 'Permite crear y modificar documentos y archivos.',
};

export function roleHelpText(codigo: string): string {
  if (isPrimaryRoleCode(codigo)) return PRIMARY_ROLE_HELP[codigo];
  if (isRoleCode(codigo)) return ROLE_SUPPLEMENT_HELP[codigo] ?? '';
  return '';
}

/** Encabezado corto matriz — etiquetas institucionales por código de rol. */
export const ROL_COLUMNA_ETIQUETA: Record<string, string> = {
  ADMIN: 'Administrador',
  REVISOR: 'Revisor',
  USUARIO: 'Usuario',
  EDITOR_DOC: 'Editor documental',
  AUDITOR: 'Auditor',
  CONSULTA: 'Consulta',
};

export const FILTER_ROLE_OPTIONS = [
  { value: '', label: 'Todos' },
  ...PRIMARY_ROLE_OPTIONS.map((c) => ({ value: c, label: ROLE_DISPLAY_NAME[c] })),
  { value: 'EDITOR_DOC', label: ROLE_DISPLAY_NAME.EDITOR_DOC },
] as const;

export function isPrimaryRoleCode(value: string): value is PrimaryRoleCode {
  return (PRIMARY_ROLE_OPTIONS as readonly string[]).includes(value);
}

export function isRoleCode(value: string): value is RoleCode {
  return (ROLE_OPTIONS as readonly string[]).includes(value);
}

export function composeRoleCodes(primary: PrimaryRoleCode, editorDoc: boolean): RoleCode[] {
  if (primary === 'ADMIN') return ['ADMIN'];
  return editorDoc ? [primary, 'EDITOR_DOC'] : [primary];
}

export function parseRoleCodes(codes: string[]): {
  primary: PrimaryRoleCode;
  editorDoc: boolean;
  extrasDropped: string[];
} {
  const set = new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean));
  const primary = PRIMARY_ROLE_PRECEDENCE.find((c) => set.has(c)) ?? 'USUARIO';
  const editorDoc = set.has('EDITOR_DOC') && primary !== 'ADMIN';
  const extrasDropped = [...set].filter((c) => c !== primary && c !== 'EDITOR_DOC');
  return { primary, editorDoc, extrasDropped };
}

export function userHasRoleCode(
  roles: { codigo: string }[],
  codigo: string,
): boolean {
  return roles.some((r) => r.codigo === codigo);
}

export function userIsSuperAdminAccount(roles: { codigo: string }[]): boolean {
  return roles.some((r) => r.codigo === 'SUPERADMIN');
}

export function primaryRoleChipLabel(u: { roles: { codigo: string; nombre: string }[] }): string {
  const parsed = parseRoleCodes(u.roles.map((r) => r.codigo));
  return ROLE_DISPLAY_NAME[parsed.primary];
}
