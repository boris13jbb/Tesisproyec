export type ActividadUsuarioRaw = {
  usuarioId: string;
  nombre: string;
  email: string;
  rolNombre: string;
  documentosRegistrados: number;
};

export type ActividadPorUsuarioItem = {
  usuarioId: string;
  nombre: string;
  email: string;
  rol: string;
  documentosRegistrados: number;
};

export function buildTopActividadPorUsuario(
  rows: ActividadUsuarioRaw[],
  topN = 5,
): ActividadPorUsuarioItem[] {
  return [...rows]
    .filter((r) => r.documentosRegistrados > 0)
    .sort((a, b) => b.documentosRegistrados - a.documentosRegistrados)
    .slice(0, topN)
    .map((r) => ({
      usuarioId: r.usuarioId,
      nombre: r.nombre,
      email: r.email,
      rol: r.rolNombre,
      documentosRegistrados: r.documentosRegistrados,
    }));
}

export function displayUserName(
  nombres: string | null,
  apellidos: string | null,
  email: string,
): string {
  const parts = [nombres?.trim(), apellidos?.trim()].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }
  return email;
}
