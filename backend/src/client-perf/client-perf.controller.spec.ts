import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuditService } from '../auditoria/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtRequestUser } from '../auth/request-user';
import { ClientPerfController } from './client-perf.controller';

/**
 * POST /client-perf/web-vitals: JWT obligatorio, action/actor fijos del servidor,
 * DTO acotado; no permite falsificar eventos administrativos.
 */
describe('POST /client-perf/web-vitals (anti-falsificación RUM)', () => {
  let app: INestApplication<App>;
  const auditLog = jest.fn().mockResolvedValue(undefined);
  let authUser: JwtRequestUser | undefined;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ClientPerfController],
      providers: [{ provide: AuditService, useValue: { log: auditLog } }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx
            .switchToHttp()
            .getRequest<{ user?: JwtRequestUser }>();
          if (!authUser) {
            return false;
          }
          req.user = authUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    auditLog.mockClear();
    authUser = {
      id: 'user-rum-1',
      email: 'rum@local.test',
      nombres: 'Rum',
      apellidos: 'User',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    };
  });

  it('persiste solo acción fija CLIENT_WEB_VITAL_LCP con actor JWT', async () => {
    await request(app.getHttpServer())
      .post('/client-perf/web-vitals')
      .send({
        metric: 'LCP',
        valueMs: 1200,
        rating: 'good',
        pathname: '/dashboard',
        navigationType: 'navigate',
        metricId: 'v1-abc',
      })
      .expect(204);

    expect(auditLog).toHaveBeenCalledTimes(1);
    const calls = auditLog.mock.calls as Array<
      [
        {
          action: string;
          result: string;
          resource?: { type: string; id: null };
          context?: { actorUserId: string; actorEmail: string };
          meta?: Record<string, unknown>;
        },
      ]
    >;
    const payload = calls[0]?.[0];
    expect(payload?.action).toBe('CLIENT_WEB_VITAL_LCP');
    expect(payload?.result).toBe('OK');
    expect(payload?.resource).toEqual({ type: 'ClientPerf', id: null });
    expect(payload?.context?.actorUserId).toBe('user-rum-1');
    expect(payload?.context?.actorEmail).toBe('rum@local.test');
    expect(payload?.meta).toEqual({
      metric: 'LCP',
      valueMs: 1200,
      rating: 'good',
      pathname: '/dashboard',
      navigationType: 'navigate',
      metricId: 'v1-abc',
    });
    expect(payload?.meta).not.toHaveProperty('password');
    expect(payload?.meta).not.toHaveProperty('action');
    expect(payload?.meta).not.toHaveProperty('actorUserId');
  });

  it('rechaza intentos de falsificar action/actor/secretos vía body', async () => {
    await request(app.getHttpServer())
      .post('/client-perf/web-vitals')
      .send({
        metric: 'LCP',
        valueMs: 100,
        rating: 'good',
        action: 'AUTH_LOGIN',
        actorUserId: 'attacker',
        password: 'nope',
        accessToken: 'tok',
      })
      .expect(400);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('sin JWT → 403 del guard (no escribe audit)', async () => {
    authUser = undefined;
    await request(app.getHttpServer())
      .post('/client-perf/web-vitals')
      .send({ metric: 'LCP', valueMs: 100, rating: 'good' })
      .expect(403);
    expect(auditLog).not.toHaveBeenCalled();
  });
});
