import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../auditoria/audit.service';
import type { JwtRequestUser } from '../auth/request-user';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TiposDocumentalesService } from '../tipos-documentales/tipos-documentales.service';
import { DocumentosService } from './documentos.service';

const TIPO_ACT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TIPO_INA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DOC_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEP_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function docRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DOC_ID,
    codigo: 'DOC-1',
    tipoDocumentalId: TIPO_INA,
    estado: 'REGISTRADO',
    activo: true,
    asunto: 'Hist',
    descripcion: null,
    fechaDocumento: new Date('2026-01-15T12:00:00.000Z'),
    fechaVencimiento: null,
    responsableInstitucional: null,
    contraparteId: null,
    beneficiarioId: null,
    dependenciaId: DEP_ID,
    nivelConfidencialidad: 'INTERNO',
    createdById: 'user-1',
    tipoDocumental: { id: TIPO_INA, codigo: 'OLD', nombre: 'Old' },
    dependencia: null,
    createdBy: {
      id: 'user-1',
      email: 'usuario@local.test',
      nombres: 'U',
      apellidos: 'Ser',
    },
    contraparte: null,
    beneficiario: null,
    archivos: [],
    ...overrides,
  };
}

describe('DocumentosService — tipo documental asignable', () => {
  let service: DocumentosService;
  let assertAssignable: jest.Mock;
  let prisma: {
    user: { findUnique: jest.Mock };
    dependencia: { findUnique: jest.Mock };
    contraparte: { findUnique: jest.Mock };
    beneficiario: { findUnique: jest.Mock };
    documento: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  const viewer: JwtRequestUser = {
    id: 'user-1',
    email: 'usuario@local.test',
    nombres: 'U',
    apellidos: 'Ser',
    roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
    dependenciaId: DEP_ID,
  };

  beforeEach(async () => {
    assertAssignable = jest.fn().mockResolvedValue(undefined);
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ dependenciaId: DEP_ID }),
      },
      dependencia: {
        findUnique: jest.fn().mockResolvedValue({ id: DEP_ID, activo: true }),
      },
      contraparte: { findUnique: jest.fn() },
      beneficiario: { findUnique: jest.fn() },
      documento: { findUnique: jest.fn() },
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
          useValue: { assertAssignable },
        },
      ],
    }).compile();

    service = moduleRef.get(DocumentosService);
  });

  it('create — tipo inactivo → 400 vía assertAssignable', async () => {
    assertAssignable.mockRejectedValue(
      new BadRequestException('Tipo documental inactivo'),
    );
    await expect(
      service.create(
        {
          asunto: 'QA',
          fechaDocumento: '2026-01-15T12:00:00.000Z',
          tipoDocumentalId: TIPO_INA,
        },
        viewer,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(assertAssignable).toHaveBeenCalledWith(TIPO_INA);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('update — mismo tipo histórico no revalida activo', async () => {
    prisma.documento.findUnique.mockResolvedValue(docRow());
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          documento: {
            update: jest
              .fn()
              .mockResolvedValue(docRow({ asunto: 'Hist edit' })),
          },
          documentoEvento: { create: jest.fn() },
        };
        return fn(tx);
      },
    );

    await service.update(
      DOC_ID,
      { asunto: 'Hist edit', tipoDocumentalId: TIPO_INA },
      viewer.id,
    );
    expect(assertAssignable).not.toHaveBeenCalled();
  });

  it('update — cambio a tipo inactivo → bloqueado', async () => {
    prisma.documento.findUnique.mockResolvedValue(
      docRow({ tipoDocumentalId: TIPO_ACT }),
    );
    assertAssignable.mockRejectedValue(
      new BadRequestException('Tipo documental inactivo'),
    );

    await expect(
      service.update(DOC_ID, { tipoDocumentalId: TIPO_INA }, viewer.id),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(assertAssignable).toHaveBeenCalledWith(TIPO_INA);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
