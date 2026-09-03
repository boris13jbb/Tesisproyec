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
import { TiposDocumentalesController } from './tipos-documentales.controller';
import { TiposDocumentalesService } from './tipos-documentales.service';

describe('GET/POST/PATCH /tipos-documentales (autorización)', () => {
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
      controllers: [TiposDocumentalesController],
      providers: [
        TiposDocumentalesService,
        RolesGuard,
        PermissionsGuard,
        {
          provide: PrismaService,
          useValue: {
            tipoDocumental: {
              findMany,
              findUnique,
              create,
              update,
            },
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

  const tipoActive = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    codigo: 'MEMO',
    nombre: 'Memorando',
    descripcion: null,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tipoInactive = {
    ...tipoActive,
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    codigo: 'OLD',
    nombre: 'Inactivo',
    activo: false,
  };

  it('USER lista activos; incluirInactivos=true → 403', async () => {
    setUser({
      id: 'u1',
      email: 'user@local.test',
      nombres: 'U',
      apellidos: 'S',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    });
    findMany.mockResolvedValue([tipoActive]);
    await request(app.getHttpServer()).get('/tipos-documentales').expect(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activo: true } }),
    );
    await request(app.getHttpServer())
      .get('/tipos-documentales?incluirInactivos=true')
      .expect(403);
  });

  it('USER no crea ni edita tipo documental', async () => {
    setUser({
      id: 'u2',
      email: 'user2@local.test',
      nombres: 'U',
      apellidos: 'S',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set());
    await request(app.getHttpServer())
      .post('/tipos-documentales')
      .send({ codigo: 'X', nombre: 'X' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/tipos-documentales/${tipoActive.id}`)
      .send({ nombre: 'Hack' })
      .expect(403);
  });

  it('ADMIN sin TIPOS_DOCUMENTALES_WRITE → 403 en POST y PATCH', async () => {
    setUser({
      id: 'a1',
      email: 'admin@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set());
    await request(app.getHttpServer())
      .post('/tipos-documentales')
      .send({ codigo: 'TD', nombre: 'Tipo' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/tipos-documentales/${tipoActive.id}`)
      .send({ activo: false })
      .expect(403);
  });

  it('ADMIN con WRITE crea y audita; mass assignment rechazado', async () => {
    setUser({
      id: 'a2',
      email: 'admin2@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(
      new Set([PERM.TIPOS_DOCUMENTALES_WRITE]),
    );
    create.mockResolvedValue(tipoActive);

    await request(app.getHttpServer())
      .post('/tipos-documentales')
      .send({
        codigo: 'td',
        nombre: 'Tipo',
        id: 'forged',
        activo: false,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/tipos-documentales')
      .send({ codigo: 'TD', nombre: 'Tipo' })
      .expect(201);

    const auditCalls = auditLog.mock.calls as Array<
      [{ action?: string; context?: { actorUserId?: string } }]
    >;
    expect(auditCalls[0]?.[0]?.action).toBe('TIPO_DOCUMENTAL_CREATED');
    expect(auditCalls[0]?.[0]?.context?.actorUserId).toBe('a2');
  });

  it('ADMIN desactiva → TIPO_DOCUMENTAL_DEACTIVATED; sin DELETE', async () => {
    setUser({
      id: 'a3',
      email: 'admin3@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(
      new Set([PERM.TIPOS_DOCUMENTALES_WRITE]),
    );
    findUnique.mockResolvedValue(tipoActive);
    update.mockResolvedValue({ ...tipoActive, activo: false });

    await request(app.getHttpServer())
      .patch(`/tipos-documentales/${tipoActive.id}`)
      .send({ activo: false })
      .expect(200);

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TIPO_DOCUMENTAL_DEACTIVATED' }),
    );

    await request(app.getHttpServer())
      .delete(`/tipos-documentales/${tipoActive.id}`)
      .expect(404);
  });

  it('USER detalle inactivo → 404; ADMIN ve inactivo', async () => {
    setUser({
      id: 'u3',
      email: 'user3@local.test',
      nombres: 'U',
      apellidos: 'S',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    });
    findUnique.mockResolvedValue(tipoInactive);
    await request(app.getHttpServer())
      .get(`/tipos-documentales/${tipoInactive.id}`)
      .expect(404);

    setUser({
      id: 'a4',
      email: 'admin4@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    findUnique.mockResolvedValue(tipoInactive);
    await request(app.getHttpServer())
      .get(`/tipos-documentales/${tipoInactive.id}`)
      .expect(200);
  });

  it('assertAssignable rechaza inactivo e inexistente', async () => {
    const service = app.get(TiposDocumentalesService);
    findUnique.mockResolvedValueOnce(null);
    await expect(service.assertAssignable(tipoActive.id)).rejects.toThrow(
      /no encontrado/i,
    );
    findUnique.mockResolvedValueOnce(tipoInactive);
    await expect(service.assertAssignable(tipoInactive.id)).rejects.toThrow(
      /inactivo/i,
    );
    findUnique.mockResolvedValueOnce(tipoActive);
    await expect(
      service.assertAssignable(tipoActive.id),
    ).resolves.toBeUndefined();
  });

  it('UUID inexistente en detalle → 404', async () => {
    setUser({
      id: 'a5',
      email: 'admin5@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/tipos-documentales/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      .expect(404);
  });
});
