import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { HelmetOptions } from 'helmet';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

const DEFAULT_DEV_ORIGIN = 'http://localhost:5173';
const DEFAULT_PORT = 3000;

function asEnvString(raw: unknown, fallback = ''): string {
  if (typeof raw === 'string' || typeof raw === 'number') {
    return String(raw);
  }
  return fallback;
}

export function isProductionNodeEnv(raw: unknown): boolean {
  return asEnvString(raw).trim().toLowerCase() === 'production';
}

export function parseListenPort(raw: unknown, fallback = DEFAULT_PORT): number {
  const n = Number.parseInt(asEnvString(raw, String(fallback)), 10);
  if (!Number.isFinite(n) || n < 1 || n > 65535) return fallback;
  return n;
}

export function parseCorsOrigins(raw: unknown): string[] {
  const parts = asEnvString(raw, DEFAULT_DEV_ORIGIN)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .filter((o) => o !== '*')
    .filter((o) => {
      try {
        const u = new URL(o);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    });
  return parts.length ? [...new Set(parts)] : [DEFAULT_DEV_ORIGIN];
}

/** Comparación exacta. No usa includes() (evita substring bypass). */
export function isAllowedCorsOrigin(
  origin: string | undefined,
  allowlist: string[],
): boolean {
  if (!origin) return false;
  const o = origin.trim();
  if (!o || o === '*' || o.toLowerCase() === 'null') return false;
  return allowlist.includes(o);
}

export type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

export function createCorsOriginDelegate(allowlist: string[]) {
  return (origin: string | undefined, callback: CorsOriginCallback): void => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, isAllowedCorsOrigin(origin, allowlist));
  };
}

export function buildHelmetOptions(isProd: boolean): HelmetOptions {
  return {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProd ? { maxAge: 15_552_000, includeSubDomains: true } : false,
  };
}

export function disableXPoweredBy(app: INestApplication): void {
  const instance: unknown = app.getHttpAdapter().getInstance();
  if (
    typeof instance === 'object' &&
    instance !== null &&
    'disable' in instance &&
    typeof (instance as { disable: (k: string) => void }).disable === 'function'
  ) {
    (instance as { disable: (k: string) => void }).disable('x-powered-by');
  }
}

export function globalValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
}

export function applyHttpBootstrap(
  app: INestApplication,
  config: ConfigService,
): { port: number; origins: string[]; isProd: boolean } {
  app.use(cookieParser());
  const isProd = isProductionNodeEnv(config.get('NODE_ENV'));
  app.use(helmet(buildHelmetOptions(isProd)));
  disableXPoweredBy(app);

  const origins = parseCorsOrigins(config.get<string>('CORS_ORIGIN'));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(globalValidationPipe());
  app.enableCors({
    origin: createCorsOriginDelegate(origins),
    credentials: true,
  });

  return {
    port: parseListenPort(config.get('PORT'), DEFAULT_PORT),
    origins,
    isProd,
  };
}
