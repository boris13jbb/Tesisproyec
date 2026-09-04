import {
  BadRequestException,
  ConflictException,
  NotFoundException,
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
    codigo: 'DOC-U1',
    asunto: 'Unlock QA',
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
    fechaIngresoRevision: estado === 'EN_REVISION' ? new Date() : null,
    fechaLimiteSla: estado === 'EN_REVISION' ? new Date() : null,
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

describe('DocumentosService — desbloqueo e inmutabilidad', () => {
  let service: DocumentosService;
  let prisma: {
    documento: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    documentoArchivo: {
      findFirst: jest.Mock;
      aggregate: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let auditLog: jest.Mock;

  const superAdmin: JwtRequestUser = {
    id: 'sa-1',
    email: 'sa@local.test',
    nombres: 'S',
    apellidos: 'A',
    roles: [{ codigo: 'SUPERADMIN', nombre: 'Superadministrador' }],
    dependenciaId: null,
  };

  const admin: JwtRequestUser = {
    id: 'admin-1',
    email: 'admin@local.test',
    nombres: 'A',
    apellidos: 'D',
    roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
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
      documentoArchivo: {
        findFirst: jest.fn(),
        aggregate: jest.fn(),
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

  function mockUnlockTx(success: boolean) {
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          documento: {
            updateMany: jest.fn().mockResolvedValue({ count: success ? 1 : 0 }),
            findUniqueOrThrow: jest
              .fn()
              .mockResolvedValue(docBase('REGISTRADO')),
          },
          documentoEvento: { create: jest.fn() },
        };
        return fn(tx);
      },
    );
  }

  it('SUPERADMIN desbloquea APROBADO → REGISTRADO y audita DOC_UNLOCKED', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('APROBADO'));
    mockUnlockTx(true);

    const out = await service.desbloquear(
      DOC_ID,
      { motivo: 'Corrección de tipografía institucional' },
      superAdmin,
    );
    expect(out.estado).toBe('REGISTRADO');
    const actions = auditLog.mock.calls.map(
      (c: [{ action?: string }]) => c[0]?.action,
    );
    expect(actions).toContain('DOC_STATE_CHANGED');
    expect(actions).toContain('DOC_UNLOCKED');
    expect(actions).not.toContain('DOC_REVIEW_RESOLVED');
    const unlockCall = auditLog.mock.calls.find(
      (c: [{ action?: string }]) => c[0]?.action === 'DOC_UNLOCKED',
    ) as
      | [{ meta?: { estadoAnterior?: string; estadoNuevo?: string } }]
      | undefined;
    expect(unlockCall?.[0]?.meta?.estadoAnterior).toBe('APROBADO');
    expect(unlockCall?.[0]?.meta?.estadoNuevo).toBe('REGISTRADO');
  });

  it('SUPERADMIN desbloquea EN_REVISION → REGISTRADO', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('EN_REVISION'));
    mockUnlockTx(true);
    await service.desbloquear(
      DOC_ID,
      { motivo: 'Reabrir cola revisión' },
      superAdmin,
    );
  });

  it('SUPERADMIN desbloquea ARCHIVADO → REGISTRADO', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('ARCHIVADO'));
    mockUnlockTx(true);
    await service.desbloquear(
      DOC_ID,
      { motivo: 'Reapertura excepcional' },
      superAdmin,
    );
  });

  it('REGISTRADO desbloquear → 409', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('REGISTRADO'));
    await expect(
      service.desbloquear(DOC_ID, { motivo: 'No aplica' }, superAdmin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('BORRADOR desbloquear → 409', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('BORRADOR'));
    await expect(
      service.desbloquear(DOC_ID, { motivo: 'No aplica' }, superAdmin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('RECHAZADO desbloquear → 409', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('RECHAZADO'));
    await expect(
      service.desbloquear(DOC_ID, { motivo: 'No aplica' }, superAdmin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('segundo desbloqueo concurrente → 409', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('APROBADO'));
    mockUnlockTx(false);
    await expect(
      service.desbloquear(DOC_ID, { motivo: 'Segundo intento' }, superAdmin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ADMIN sin visibilidad (findFirst null) → 404 al desbloquear', async () => {
    prisma.documento.findFirst.mockResolvedValue(null);
    await expect(
      service.desbloquear(DOC_ID, { motivo: 'Fuera de scope' }, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('PATCH metadata en APROBADO → bloqueado', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('APROBADO'));
    await expect(
      service.update(DOC_ID, { asunto: 'HACK' }, admin.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PATCH metadata en EN_REVISION → bloqueado', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('EN_REVISION'));
    await expect(
      service.update(DOC_ID, { descripcion: 'x' }, admin.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PATCH APROBADO → REGISTRADO → bloqueado', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('APROBADO'));
    await expect(
      service.update(DOC_ID, { estado: 'REGISTRADO' }, admin.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PATCH APROBADO → ARCHIVADO state-only → PASS y DOC_STATE_CHANGED', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('APROBADO'));
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          documento: {
            update: jest.fn().mockResolvedValue(docBase('ARCHIVADO')),
          },
          documentoEvento: { create: jest.fn() },
        };
        return fn(tx);
      },
    );

    const out = await service.update(DOC_ID, { estado: 'ARCHIVADO' }, admin.id);
    expect(out.estado).toBe('ARCHIVADO');
    const actions = auditLog.mock.calls.map(
      (c: [{ action?: string }]) => c[0]?.action,
    );
    expect(actions).toContain('DOC_STATE_CHANGED');
    expect(actions).not.toContain('DOC_UNLOCKED');
  });

  it('PATCH APROBADO → ARCHIVADO + descripción → 400', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('APROBADO'));
    await expect(
      service.update(
        DOC_ID,
        { estado: 'ARCHIVADO', descripcion: 'x' },
        admin.id,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('PATCH APROBADO → ARCHIVADO + tipoDocumentalId → 400', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('APROBADO'));
    await expect(
      service.update(
        DOC_ID,
        {
          estado: 'ARCHIVADO',
          tipoDocumentalId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        },
        admin.id,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PATCH APROBADO → ARCHIVADO + dependenciaId → 400', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('APROBADO'));
    await expect(
      service.update(
        DOC_ID,
        {
          estado: 'ARCHIVADO',
          dependenciaId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        },
        admin.id,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PATCH APROBADO → ARCHIVADO + asunto → 400', async () => {
    prisma.documento.findUnique.mockResolvedValue(docBase('APROBADO'));
    await expect(
      service.update(
        DOC_ID,
        { estado: 'ARCHIVADO', asunto: 'alterado' },
        admin.id,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upload en EN_REVISION → bloqueado', async () => {
    prisma.documento.findFirst.mockResolvedValue(docBase('EN_REVISION'));
    await expect(
      service.uploadArchivo(
        DOC_ID,
        {
          buffer: Buffer.from('%PDF'),
          originalname: 'a.pdf',
          mimetype: 'application/pdf',
          size: 4,
        } as Express.Multer.File,
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upload en APROBADO → bloqueado', async () => {
    prisma.documento.findFirst.mockResolvedValue(docBase('APROBADO'));
    await expect(
      service.uploadArchivo(
        DOC_ID,
        {
          buffer: Buffer.from('%PDF'),
          originalname: 'a.pdf',
          mimetype: 'application/pdf',
          size: 4,
        } as Express.Multer.File,
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delete en ARCHIVADO → bloqueado', async () => {
    prisma.documento.findFirst.mockResolvedValue(docBase('ARCHIVADO'));
    await expect(
      service.deleteArchivo(
        DOC_ID,
        'ffffffff-ffff-4fff-8fff-ffffffffffff',
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('USER no puede desbloquear (carga por visibilidad; si no ve → 404)', async () => {
    const user: JwtRequestUser = {
      id: USER_ID,
      email: 'u@local.test',
      nombres: 'U',
      apellidos: 'S',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    };
    prisma.documento.findFirst.mockResolvedValue(null);
    await expect(
      service.desbloquear(DOC_ID, { motivo: 'Intento indebido' }, user),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
