export type BreadcrumbItem = { label: string; to?: string };

export type BreadcrumbOptions = {
  /** Sustituye la etiqueta genérica "Detalle" en `/documentos/:id`. */
  documentDetailLabel?: string | null;
};

const CATALOGO_LABELS: Record<string, string> = {
  dependencias: 'Dependencias',
  cargos: 'Cargos',
  'tipos-documentales': 'Tipos documentales',
  series: 'Series',
  subseries: 'Subseries',
};

/**
 * Migas de pan derivadas solo de la URL (sin fetch de entidades).
 * Ampliar cuando existan rutas de búsqueda, reportes o auditoría.
 */
export function getBreadcrumbsForPath(
  pathname: string,
  options?: BreadcrumbOptions,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: 'Inicio', to: '/' }];

  if (pathname === '/') {
    return items;
  }

  if (pathname === '/documentos') {
    items.push({ label: 'Documentos', to: '/documentos' });
    return items;
  }

  if (pathname === '/tramites') {
    items.push({ label: 'Trámites', to: pathname });
    return items;
  }

  if (pathname === '/clasificacion') {
    items.push({ label: 'Clasificación', to: pathname });
    return items;
  }

  if (pathname === '/perfil') {
    items.push({ label: 'Perfil de usuario', to: pathname });
    return items;
  }

  if (pathname === '/documentos/nuevo') {
    items.push({ label: 'Documentos', to: '/documentos' });
    items.push({ label: 'Nuevo documento', to: pathname });
    return items;
  }

  if (pathname.startsWith('/documentos/')) {
    items.push({ label: 'Documentos', to: '/documentos' });
    const detail =
      options?.documentDetailLabel?.trim() || 'Detalle';
    items.push({ label: detail, to: pathname });
    return items;
  }

  if (pathname.startsWith('/catalogos/')) {
    items.push({ label: 'Catálogos' });
    const segment = pathname.split('/').filter(Boolean)[1];
    const label = segment ? CATALOGO_LABELS[segment] ?? segment : 'Catálogo';
    items.push({ label, to: pathname });
    return items;
  }

  if (pathname.startsWith('/admin/')) {
    items.push({ label: 'Administración' });
    const segment = pathname.split('/').filter(Boolean)[1];
    const adminLabels: Record<string, string> = {
      usuarios: 'Usuarios y roles',
      auditoria: 'Auditoría',
      respaldos: 'Respaldos y seguridad',
      reportes: 'Reportes',
      configuracion: 'Configuración de seguridad',
    };
    const label = segment ? (adminLabels[segment] ?? segment) : 'Admin';
    items.push({ label, to: pathname });
    return items;
  }

  items.push({ label: 'Página' });
  return items;
}
