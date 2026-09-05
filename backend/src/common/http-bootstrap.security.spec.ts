import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  INestApplication,
  NotFoundException,
  PayloadTooLargeException,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerException } from '@nestjs/throttler';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { SafeExceptionFilter } from './filters/safe-exception.filter';
import { applyHttpBootstrap } from './http-bootstrap.util';
import { ToSafeBoolean } from './strict-boolean.util';

class ProbeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @ToSafeBoolean()
  @IsBoolean()
  activo?: boolean;
}

class PageQueryDto {
  @IsInt()
  @Min(1)
  pageSize!: number;
}

@Controller()
class ProbeController {
  @Post('probe')
  probe(@Body() dto: ProbeDto) {
    return dto;
  }

  @Get('page')
  page(@Query() q: PageQueryDto) {
    return { pageSize: q.pageSize, kind: typeof q.pageSize };
  }

  @Get('boom')
  boom(): never {
    throw new Error('P2002 mysql://root:secret@127.0.0.1:3306/sgd password=x');
  }

  @Get('ex/400')
  ex400(): never {
    throw new BadRequestException('Campo inválido');
  }

  @Get('ex/401')
  ex401(): never {
    throw new UnauthorizedException('Credenciales inválidas');
  }

  @Get('ex/403')
  ex403(): never {
    throw new ForbiddenException('No autorizado');
  }

  @Get('ex/404')
  ex404(): never {
    throw new NotFoundException('No encontrado');
  }

  @Get('ex/409')
  ex409(): never {
    throw new ConflictException('Conflicto');
  }

  @Get('ex/413')
  ex413(): never {
    throw new PayloadTooLargeException('Archivo demasiado grande');
  }

  @Get('ex/429')
  ex429(): never {
    throw new ThrottlerException();
  }
}

describe('HTTP bootstrap (CORS / headers / validation / errors)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => {
              if (k === 'CORS_ORIGIN') {
                return 'http://localhost:5173, https://sgd.local.test';
              }
              if (k === 'NODE_ENV') return 'test';
              if (k === 'PORT') return '3000';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    applyHttpBootstrap(app, app.get(ConfigService));
    app.useGlobalFilters(new SafeExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('origen permitido refleja ACAO; no permitido no refleja', async () => {
    const ok = await request(app.getHttpServer())
      .get('/api/v1/probe')
      .set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    expect(ok.headers['access-control-allow-origin']).not.toBe('*');

    const okB = await request(app.getHttpServer())
      .get('/api/v1/probe')
      .set('Origin', 'https://sgd.local.test');
    expect(okB.headers['access-control-allow-origin']).toBe(
      'https://sgd.local.test',
    );

    const bad = await request(app.getHttpServer())
      .get('/api/v1/probe')
      .set('Origin', 'https://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('substring malicioso, path y Origin null no pasan', async () => {
    const sub = await request(app.getHttpServer())
      .get('/api/v1/probe')
      .set('Origin', 'http://localhost:5173.evil.test');
    expect(sub.headers['access-control-allow-origin']).toBeUndefined();

    const trustedEvil = await request(app.getHttpServer())
      .get('/api/v1/probe')
      .set('Origin', 'https://sgd.local.test.evil.test');
    expect(trustedEvil.headers['access-control-allow-origin']).toBeUndefined();

    const withPath = await request(app.getHttpServer())
      .get('/api/v1/probe')
      .set('Origin', 'http://localhost:5173/admin');
    expect(withPath.headers['access-control-allow-origin']).toBeUndefined();

    const nul = await request(app.getHttpServer())
      .get('/api/v1/probe')
      .set('Origin', 'null');
    expect(nul.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('preflight de origen permitido responde 204/2xx con CORS', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/v1/probe')
      .set('Origin', 'https://sgd.local.test')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBeLessThan(400);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://sgd.local.test',
    );
  });

  it('sin Origin no rompe (server-to-server)', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/probe').send({
      name: 'ok',
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ name: 'ok' });
  });

  it('campo extra → 400; JSON __proto__ no contamina Object.prototype', async () => {
    const extra = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: 'ok', extra: 1 });
    expect(extra.status).toBe(400);

    const proto = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .set('Content-Type', 'application/json')
      .send('{"name":"ok","__proto__":{"admin":true}}');
    expect(proto.status).toBe(201);
    expect(proto.body).toEqual({ name: 'ok' });
    expect(Object.prototype).not.toHaveProperty('admin');

    const ctor = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .set('Content-Type', 'application/json')
      .send('{"name":"ok","constructor":{"prototype":{"pwn":true}}}');
    expect(ctor.status).toBe(201);
    expect(ctor.body).toEqual({ name: 'ok' });
    expect(Object.prototype).not.toHaveProperty('pwn');
  });

  it('string "false" no se convierte a true; false real se conserva', async () => {
    const asString = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: 'ok', activo: 'false' });
    expect(asString.status).toBe(201);
    expect(asString.body).toEqual({ name: 'ok', activo: false });

    const asBool = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: 'ok', activo: false });
    expect(asBool.status).toBe(201);
    expect(asBool.body).toEqual({ name: 'ok', activo: false });

    const asTrue = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: 'ok', activo: 'true' });
    expect(asTrue.body).toEqual({ name: 'ok', activo: true });
  });

  it('query numérico pageSize sigue transformándose a number', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/page?pageSize=20',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pageSize: 20, kind: 'number' });
  });

  it('headers: sin X-Powered-By, nosniff, SAMEORIGIN, sin HSTS en test', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/probe').send({
      name: 'ok',
    });
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  it('HttpException conserva status y mensaje; 500 interno sanitizado', async () => {
    const cases: Array<{ path: string; status: number; snippet: string }> = [
      { path: '/api/v1/ex/400', status: 400, snippet: 'Campo inválido' },
      {
        path: '/api/v1/ex/401',
        status: 401,
        snippet: 'Credenciales inválidas',
      },
      { path: '/api/v1/ex/403', status: 403, snippet: 'No autorizado' },
      { path: '/api/v1/ex/404', status: 404, snippet: 'No encontrado' },
      { path: '/api/v1/ex/409', status: 409, snippet: 'Conflicto' },
      {
        path: '/api/v1/ex/413',
        status: 413,
        snippet: 'Archivo demasiado grande',
      },
    ];
    for (const c of cases) {
      const res = await request(app.getHttpServer()).get(c.path);
      expect(res.status).toBe(c.status);
      expect(JSON.stringify(res.body)).toContain(c.snippet);
    }

    const tooMany = await request(app.getHttpServer()).get('/api/v1/ex/429');
    expect(tooMany.status).toBe(429);

    const boom = await request(app.getHttpServer()).get('/api/v1/boom');
    expect(boom.status).toBe(500);
    const raw = JSON.stringify(boom.body);
    expect(raw).not.toMatch(/password|mysql:\/\/|127\.0\.0\.1|P2002|eyJ/i);
    expect(raw).not.toMatch(/at ProbeController/);
    expect(boom.body).toEqual({
      statusCode: 500,
      message: 'Error interno del servidor',
    });
  });
});
