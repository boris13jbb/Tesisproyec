/**
 * Etiqueta para `ultimoLoginAt` (solo login con credenciales, no refresh silencioso).
 */
export function formatUltimoIngreso(iso: string | null | undefined): {
  relativo: string;
  absoluto: string;
} {
  if (iso == null || iso === '') {
    return {
      relativo: 'Sin acceso registrado',
      absoluto: 'Aún sin inicio de sesión desde el servidor',
    };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { relativo: '—', absoluto: 'Fecha inválida' };
  }

  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const secAbs = Math.abs(diffSec);

  let relativo: string;
  if (secAbs < 45) relativo = rtf.format(0, 'second');
  else if (secAbs < 45 * 60) {
    const m = Math.round(diffSec / 60);
    relativo = rtf.format(m, 'minute');
  } else if (secAbs < 24 * 3600) {
    const h = Math.round(diffSec / 3600);
    relativo = rtf.format(h, 'hour');
  } else if (secAbs < 28 * 24 * 3600) {
    const days = Math.round(diffSec / 86400);
    relativo = rtf.format(days, 'day');
  } else {
    const weeks = Math.round(diffSec / (7 * 86400));
    if (Math.abs(weeks) < 52) relativo = rtf.format(weeks, 'week');
    else {
      const months = Math.round(diffSec / (30 * 86400));
      relativo = rtf.format(months, 'month');
    }
  }

  const absoluto = d.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return { relativo, absoluto };
}
