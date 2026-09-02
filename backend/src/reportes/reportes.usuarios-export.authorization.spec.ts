import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuditService } from '../auditoria/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import { PermissionsService } from '../auth/permissions.service';
import type { JwtRequestUser } from '../auth/request-user';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

/**
 * Autorización real de GET /reportes/usuarios.xlsx:
 * rol ADMIN/SUPERADMIN + REPORTS_EXPORT AND USERS_READ.
 */
describe('GET /reportes/usuarios.xlsx (autorización)', () => {
  let app: INestApplication<App>;
  const getCodesForUserId = jest.fn<Promise<Set<string>>, [string]>();
  const findUsuariosActivos = jest.fn();
  const auditLog = jest.fn().mockResolvedValue(undefined);

  let authUser: JwtRequestUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        RolesGuard,
        PermissionsGuard,
        { provide: ReportesService, useValue: { findUsuariosActivos } },
        { provide: AuditService, useValue: { log: auditLog } },
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
    findUsuariosActivos.mockReset();
    auditLog.mockClear();
    findUsuariosActivos.mockResolvedValue([]);
  });

  function setUser(user: JwtRequestUser) {
    authUser = user;
  }

  it('ADMIN con REPORTS_EXPORT + USERS_READ → 200 y consulta servicio', async () => {
    setUser({
      id: 'admin-1',
      email: 'admin@local.test',
      nombres: 'Admin',
      apellidos: 'QA',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(
      new Set([PERM.REPORTS_EXPORT, PERM.USERS_READ]),
    );

    await request(app.getHttpServer())
      .get('/reportes/usuarios.xlsx')
      .expect(200);

    expect(findUsuariosActivos).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalled();
  });

  it('ADMIN solo REPORTS_EXPORT → 403', async () => {
    setUser({
      id: 'admin-2',
      email: 'admin2@local.test',
      nombres: 'Admin',
      apellidos: 'Dos',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.REPORTS_EXPORT]));

    await request(app.getHttpServer())
      .get('/reportes/usuarios.xlsx')
      .expect(403);

    expect(findUsuariosActivos).not.toHaveBeenCalled();
  });

  it('ADMIN solo USERS_READ → 403', async () => {
    setUser({
      id: 'admin-3',
      email: 'admin3@local.test',
      nombres: 'Admin',
      apellidos: 'Tres',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.USERS_READ]));

    await request(app.getHttpServer())
      .get('/reportes/usuarios.xlsx')
      .expect(403);

    expect(findUsuariosActivos).not.toHaveBeenCalled();
  });

  it('USER con ambos permisos hipotéticos → 403 por rol', async () => {
    setUser({
      id: 'user-1',
      email: 'usuario@local.test',
      nombres: 'Usuario',
      apellidos: 'QA',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: 'dep-1',
    });
    getCodesForUserId.mockResolvedValue(
      new Set([PERM.REPORTS_EXPORT, PERM.USERS_READ]),
    );

    await request(app.getHttpServer())
      .get('/reportes/usuarios.xlsx')
      .expect(403);

    expect(findUsuariosActivos).not.toHaveBeenCalled();
  });

  it('SUPERADMIN con REPORTS_EXPORT + USERS_READ → 200', async () => {
    setUser({
      id: 'sa-1',
      email: 'superadmin@local.test',
      nombres: 'Super',
      apellidos: 'Admin',
      roles: [{ codigo: 'SUPERADMIN', nombre: 'Superadministrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(
      new Set([PERM.REPORTS_EXPORT, PERM.USERS_READ]),
    );

    await request(app.getHttpServer())
      .get('/reportes/usuarios.xlsx')
      .expect(200);

    expect(findUsuariosActivos).toHaveBeenCalled();
  });
});
