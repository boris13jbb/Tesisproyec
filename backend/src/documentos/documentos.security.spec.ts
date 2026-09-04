import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../auditoria/audit.service';
import type { JwtRequestUser } from '../auth/request-user';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TiposDocumentalesService } from '../tipos-documentales/tipos-documentales.service';
import { DocumentosService } from './documentos.service';

/**
 * Seguridad documental: alcance (documentoVisibilityWhere), anti-IDOR
 * en detalle/historial/upload/download y total de listado.
 */
describe('DocumentosService — seguridad (alcance / IDOR)', () => {
  const userA: JwtRequestUser = {
    id: 'user-a',
    email: 'a@local.test',
    nombres: 'A',
    apellidos: 'User',
    roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
    dependenciaId: 'dep-1',
  };

  const docOwnId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const docAlienId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  let service: DocumentosService;
  let prisma: {
    documento: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
    documentoArchivo: { findFirst: jest.Mock; aggregate: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      documento: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
      documentoArchivo: {
        findFirst: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentosService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
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

  it('findOne — documento ajeno → 404 seguro (anti-enumeración)', async () => {
    prisma.documento.findFirst.mockResolvedValue(null);
    await expect(service.findOne(docAlienId, userA)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.documento.findFirst).toHaveBeenCalled();
    const callJson = JSON.stringify(prisma.documento.findFirst.mock.calls[0]);
    expect(callJson).toContain(docAlienId);
    expect(callJson).toContain('AND');
  });

  it('findEventos — exige documento visible antes de listar historial', async () => {
    prisma.documento.findFirst.mockResolvedValue(null);
    await expect(service.findEventos(docAlienId, userA)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findArchivoEventos — documento ajeno → 404 (no lista eventos de archivo)', async () => {
    prisma.documento.findFirst.mockResolvedValue(null);
    await expect(
      service.findArchivoEventos(
        docAlienId,
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        userA,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.documentoArchivo.findFirst).not.toHaveBeenCalled();
  });

  it('findArchivoEventos — archivo que no pertenece al documento → 404', async () => {
    prisma.documento.findFirst.mockResolvedValue({ id: docOwnId });
    prisma.documentoArchivo.findFirst.mockResolvedValue(null);
    await expect(
      service.findArchivoEventos(
        docOwnId,
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        userA,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uploadArchivo — documento ajeno → 404 (IDOR cerrado)', async () => {
    prisma.documento.findFirst.mockResolvedValue(null);
    const fakeFile = {
      originalname: 'x.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
      size: 8,
    } as Express.Multer.File;

    await expect(
      service.uploadArchivo(docAlienId, fakeFile, userA),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.documentoArchivo.aggregate).not.toHaveBeenCalled();
  });

  it('prepareDownloadArchivo — archivoId de otro documento → 404', async () => {
    prisma.documento.findFirst.mockResolvedValue({ id: docOwnId });
    prisma.documentoArchivo.findFirst.mockResolvedValue(null);
    await expect(
      service.prepareDownloadArchivo(
        docOwnId,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        userA,
        null,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prepareDownloadArchivo — documento ajeno no consulta archivo', async () => {
    prisma.documento.findFirst.mockResolvedValue(null);
    await expect(
      service.prepareDownloadArchivo(
        docAlienId,
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        userA,
        null,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.documentoArchivo.findFirst).not.toHaveBeenCalled();
  });

  it('findAll — count y findMany usan el mismo where con scope', async () => {
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => {
      return Promise.all(ops as Promise<unknown>[]);
    });
    prisma.documento.count.mockResolvedValue(1);
    prisma.documento.findMany.mockResolvedValue([
      {
        id: docOwnId,
        codigo: 'DOC-0001',
        asunto: 'Propio',
        estado: 'REGISTRADO',
        activo: true,
        fechaDocumento: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: userA.id,
        dependenciaId: 'dep-1',
        nivelConfidencialidad: 'INTERNO',
        accessPolicy: 'INHERIT',
        tipoDocumental: { id: 't1', codigo: 'MEMO', nombre: 'Memorando' },
        dependencia: null,
        createdBy: { id: userA.id, email: userA.email },
        contraparte: null,
        beneficiario: null,
      },
    ]);

    const result = await service.findAll(userA, false, {
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(prisma.documento.count).toHaveBeenCalled();
    expect(prisma.documento.findMany).toHaveBeenCalled();
    const countJson = JSON.stringify(prisma.documento.count.mock.calls[0]);
    const listJson = JSON.stringify(prisma.documento.findMany.mock.calls[0]);
    expect(countJson).toContain('AND');
    expect(listJson).toContain('AND');
    expect(countJson).toContain('user-a');
    expect(listJson).toContain('user-a');
  });

  it('findAll — filtro dependenciaId ajena no elimina el scope (AND)', async () => {
    prisma.$transaction.mockImplementation(async (ops: unknown[]) =>
      Promise.all(ops as Promise<unknown>[]),
    );
    prisma.documento.count.mockResolvedValue(0);
    prisma.documento.findMany.mockResolvedValue([]);

    await service.findAll(userA, false, {
      dependenciaId: 'dep-ajena',
      page: 1,
      pageSize: 10,
    });

    const whereJson = JSON.stringify(prisma.documento.count.mock.calls[0]);
    expect(whereJson).toContain('dep-ajena');
    expect(whereJson).toContain('user-a');
    expect(whereJson).toContain('AND');
  });
});
