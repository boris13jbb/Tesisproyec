import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../auditoria/audit.service';
import type { JwtRequestUser } from '../auth/request-user';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TiposDocumentalesService } from '../tipos-documentales/tipos-documentales.service';
import { DocumentosService } from './documentos.service';

const DEP_OWN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEP_ALIEN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TIPO_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

type CreateData = {
  codigo?: string;
  asunto: string;
  estado: string;
  dependenciaId: string | null;
  nivelConfidencialidad: string;
  createdById: string;
  tipoDocumentalId: string;
};

describe('DocumentosService.create — dependenciaId', () => {
  let service: DocumentosService;
  let prisma: {
    user: { findUnique: jest.Mock };
    tipoDocumental: { findUnique: jest.Mock };
    dependencia: { findUnique: jest.Mock };
    contraparte: { findUnique: jest.Mock };
    beneficiario: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let lastCreatedDependenciaId: string | null | undefined;
  let lastCreatedById: string | undefined;

  const userViewer: JwtRequestUser = {
    id: 'user-1',
    email: 'usuario@local.test',
    nombres: 'U',
    apellidos: 'Ser',
    roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
    dependenciaId: DEP_OWN,
  };

  const adminViewer: JwtRequestUser = {
    id: 'admin-1',
    email: 'admin@local.test',
    nombres: 'A',
    apellidos: 'Dmin',
    roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
    dependenciaId: DEP_OWN,
  };

  const superViewer: JwtRequestUser = {
    ...adminViewer,
    id: 'sa-1',
    email: 'superadmin@local.test',
    roles: [{ codigo: 'SUPERADMIN', nombre: 'Superadministrador' }],
  };

  const baseDto = {
    asunto: 'Documento QA dependencia',
    fechaDocumento: '2026-01-15T12:00:00.000Z',
    tipoDocumentalId: TIPO_ID,
  };

  beforeEach(async () => {
    lastCreatedDependenciaId = undefined;
    lastCreatedById = undefined;
    prisma = {
      user: { findUnique: jest.fn() },
      tipoDocumental: {
        findUnique: jest.fn().mockResolvedValue({ id: TIPO_ID }),
      },
      dependencia: { findUnique: jest.fn() },
      contraparte: { findUnique: jest.fn() },
      beneficiario: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentosService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: NotificationService,
          useValue: {
            notifyRevisionSubmitted: jest.fn(),
            notifyRevisionResolved: jest.fn(),
          },
        },
        {
          provide: TiposDocumentalesService,
          useValue: {
            assertAssignable: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(DocumentosService);
  });

  function mockSuccessfulCreate(expectedDep: string | null) {
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          documento: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest
              .fn()
              .mockImplementation((args: { data: CreateData }) => {
                const data = args.data;
                lastCreatedDependenciaId = data.dependenciaId;
                lastCreatedById = data.createdById;
                expect(data.dependenciaId).toBe(expectedDep);
                return {
                  id: 'doc-1',
                  codigo: data.codigo ?? 'DOC-0001',
                  asunto: data.asunto,
                  descripcion: null,
                  fechaDocumento: new Date(baseDto.fechaDocumento),
                  fechaVencimiento: null,
                  responsableInstitucional: null,
                  estado: data.estado,
                  activo: true,
                  dependenciaId: data.dependenciaId,
                  nivelConfidencialidad: data.nivelConfidencialidad,
                  accessPolicy: 'INHERIT',
                  tipoDocumentalId: TIPO_ID,
                  contraparteId: null,
                  beneficiarioId: null,
                  createdById: data.createdById,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  tipoDocumental: {
                    id: TIPO_ID,
                    codigo: 'MEMO',
                    nombre: 'Memorando',
                  },
                  dependencia: null,
                  contraparte: null,
                  beneficiario: null,
                  createdBy: {
                    id: data.createdById,
                    email: 'x@local.test',
                    nombres: 'X',
                    apellidos: 'Y',
                  },
                };
              }),
          },
          documentoEvento: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      },
    );
  }

  it('ADMIN crea en dependencia válida distinta a la propia → permitido', async () => {
    prisma.user.findUnique.mockResolvedValue({ dependenciaId: DEP_OWN });
    prisma.dependencia.findUnique.mockResolvedValue({
      id: DEP_ALIEN,
      activo: true,
    });
    mockSuccessfulCreate(DEP_ALIEN);

    const created = await service.create(
      { ...baseDto, dependenciaId: DEP_ALIEN },
      adminViewer,
    );
    expect(created.dependenciaId).toBe(DEP_ALIEN);
  });

  it('SUPERADMIN crea en dependencia válida → permitido', async () => {
    prisma.user.findUnique.mockResolvedValue({ dependenciaId: null });
    prisma.dependencia.findUnique.mockResolvedValue({
      id: DEP_ALIEN,
      activo: true,
    });
    mockSuccessfulCreate(DEP_ALIEN);

    const created = await service.create(
      { ...baseDto, dependenciaId: DEP_ALIEN },
      superViewer,
    );
    expect(created.dependenciaId).toBe(DEP_ALIEN);
  });

  it('USER crea con su propia dependencia → permitido', async () => {
    prisma.user.findUnique.mockResolvedValue({ dependenciaId: DEP_OWN });
    prisma.dependencia.findUnique.mockResolvedValue({
      id: DEP_OWN,
      activo: true,
    });
    mockSuccessfulCreate(DEP_OWN);

    const created = await service.create(
      { ...baseDto, dependenciaId: DEP_OWN },
      userViewer,
    );
    expect(created.dependenciaId).toBe(DEP_OWN);
  });

  it('USER omite dependenciaId → se fuerza su dependencia', async () => {
    prisma.user.findUnique.mockResolvedValue({ dependenciaId: DEP_OWN });
    prisma.dependencia.findUnique.mockResolvedValue({
      id: DEP_OWN,
      activo: true,
    });
    mockSuccessfulCreate(DEP_OWN);

    const created = await service.create({ ...baseDto }, userViewer);
    expect(created.dependenciaId).toBe(DEP_OWN);
  });

  it('USER intenta dependencia ajena → Forbidden', async () => {
    prisma.user.findUnique.mockResolvedValue({ dependenciaId: DEP_OWN });

    await expect(
      service.create({ ...baseDto, dependenciaId: DEP_ALIEN }, userViewer),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('dependenciaId inexistente (ADMIN) → BadRequest', async () => {
    prisma.user.findUnique.mockResolvedValue({ dependenciaId: DEP_OWN });
    prisma.dependencia.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ ...baseDto, dependenciaId: DEP_ALIEN }, adminViewer),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('USER sin dependencia + dependenciaId en body → Forbidden', async () => {
    const sinDep: JwtRequestUser = { ...userViewer, dependenciaId: null };
    prisma.user.findUnique.mockResolvedValue({ dependenciaId: null });

    await expect(
      service.create({ ...baseDto, dependenciaId: DEP_ALIEN }, sinDep),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('USER sin dependencia y sin body → crea con null', async () => {
    const sinDep: JwtRequestUser = { ...userViewer, dependenciaId: null };
    prisma.user.findUnique.mockResolvedValue({ dependenciaId: null });
    mockSuccessfulCreate(null);

    const created = await service.create({ ...baseDto }, sinDep);
    expect(created.dependenciaId).toBeNull();
  });

  it('createdById del documento es el JWT (viewer.id)', async () => {
    prisma.user.findUnique.mockResolvedValue({ dependenciaId: DEP_OWN });
    prisma.dependencia.findUnique.mockResolvedValue({
      id: DEP_OWN,
      activo: true,
    });
    mockSuccessfulCreate(DEP_OWN);

    await service.create({ ...baseDto }, userViewer);
    expect(lastCreatedById).toBe(userViewer.id);
    expect(lastCreatedDependenciaId).toBe(DEP_OWN);
  });

  it('ADMIN no puede asignar dependencia inactiva al crear documento', async () => {
    prisma.user.findUnique.mockResolvedValue({ dependenciaId: DEP_OWN });
    prisma.dependencia.findUnique.mockResolvedValue({
      id: DEP_ALIEN,
      activo: false,
    });

    await expect(
      service.create({ ...baseDto, dependenciaId: DEP_ALIEN }, adminViewer),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
