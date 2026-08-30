import { ROLE_DISPLAY_NAME } from '../constants/role-display';

export type PermissionOrigin =
  | { kind: 'role'; roleCode: string }
  | { kind: 'additional' };

export type EffectivePermissionEntry = {
  codigo: string;
  allowed: boolean;
  origins: PermissionOrigin[];
};

/** Une permisos heredados de varios roles + adicionales del usuario. */
export function buildEffectivePermissions(input: {
  rolePermissionMap: Map<string, string[]>;
  directPermissionCodes: string[];
}): EffectivePermissionEntry[] {
  const byCode = new Map<string, PermissionOrigin[]>();

  for (const [roleCode, codes] of input.rolePermissionMap.entries()) {
    for (const codigo of codes) {
      const list = byCode.get(codigo) ?? [];
      if (!list.some((o) => o.kind === 'role' && o.roleCode === roleCode)) {
        list.push({ kind: 'role', roleCode });
      }
      byCode.set(codigo, list);
    }
  }

  for (const codigo of input.directPermissionCodes) {
    const list = byCode.get(codigo) ?? [];
    if (!list.some((o) => o.kind === 'additional')) {
      list.push({ kind: 'additional' });
    }
    byCode.set(codigo, list);
  }

  return [...byCode.entries()]
    .map(([codigo, origins]) => ({
      codigo,
      allowed: true,
      origins,
    }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}

export function formatPermissionOrigin(origins: PermissionOrigin[]): string {
  if (!origins.length) return '—';
  const parts = origins.map((o) => {
    if (o.kind === 'additional') return 'Permiso adicional';
    return `Heredado de: ${ROLE_DISPLAY_NAME[o.roleCode as keyof typeof ROLE_DISPLAY_NAME] ?? o.roleCode}`;
  });
  return parts.join(' · ');
}

/** Alterna un rol en la lista respetando al menos un rol activo. */
export function toggleRoleInList(
  currentRoles: string[],
  roleCode: string,
  enabled: boolean,
): string[] | null {
  const normalized = currentRoles.map((r) => r.trim().toUpperCase()).filter(Boolean);
  const set = new Set(normalized);
  if (enabled) {
    set.add(roleCode);
  } else {
    if (!set.has(roleCode)) return normalized;
    if (set.size <= 1) return null;
    set.delete(roleCode);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
