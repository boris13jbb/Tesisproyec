import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import { PermissionsService } from '../auth/permissions.service';
import type { JwtRequestUser } from '../auth/request-user';
import { assertDirectPermissionsAssignableByActor } from '../auth/rbac-policy.util';
import { BackupController } from './backup.controller';
import { MysqlDumpBackupService } from './mysql-dump-backup.service';

describe('POST /backup/admin/run-now (autorización)', () => {
  let app: INestApplication<App>;
  const getCodesForUserId = jest.fn<Promise<Set<string>>, [string]>();
  const runAutomatedBackup = jest.fn();
  let authUser: JwtRequestUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BackupController],
      providers: [
        RolesGuard,
        PermissionsGuard,
        {
          provide: MysqlDumpBackupService,
          useValue: { runAutomatedBackup },
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
    runAutomatedBackup.mockReset();
    runAutomatedBackup.mockResolvedValue({ ok: true });
  });

  function setUser(user: JwtRequestUser) {
    authUser = user;
  }

  it('USER no crea backup (403) y no invoca el servicio', async () => {
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
      .post('/backup/admin/run-now')
      .expect(403);
    expect(runAutomatedBackup).not.toHaveBeenCalled();
  });

  it('ADMIN sin BACKUP_RUN queda bloqueado (403)', async () => {
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
      .post('/backup/admin/run-now')
      .expect(403);
    expect(runAutomatedBackup).not.toHaveBeenCalled();
  });

  it('ADMIN + BACKUP_RUN pasa actor JWT (no path ni comando)', async () => {
    setUser({
      id: 'a1',
      email: 'admin@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.BACKUP_RUN]));
    const res = await request(app.getHttpServer())
      .post('/backup/admin/run-now')
      .expect(200);
    expect(res.body).toEqual({ ok: true });
    expect(JSON.stringify(res.body)).not.toMatch(/C:\\|\/etc\/|password=/i);
    expect(runAutomatedBackup).toHaveBeenCalledWith('manual', {
      userId: 'a1',
      email: 'admin@local.test',
    });
  });

  it('SUPERADMIN + BACKUP_RUN autorizado', async () => {
    setUser({
      id: 's1',
      email: 'super@local.test',
      nombres: 'S',
      apellidos: 'A',
      roles: [{ codigo: 'SUPERADMIN', nombre: 'Superadmin' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.BACKUP_RUN]));
    await request(app.getHttpServer())
      .post('/backup/admin/run-now')
      .expect(200);
    expect(runAutomatedBackup).toHaveBeenCalledWith('manual', {
      userId: 's1',
      email: 'super@local.test',
    });
  });

  it('ADMIN no puede autoasignarse ni otorgar BACKUP_RUN como permiso directo', () => {
    expect(() =>
      assertDirectPermissionsAssignableByActor({
        actorRoleCodes: ['ADMIN'],
        codes: [PERM.BACKUP_RUN],
      }),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertDirectPermissionsAssignableByActor({
        actorRoleCodes: ['ADMIN'],
        codes: [PERM.BACKUP_RUN],
        targetRoleCodes: ['ADMIN'],
      }),
    ).toThrow(ForbiddenException);
  });

  it('SUPERADMIN sí puede otorgar BACKUP_RUN directo (política IAM existente)', () => {
    expect(() =>
      assertDirectPermissionsAssignableByActor({
        actorRoleCodes: ['SUPERADMIN'],
        codes: [PERM.BACKUP_RUN],
        targetRoleCodes: ['ADMIN'],
      }),
    ).not.toThrow();
  });
});
