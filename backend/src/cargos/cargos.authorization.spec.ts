import {
  BadRequestException,
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
import { CargosController } from './cargos.controller';
import { CargosService } from './cargos.service';

describe('GET/POST/PATCH /cargos (autorización)', () => {
  let app: INestApplication<App>;
  const getCodesForUserId = jest.fn<Promise<Set<string>>, [string]>();
  const findMany = jest.fn();
  const cargoFindUnique = jest.fn();
  const depFindUnique = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const userCount = jest.fn();
  const auditLog = jest.fn().mockResolvedValue(undefined);
  let authUser: JwtRequestUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CargosController],
      providers: [
        CargosService,
        RolesGuard,
        PermissionsGuard,
        {
          provide: PrismaService,
          useValue: {
            cargo: {
              findMany,
              findUnique: cargoFindUnique,
              create,
              update,
            },
            dependencia: { findUnique: depFindUnique },
            user: { count: userCount },
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
    cargoFindUnique.mockReset();
    depFindUnique.mockReset();
    create.mockReset();
    update.mockReset();
    userCount.mockReset();
    auditLog.mockReset();
    auditLog.mockResolvedValue(undefined);
  });

  function setUser(user: JwtRequestUser) {
    authUser = user;
  }

  const cargoActive = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    codigo: 'CARGO-A',
    nombre: 'Activo',
    descripcion: null,
    dependenciaId: null,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    dependencia: null,
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
    findMany.mockResolvedValue([cargoActive]);
    await request(app.getHttpServer()).get('/cargos').expect(200);
    await request(app.getHttpServer())
      .get('/cargos?incluirInactivos=true')
      .expect(403);
  });

  it('USER no crea ni edita cargo', async () => {
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
      .post('/cargos')
      .send({ codigo: 'X', nombre: 'X' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/cargos/${cargoActive.id}`)
      .send({ nombre: 'Hack' })
      .expect(403);
  });

  it('ADMIN sin CARGOS_WRITE → 403 en POST y PATCH', async () => {
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
      .post('/cargos')
      .send({ codigo: 'CA', nombre: 'Cargo' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/cargos/${cargoActive.id}`)
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
    getCodesForUserId.mockResolvedValue(new Set([PERM.CARGOS_WRITE]));
    create.mockResolvedValue(cargoActive);

    await request(app.getHttpServer())
      .post('/cargos')
      .send({
        codigo: 'ca',
        nombre: 'Cargo',
        id: 'forged',
        activo: false,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/cargos')
      .send({ codigo: 'CA', nombre: 'Cargo' })
      .expect(201);

    const auditCalls = auditLog.mock.calls as Array<
      [{ action?: string; context?: { actorUserId?: string } }]
    >;
    expect(auditCalls[0]?.[0]?.action).toBe('CARGO_CREATED');
    expect(auditCalls[0]?.[0]?.context?.actorUserId).toBe('a2');
  });

  it('ADMIN desactiva → CARGO_DEACTIVATED; sin DELETE', async () => {
    setUser({
      id: 'a3',
      email: 'admin3@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.CARGOS_WRITE]));
    cargoFindUnique.mockResolvedValue(cargoActive);
    update.mockResolvedValue({ ...cargoActive, activo: false });
    userCount.mockResolvedValue(0);

    await request(app.getHttpServer())
      .patch(`/cargos/${cargoActive.id}`)
      .send({ activo: false })
      .expect(200);

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CARGO_DEACTIVATED' }),
    );

    await request(app.getHttpServer())
      .delete(`/cargos/${cargoActive.id}`)
      .expect(404);
  });

  it('ADMIN no cambia dependenciaId si el cargo tiene usuarios asignados', async () => {
    const depX = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const depY = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const cargoWithDep = {
      ...cargoActive,
      dependenciaId: depX,
      dependencia: {
        id: depX,
        codigo: 'DEP-X',
        nombre: 'Dependencia X',
        activo: true,
      },
    };
    setUser({
      id: 'a4',
      email: 'admin4@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.CARGOS_WRITE]));
    cargoFindUnique.mockResolvedValue(cargoWithDep);
    depFindUnique.mockResolvedValue({ id: depY, activo: true });
    userCount.mockResolvedValue(2);

    const res = await request(app.getHttpServer())
      .patch(`/cargos/${cargoActive.id}`)
      .send({ dependenciaId: depY })
      .expect(400);

    const body = res.body as { message?: string | string[] };
    const msg = Array.isArray(body.message)
      ? body.message.join(' ')
      : (body.message ?? '');
    expect(msg).toMatch(/usuarios asignados/i);
    expect(update).not.toHaveBeenCalled();
    expect(userCount).toHaveBeenCalledWith({
      where: { cargoId: cargoActive.id },
    });
  });

  it('ADMIN puede cambiar dependenciaId si no hay usuarios y destino activa', async () => {
    const depX = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const depY = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const cargoWithDep = {
      ...cargoActive,
      dependenciaId: depX,
      dependencia: {
        id: depX,
        codigo: 'DEP-X',
        nombre: 'Dependencia X',
        activo: true,
      },
    };
    const after = {
      ...cargoWithDep,
      dependenciaId: depY,
      dependencia: {
        id: depY,
        codigo: 'DEP-Y',
        nombre: 'Dependencia Y',
        activo: true,
      },
    };
    setUser({
      id: 'a5',
      email: 'admin5@local.test',
      nombres: 'A',
      apellidos: 'D',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.CARGOS_WRITE]));
    cargoFindUnique.mockResolvedValue(cargoWithDep);
    depFindUnique.mockResolvedValue({ id: depY, activo: true });
    userCount.mockResolvedValue(0);
    update.mockResolvedValue(after);

    await request(app.getHttpServer())
      .patch(`/cargos/${cargoActive.id}`)
      .send({ dependenciaId: depY })
      .expect(200);

    expect(update).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CARGO_UPDATED' }),
    );
  });
});

describe('CargosService.assertAssignable', () => {
  const findUnique = jest.fn();
  const service = new CargosService(
    {
      cargo: { findUnique },
    } as unknown as PrismaService,
    { log: jest.fn() } as unknown as AuditService,
  );

  beforeEach(() => findUnique.mockReset());

  it('rechaza cargo inactivo', async () => {
    findUnique.mockResolvedValue({
      id: 'c1',
      activo: false,
      dependenciaId: null,
      dependencia: null,
    });
    await expect(service.assertAssignable('c1', null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza cargo con dependencia inactiva', async () => {
    findUnique.mockResolvedValue({
      id: 'c1',
      activo: true,
      dependenciaId: 'd1',
      dependencia: { activo: false },
    });
    await expect(service.assertAssignable('c1', 'd1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza cargo de otra dependencia del usuario', async () => {
    findUnique.mockResolvedValue({
      id: 'c1',
      activo: true,
      dependenciaId: 'd1',
      dependencia: { activo: true },
    });
    await expect(service.assertAssignable('c1', 'd2')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('acepta cargo activo coherente', async () => {
    findUnique.mockResolvedValue({
      id: 'c1',
      activo: true,
      dependenciaId: 'd1',
      dependencia: { activo: true },
    });
    await expect(service.assertAssignable('c1', 'd1')).resolves.toBeUndefined();
  });
});
