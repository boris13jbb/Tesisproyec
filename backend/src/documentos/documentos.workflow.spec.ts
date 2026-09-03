import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../auditoria/audit.service';
import type { JwtRequestUser } from '../auth/request-user';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TiposDocumentalesService } from '../tipos-documentales/tipos-documentales.service';
import { DocumentosService } from './documentos.service';

const DOC_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function docBase(estado: string) {
  return {
    id: DOC_ID,
    codigo: 'DOC-W1',
    asunto: 'Workflow QA',
    descripcion: null,
    estado,
    activo: true,
    tipoDocumentalId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    dependenciaId: null,
    contraparteId: null,
    beneficiarioId: null,
    nivelConfidencialidad: 'INTERNO',
    fechaDocumento: new Date(),
    fechaVencimiento: null,
    responsableInstitucional: null,
    fechaIngresoRevision: null,
    fechaLimiteSla: null,
    createdById: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    tipoDocumental: { id: 't1', codigo: 'MEMO', nombre: 'Memorando' },
    dependencia: null,
    contraparte: null,
    beneficiario: null,
    createdBy: {
      id: USER_ID,
      email: 'creador@local.test',
      nombres: 'C',
      apellidos: 'R',
    },
    archivos: [],
  };
}

describe('DocumentosService — workflow estados', () => {
  let service: DocumentosService;
  let prisma: {
    documento: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let auditLog: jest.Mock;

  const admin: JwtRequestUser = {
    id: 'admin-1',
    email: 'admin@local.test',
    nombres: 'A',
    apellidos: 'D',
    roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
    dependenciaId: null,
  };

  const creator: JwtRequestUser = {
    id: USER_ID,
    email: 'creador@local.test',
    nombres: 'C',
    apellidos: 'R',
    roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
    dependenciaId: null,
  };

  beforeEach(async () => {
    auditLog = jest.fn().mockResolvedValue(undefined);
    prisma = {
      documento: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentosService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: auditLog } },
        {
          provide: NotificationService,
          useValue: {
            notifyRevisionSubmitted: jest.fn(),
            notifyRevisionResolved: jest.fn(),
          },
        },
        {
          provide: TiposDocumentalesService,
          useValue: { assertAssignable: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(DocumentosService);
  });

  function mockWorkflowTx(success: boolean, afterEstado: string) {
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          documento: {
            updateMany: jest.fn().mockResolvedValue({ count: success ? 1 : 0 }),
            findUniqueOrThrow: jest
              .fn()
              .mockResolvedValue(docBase(afterEstado)),
          },
          documentoEvento: { create: jest.fn() },
        };
        return fn(tx);
      },
    );
  }

  it('PATCH no puede poner EN_REVISION (bypass)', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('REGISTRADO'));
    await expect(
      service.update(DOC_ID, { estado: 'EN_REVISION' }, admin.id),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('PATCH no puede poner APROBADO', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('EN_REVISION'));
    await expect(
      service.update(DOC_ID, { estado: 'APROBADO' }, admin.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enviarRevision desde RECHAZADO (reenvío) y audita', async () => {
    prisma.documento.findFirst.mockResolvedValue(docBase('RECHAZADO'));
    mockWorkflowTx(true, 'EN_REVISION');
    prisma.documento.update.mockResolvedValue(docBase('EN_REVISION'));

    await service.enviarRevision(DOC_ID, creator);

    const actions = auditLog.mock.calls.map(
      (c: [{ action?: string }]) => c[0]?.action,
    );
    expect(actions).toContain('DOC_STATE_CHANGED');
    expect(actions).toContain('DOC_SUBMITTED_FOR_REVIEW');
  });

  it('enviarRevision desde BORRADOR → 400', async () => {
    prisma.documento.findFirst.mockResolvedValue(docBase('BORRADOR'));
    await expect(
      service.enviarRevision(DOC_ID, creator),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolverRevision segunda vez → Conflict (estado ya cambió)', async () => {
    prisma.documento.findFirst.mockResolvedValue(docBase('EN_REVISION'));
    mockWorkflowTx(false, 'APROBADO');

    await expect(
      service.resolverRevision(
        DOC_ID,
        { decision: 'APROBADO' },
        {
          ...admin,
          roles: [{ codigo: 'REVISOR', nombre: 'Revisor' }],
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('USER no creador no envía a revisión', async () => {
    prisma.documento.findFirst.mockResolvedValue(docBase('REGISTRADO'));
    const alien: JwtRequestUser = {
      ...creator,
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      email: 'otro@local.test',
    };
    await expect(service.enviarRevision(DOC_ID, alien)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
