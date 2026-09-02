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
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';

const DOC_ID = '11111111-1111-4111-8111-111111111111';

describe('DocumentosController — autorización (roles + permisos)', () => {
  let app: INestApplication<App>;
  const getCodesForUserId = jest.fn<Promise<Set<string>>, [string]>();
  const update = jest.fn();
  const resolverRevision = jest.fn();
  const create = jest.fn();
  const uploadArchivo = jest.fn();
  let authUser: JwtRequestUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentosController],
      providers: [
        RolesGuard,
        PermissionsGuard,
        {
          provide: DocumentosService,
          useValue: {
            update,
            resolverRevision,
            create,
            uploadArchivo,
            findAll: jest.fn(),
            findOne: jest.fn(),
            findEventos: jest.fn(),
            findArchivos: jest.fn(),
            prepareDownloadArchivo: jest.fn(),
            enviarRevision: jest.fn(),
            deleteArchivo: jest.fn(),
            getAccess: jest.fn(),
            updateAccess: jest.fn(),
            findArchivoEventos: jest.fn(),
            sugerirSiguienteCodigo: jest.fn(),
            findTablonTramites: jest.fn(),
            findBandejaTramites: jest.fn(),
          },
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
    update.mockReset();
    resolverRevision.mockReset();
    create.mockReset();
    uploadArchivo.mockReset();
  });

  it('USER con DOC_UPDATE → PATCH 403 (RolesGuard ADMIN)', async () => {
    authUser = {
      id: 'u1',
      email: 'usuario@local.test',
      nombres: 'U',
      apellidos: 'Ser',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: 'dep-1',
    };
    getCodesForUserId.mockResolvedValue(new Set([PERM.DOC_UPDATE]));

    await request(app.getHttpServer())
      .patch(`/documentos/${DOC_ID}`)
      .send({ asunto: 'Hack' })
      .expect(403);

    expect(update).not.toHaveBeenCalled();
  });

  it('USER sin DOC_REVISION_RESOLVE → resolver 403', async () => {
    authUser = {
      id: 'u1',
      email: 'usuario@local.test',
      nombres: 'U',
      apellidos: 'Ser',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: 'dep-1',
    };
    getCodesForUserId.mockResolvedValue(
      new Set([PERM.DOC_READ, PERM.DOC_REVISION_SEND]),
    );

    await request(app.getHttpServer())
      .post(`/documentos/${DOC_ID}/resolver-revision`)
      .send({ decision: 'APROBADO' })
      .expect(403);

    expect(resolverRevision).not.toHaveBeenCalled();
  });

  it('REVISOR con DOC_REVISION_RESOLVE → llega al servicio', async () => {
    authUser = {
      id: 'rev-1',
      email: 'revisor@local.test',
      nombres: 'R',
      apellidos: 'Ev',
      roles: [{ codigo: 'REVISOR', nombre: 'Revisor' }],
      dependenciaId: 'dep-1',
    };
    getCodesForUserId.mockResolvedValue(
      new Set([PERM.DOC_REVISION_RESOLVE, PERM.DOC_READ]),
    );
    resolverRevision.mockResolvedValue({ id: DOC_ID, estado: 'APROBADO' });

    await request(app.getHttpServer())
      .post(`/documentos/${DOC_ID}/resolver-revision`)
      .send({ decision: 'APROBADO' })
      .expect(200);

    expect(resolverRevision).toHaveBeenCalled();
  });

  it('create — createdById sale del JWT, no del body', async () => {
    authUser = {
      id: 'creator-jwt',
      email: 'creator@local.test',
      nombres: 'C',
      apellidos: 'Reator',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: 'dep-1',
    };
    getCodesForUserId.mockResolvedValue(new Set([PERM.DOC_CREATE]));
    create.mockResolvedValue({ id: DOC_ID });

    await request(app.getHttpServer())
      .post('/documentos')
      .send({
        asunto: 'Nuevo',
        fechaDocumento: '2026-01-15',
        tipoDocumentalId: '22222222-2222-4222-8222-222222222222',
        createdById: 'otro-usuario-spoof',
      })
      .expect(201);

    expect(create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ id: 'creator-jwt' }),
      expect.any(Object),
    );
  });

  it('CONSULTA sin DOC_FILES_UPLOAD → upload 403', async () => {
    authUser = {
      id: 'c1',
      email: 'consulta@local.test',
      nombres: 'C',
      apellidos: 'Onsulta',
      roles: [{ codigo: 'CONSULTA', nombre: 'Consulta' }],
      dependenciaId: null,
    };
    getCodesForUserId.mockResolvedValue(
      new Set([PERM.DOC_READ, PERM.DOC_FILES_READ, PERM.DOC_FILES_DOWNLOAD]),
    );

    await request(app.getHttpServer())
      .post(`/documentos/${DOC_ID}/archivos`)
      .expect(403);

    expect(uploadArchivo).not.toHaveBeenCalled();
  });
});
