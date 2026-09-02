export type UsuarioListRow = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  dependenciaId: string | null;
  cargoId: string | null;
  activo: boolean;
  ultimoLoginAt?: string | null;
  roles: { codigo: string; nombre: string }[];
  directPermissionCodes?: string[];
};

export function displayUsuario(u: Pick<UsuarioListRow, 'nombres' | 'apellidos' | 'email'>): string {
  const n = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim();
  return n || u.email;
}

export function usuarioInitials(u: Pick<UsuarioListRow, 'nombres' | 'apellidos' | 'email'>): string {
  const joined = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim();
  if (joined) {
    const parts = joined.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return u.email.slice(0, 2).toUpperCase();
}
