/**
 * Parsea `DATABASE_URL` estilo Prisma (`mysql://user:pass@host:port/db`).
 * Password puede ir URL-encoded (p. ej. %40).
 */
export function parseMysqlDatabaseUrl(raw: string): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
} {
  const s = raw.trim();
  if (!s.length) {
    throw new Error('DATABASE_URL vacío');
  }
  const withoutScheme = s.replace(/^mysql:\/\/(\/)?/i, '');
  const slashDb = withoutScheme.indexOf('/');
  if (slashDb < 0) {
    throw new Error('DATABASE_URL sin nombre de base (/db)');
  }
  const authHost = withoutScheme.slice(0, slashDb);
  const dbPart = withoutScheme.slice(slashDb + 1);
  const database = decodeURIComponent(dbPart.split(/[?#]/)[0] ?? '').trim();
  if (!database) {
    throw new Error('DATABASE_URL sin base de datos');
  }

  const at = authHost.lastIndexOf('@');
  const credentials = at >= 0 ? authHost.slice(0, at) : '';
  const hostport = at >= 0 ? authHost.slice(at + 1) : authHost;
  let user = '';
  let password = '';
  if (credentials.length > 0) {
    const colon = credentials.indexOf(':');
    user = decodeURIComponent(
      colon >= 0 ? credentials.slice(0, colon) : credentials,
    ).trim();
    password = decodeURIComponent(
      colon >= 0 ? credentials.slice(colon + 1) : '',
    );
  }

  /** Host puede ser `[::1]` o nombre; puerto opcional `:3306`. */
  let host = hostport;
  let port = '3306';
  if (hostport.startsWith('[')) {
    const endBracket = hostport.indexOf(']');
    if (endBracket >= 0) {
      host = hostport.slice(0, endBracket + 1);
      const rest = hostport.slice(endBracket + 1);
      if (rest.startsWith(':')) {
        port = rest.slice(1) || '3306';
      }
    }
  } else {
    const lastColon = hostport.lastIndexOf(':');
    const maybePort =
      lastColon > 0 && !hostport.slice(0, lastColon).includes(':')
        ? hostport.slice(lastColon + 1)
        : null;
    if (maybePort && /^\d+$/.test(maybePort)) {
      host = hostport.slice(0, lastColon);
      port = maybePort;
    }
  }

  if (!host) {
    throw new Error('DATABASE_URL sin host');
  }

  return { host, port, user, password, database };
}
