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

describe('Dashboard backup endpoints (autorización)', () => {
  let app: INestApplication<App>;
  const getCodesForUserId = jest.fn<Promise<Set<string>>, [string]>();
  const recordBackupVerification = jest.fn();
  const getBackupOverview = jest.fn();
  let authUser: JwtRequestUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        RolesGuard,
        PermissionsGuard,
        {
          provide: DashboardService,
          useValue: { recordBackupVerification, getBackupOverview },
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
    recordBackupVerification.mockReset();
    getBackupOverview.mockReset();
    recordBackupVerification.mockResolvedValue({
      ok: true,
      recordedAt: '2026-01-01T00:00:00.000Z',
    });
    getBackupOverview.mockResolvedValue({
      historial: [],
      verificaciones90d: { ok: 0, fail: 0 },
    });
  });

  function setUser(user: JwtRequestUser) {
    authUser = user;
  }

  it('USER no lista overview de backups (403)', async () => {
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
      .get('/dashboard/admin/backup-overview')
      .expect(403);
    expect(getBackupOverview).not.toHaveBeenCalled();
  });

  it('USER no registra verificación (403)', async () => {
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
      .post('/dashboard/admin/backup-verification')
      .send({ result: 'OK' })
      .expect(403);
    expect(recordBackupVerification).not.toHaveBeenCalled();
  });

  it('ADMIN + DASHBOARD_ADMIN_READ lista overview', async () => {
    setUser({
      id: 'a1',
      email: 'admin@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.DASHBOARD_ADMIN_READ]));
    await request(app.getHttpServer())
      .get('/dashboard/admin/backup-overview')
      .expect(200);
    expect(getBackupOverview).toHaveBeenCalled();
  });

  it('ADMIN + BACKUP_VERIFICATION_RECORD registra verificación', async () => {
    setUser({
      id: 'a1',
      email: 'admin@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(
      new Set([PERM.BACKUP_VERIFICATION_RECORD]),
    );
    await request(app.getHttpServer())
      .post('/dashboard/admin/backup-verification')
      .send({ result: 'OK' })
      .expect(201);
    expect(recordBackupVerification).toHaveBeenCalled();
  });
});
