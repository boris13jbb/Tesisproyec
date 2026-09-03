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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import { PermissionsService } from '../auth/permissions.service';
import type { JwtRequestUser } from '../auth/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { DependenciasController } from './dependencias.controller';
import { DependenciasService } from './dependencias.service';

/**
 * Autorización catálogo Dependencias:
 * listado activo para autenticados; incluirInactivos solo ADMIN;
 * escritura ADMIN + DEPENDENCIAS_WRITE; sin DELETE.
 */
describe('GET/POST/PATCH /dependencias (autorización)', () => {
  let app: INestApplication<App>;
  const getCodesForUserId = jest.fn<Promise<Set<string>>, [string]>();
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const auditLog = jest.fn().mockResolvedValue(undefined);

  let authUser: JwtRequestUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DependenciasController],
      providers: [
        DependenciasService,
        RolesGuard,
        PermissionsGuard,
        {
          provide: PrismaService,
          useValue: {
            dependencia: { findMany, findUnique, create, update },
          },
        },
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
    getCodesForUserId.mockReset();
    findMany.mockReset();
    findUnique.mockReset();
    create.mockReset();
    update.mockReset();
    auditLog.mockReset();
    auditLog.mockResolvedValue(undefined);
  });

  function setUser(user: JwtRequestUser) {
    authUser = user;
  }

  const depActive = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    codigo: 'DEP-A',
    nombre: 'Activa',
    descripcion: null,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const depInactive = {
    ...depActive,
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    codigo: 'DEP-B',
    nombre: 'Inactiva',
    activo: false,
  };

  it('USER lista solo activas (sin incluirInactivos)', async () => {
    setUser({
      id: 'u1',
      email: 'u@local.test',
      nombres: 'U',
      apellidos: 'X',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: depActive.id,
    });
    getCodesForUserId.mockResolvedValue(new Set());
    findMany.mockResolvedValue([depActive]);

    await request(app.getHttpServer()).get('/dependencias').expect(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activo: true } }),
    );
  });

  it('USER con incluirInactivos=true → 403', async () => {
    setUser({
      id: 'u1',
      email: 'u@local.test',
      nombres: 'U',
      apellidos: 'X',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set());

    await request(app.getHttpServer())
      .get('/dependencias?incluirInactivos=true')
      .expect(403);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('USER detalle de inactiva → 404', async () => {
    setUser({
      id: 'u1',
      email: 'u@local.test',
      nombres: 'U',
      apellidos: 'X',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set());
    findUnique.mockResolvedValue(depInactive);

    await request(app.getHttpServer())
      .get(`/dependencias/${depInactive.id}`)
      .expect(404);
  });

  it('USER no crea ni edita', async () => {
    setUser({
      id: 'u1',
      email: 'u@local.test',
      nombres: 'U',
      apellidos: 'X',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set());

    await request(app.getHttpServer())
      .post('/dependencias')
      .send({ codigo: 'XX', nombre: 'Test' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/dependencias/${depActive.id}`)
      .send({ nombre: 'Hack' })
      .expect(403);
  });

  it('ADMIN sin DEPENDENCIAS_WRITE → 403 en POST', async () => {
    setUser({
      id: 'a1',
      email: 'a@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.USERS_READ]));

    await request(app.getHttpServer())
      .post('/dependencias')
      .send({ codigo: 'XX', nombre: 'Test' })
      .expect(403);
  });

  it('ADMIN con DEPENDENCIAS_WRITE crea y audita (actor servidor)', async () => {
    setUser({
      id: 'a2',
      email: 'admin2@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.DEPENDENCIAS_WRITE]));
    create.mockResolvedValue(depActive);

    await request(app.getHttpServer())
      .post('/dependencias')
      .send({
        codigo: 'dep-a',
        nombre: 'Activa',
        activo: false,
        id: 'forged',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/dependencias')
      .send({ codigo: 'DEP-A', nombre: 'Activa' })
      .expect(201);

    expect(create).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalled();
    const auditCalls = auditLog.mock.calls as Array<
      [
        {
          action?: string;
          context?: { actorUserId?: string; actorEmail?: string };
        },
      ]
    >;
    const createdAudit = auditCalls[0]?.[0];
    expect(createdAudit?.action).toBe('DEPENDENCIA_CREATED');
    expect(createdAudit?.context?.actorUserId).toBe('a2');
    expect(createdAudit?.context?.actorEmail).toBe('admin2@local.test');
  });

  it('ADMIN desactiva → DEPENDENCIA_DEACTIVATED auditada; no DELETE', async () => {
    setUser({
      id: 'a3',
      email: 'admin3@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.DEPENDENCIAS_WRITE]));
    findUnique.mockResolvedValue(depActive);
    update.mockResolvedValue({ ...depActive, activo: false });

    await request(app.getHttpServer())
      .patch(`/dependencias/${depActive.id}`)
      .send({ activo: false })
      .expect(200);

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEPENDENCIA_DEACTIVATED' }),
    );

    await request(app.getHttpServer())
      .delete(`/dependencias/${depActive.id}`)
      .expect(404);
  });

  it('ADMIN puede listar inactivas', async () => {
    setUser({
      id: 'a4',
      email: 'admin4@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.DEPENDENCIAS_WRITE]));
    findMany.mockResolvedValue([depActive, depInactive]);

    await request(app.getHttpServer())
      .get('/dependencias?incluirInactivos=true')
      .expect(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });
});
