import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SafeExceptionFilter } from './common/filters/safe-exception.filter';
import { applyHttpBootstrap } from './common/http-bootstrap.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const { port } = applyHttpBootstrap(app, config);
  app.useGlobalFilters(new SafeExceptionFilter());
  await app.listen(port);
}
void bootstrap();
