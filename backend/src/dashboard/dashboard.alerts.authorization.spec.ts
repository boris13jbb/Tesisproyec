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
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('POST /dashboard/admin/alerts/acknowledge (autorización)', () => {
  let app: INestApplication<App>;
  const getCodesForUserId = jest.fn<Promise<Set<string>>, [string]>();
  const acknowledgeDashboardAlert = jest.fn();
  let authUser: JwtRequestUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        RolesGuard,
        PermissionsGuard,
        {
          provide: DashboardService,
          useValue: { acknowledgeDashboardAlert },
        },
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
    acknowledgeDashboardAlert.mockReset();
    acknowledgeDashboardAlert.mockResolvedValue({
      ok: true,
      codigo: 'AUTH_LOGIN_FAIL',
      acknowledgedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  function setUser(user: JwtRequestUser) {
    authUser = user;
  }

  it('USER no puede ACK de alerta (403)', async () => {
    setUser({
      id: 'u1',
      email: 'user@local.test',
      nombres: 'U',
      apellidos: 'S',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set());
    await request(app.getHttpServer())
      .post('/dashboard/admin/alerts/acknowledge')
      .send({ codigo: 'AUTH_LOGIN_FAIL' })
      .expect(403);
    expect(acknowledgeDashboardAlert).not.toHaveBeenCalled();
  });

  it('ADMIN + DASHBOARD_ADMIN_READ pasa actor JWT (no userId de body)', async () => {
    setUser({
      id: 'a1',
      email: 'admin@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.DASHBOARD_ADMIN_READ]));
    const res = await request(app.getHttpServer())
      .post('/dashboard/admin/alerts/acknowledge')
      .send({ codigo: 'AUTH_LOGIN_FAIL', actorUserId: 'victim' })
      .expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({ ok: true, codigo: 'AUTH_LOGIN_FAIL' }),
    );
    expect(acknowledgeDashboardAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a1' }),
      'AUTH_LOGIN_FAIL',
    );
  });

  it('SUPERADMIN + DASHBOARD_ADMIN_READ autorizado (Roles ADMIN incluye SUPERADMIN)', async () => {
    setUser({
      id: 's1',
      email: 'super@local.test',
      nombres: 'S',
      apellidos: 'A',
      roles: [{ codigo: 'SUPERADMIN', nombre: 'Superadmin' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.DASHBOARD_ADMIN_READ]));
    await request(app.getHttpServer())
      .post('/dashboard/admin/alerts/acknowledge')
      .send({ codigo: 'AUTH_LOGIN_FAIL', actorUserId: 'victim' })
      .expect(200);
    expect(acknowledgeDashboardAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1' }),
      'AUTH_LOGIN_FAIL',
    );
  });
});
