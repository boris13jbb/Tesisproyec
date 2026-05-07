/**
 * Navegación desde la tarjeta «Alertas» del panel (alineado con `kpis.alertasItems` del API).
 */

export type DashboardAlertItemClient = {
  codigo: string;
  mensaje: string;
};

/** Destino opcional tras el primer ítem navegable del listado combinado API + cliente. */
export function pickFirstDashboardAlertDestination(
  items: DashboardAlertItemClient[],
  isAdmin: boolean,
): string | null {
  for (const it of items) {
    const h = hrefForDashboardAlertCodigo(it.codigo, isAdmin);
    if (h) return h;
  }
  return null;
}

/** Ruta/con hash interno para revisar la causa de cada código. */
export function hrefForDashboardAlertCodigo(codigo: string, isAdmin: boolean): string | null {
  switch (codigo) {
    case 'PENDIENTES_REVISION':
      return '/documentos?estado=EN_REVISION';
    case 'AUTHZ_FORBIDDEN':
      return isAdmin ? '/admin/auditoria?action=AUTHZ_FORBIDDEN' : null;
    case 'AUTH_LOGIN_FAIL':
      return isAdmin ? '/admin/auditoria?action=AUTH_LOGIN_FAIL' : null;
    case 'BACKUP_SIN_REGISTRO':
      return isAdmin ? '/admin/respaldos' : null;
    case 'API_SALUD_CLIENTE':
    case 'DB_SIN_CONEXION':
      return '/#estado-servicio';
    case 'ADMIN_PING_FALLIDO':
      return '/#comprobacion-administrador';
    default:
      return null;
  }
}
