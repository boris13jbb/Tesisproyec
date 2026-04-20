import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  // Express header hardening (evita fingerprinting)
  const instance: unknown = app.getHttpAdapter().getInstance();
  if (typeof instance === 'function') {
    // no-op
  } else if (
    typeof instance === 'object' &&
    instance !== null &&
    'disable' in instance &&
    typeof (instance as { disable: (k: string) => void }).disable === 'function'
  ) {
    (instance as { disable: (k: string) => void }).disable('x-powered-by');
  }
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const corsOrigin =
    config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173';
  const origins = corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: origins.length ? origins : ['http://localhost:5173'],
    credentials: true,
  });
  await app.listen(port);
}
void bootstrap();
