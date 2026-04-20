import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
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
