import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERM } from '../auth/permission-codes';
import { PermissionsService } from '../auth/permissions.service';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';

/**
 * Autorización real de `POST /documentos/:id/enviar-revision`.
 * JWT autenticado + usuario sin `DOC_REVISION_SEND` → 403 del PermissionsGuard.
 */
describe('POST /documentos/:id/enviar-revision (autorización)', () => {
  let app: INestApplication<App>;
  const getCodesForUserId = jest.fn<Promise<Set<string>>, [string]>();
  const enviarRevision = jest.fn();
  const DOC_ID = '11111111-1111-4111-8111-111111111111';

  const authUser = {
    id: 'qa-user-sin-revision-send',
    email: 'consulta.qa@local.test',
    nombres: 'Consulta',
    apellidos: 'QA',
    roles: [{ codigo: 'CONSULTA', nombre: 'Consulta' }],
    dependenciaId: null,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentosController],
      providers: [
        PermissionsGuard,
        { provide: DocumentosService, useValue: { enviarRevision } },
        { provide: PermissionsService, useValue: { getCodesForUserId } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx
            .switchToHttp()
            .getRequest<{ user?: typeof authUser }>();
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
    enviarRevision.mockReset();
  });

  it('usuario autenticado sin DOC_REVISION_SEND recibe 403 y no llama al servicio', async () => {
    getCodesForUserId.mockResolvedValue(
      new Set(['DOC_READ', 'DASHBOARD_SUMMARY', 'DOC_FILES_READ']),
    );

    const res = await request(app.getHttpServer())
      .post(`/documentos/${DOC_ID}/enviar-revision`)
      .expect(403);

    expect(res.body).toMatchObject({ statusCode: 403 });
    expect(getCodesForUserId).toHaveBeenCalledWith(authUser.id);
    expect(enviarRevision).not.toHaveBeenCalled();
  });

  it('usuario autenticado con DOC_REVISION_SEND llega al servicio (200)', async () => {
    getCodesForUserId.mockResolvedValue(new Set([PERM.DOC_REVISION_SEND]));
    enviarRevision.mockResolvedValue({ id: DOC_ID, estado: 'EN_REVISION' });

    await request(app.getHttpServer())
      .post(`/documentos/${DOC_ID}/enviar-revision`)
      .expect(200);

    expect(enviarRevision).toHaveBeenCalled();
  });
});
