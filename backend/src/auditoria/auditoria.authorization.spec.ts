import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import { PermissionsService } from '../auth/permissions.service';
import type { JwtRequestUser } from '../auth/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';

/**
 * Autorización y redacción de GET /auditoria*:
 * ADMIN + AUDIT_READ; USER 403; meta sensible enmascarada; 404 si no existe.
 */
describe('GET /auditoria (autorización y redacción)', () => {
  let app: INestApplication<App>;
  const getCodesForUserId = jest.fn<Promise<Set<string>>, [string]>();
  const auditLogCount = jest.fn();
  const auditLogFindMany = jest.fn();
  const auditLogFindUnique = jest.fn();
  const documentoFindMany = jest.fn();
  const getStats = jest.fn();

  let authUser: JwtRequestUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuditoriaController],
      providers: [
        RolesGuard,
        PermissionsGuard,
        {
          provide: PrismaService,
          useValue: {
            $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
            auditLog: {
              count: auditLogCount,
              findMany: auditLogFindMany,
              findUnique: auditLogFindUnique,
            },
            documento: { findMany: documentoFindMany },
          },
        },
        { provide: AuditoriaService, useValue: { getStats } },
        { provide: PermissionsService, useValue: { getCodesForUserId } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx
            .switchToHttp()
            .getRequest<{ user?: JwtRequestUser }>();
          req.user = authUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    getCodesForUserId.mockReset();
    auditLogCount.mockReset();
    auditLogFindMany.mockReset();
    auditLogFindUnique.mockReset();
    documentoFindMany.mockReset();
    getStats.mockReset();
    documentoFindMany.mockResolvedValue([]);
  });

  function setUser(user: JwtRequestUser) {
    authUser = user;
  }

  it('USER → 403 en listado global', async () => {
    setUser({
      id: 'user-1',
      email: 'user@local.test',
      nombres: 'User',
      apellidos: 'QA',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set());

    await request(app.getHttpServer()).get('/auditoria').expect(403);
    expect(auditLogFindMany).not.toHaveBeenCalled();
  });

  it('ADMIN sin AUDIT_READ → 403', async () => {
    setUser({
      id: 'admin-1',
      email: 'admin@local.test',
      nombres: 'Admin',
      apellidos: 'QA',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.USERS_READ]));

    await request(app.getHttpServer()).get('/auditoria').expect(403);
  });

  it('ADMIN con AUDIT_READ → 200, total=items scope, meta redactada', async () => {
    setUser({
      id: 'admin-2',
      email: 'admin2@local.test',
      nombres: 'Admin',
      apellidos: 'Dos',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.AUDIT_READ]));
    auditLogCount.mockResolvedValue(1);
    auditLogFindMany.mockResolvedValue([
      {
        id: 'a1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        actorUserId: 'u1',
        actorEmail: 'u1@local.test',
        action: 'AUTH_LOGIN_FAIL',
        result: 'FAIL',
        resourceType: null,
        resourceId: null,
        ip: '127.0.0.1',
        userAgent: 'jest',
        correlationId: null,
        metaJson: JSON.stringify({
          reason: 'INVALID_PASSWORD',
          password: 'leak',
          accessToken: 'tok',
        }),
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/auditoria')
      .expect(200);

    const body: {
      total: number;
      items: Array<{ metaJson: string | null }>;
    } = res.body as {
      total: number;
      items: Array<{ metaJson: string | null }>;
    };
    expect(body.total).toBe(1);
    expect(body.items).toHaveLength(1);
    const firstMeta = body.items[0]?.metaJson;
    expect(typeof firstMeta).toBe('string');
    const meta = JSON.parse(firstMeta as string) as Record<string, unknown>;
    expect(meta.reason).toBe('INVALID_PASSWORD');
    expect(meta.password).toBe('[REDACTED]');
    expect(meta.accessToken).toBe('[REDACTED]');
  });

  it('GET /auditoria/:id inexistente → 404', async () => {
    setUser({
      id: 'admin-3',
      email: 'admin3@local.test',
      nombres: 'Admin',
      apellidos: 'Tres',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.AUDIT_READ]));
    auditLogFindUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/auditoria/missing-id')
      .expect(404);

    const errBody: { statusCode?: number; message?: unknown } =
      res.body as Record<string, unknown>;
    expect(errBody.statusCode).toBe(404);
    expect(typeof errBody.message).toBe('string');
  });

  it('no expone endpoints de mutación en el controller bajo prueba', async () => {
    setUser({
      id: 'admin-4',
      email: 'admin4@local.test',
      nombres: 'Admin',
      apellidos: 'Cuatro',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.AUDIT_READ]));

    await request(app.getHttpServer()).post('/auditoria').expect(404);
    await request(app.getHttpServer()).patch('/auditoria/a1').expect(404);
    await request(app.getHttpServer()).delete('/auditoria/a1').expect(404);
  });
});
