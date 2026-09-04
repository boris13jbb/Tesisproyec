import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../auditoria/audit.service';
import type { JwtRequestUser } from '../auth/request-user';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TiposDocumentalesService } from '../tipos-documentales/tipos-documentales.service';
import { DOCUMENTO_ARCHIVO_MAX_BYTES } from './documento-archivo-storage.util';
import { DocumentosService } from './documentos.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn(),
}));

import fs from 'fs/promises';

const DOC_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FILE_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

function pdfFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    originalname: 'contrato.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
    size: 8,
    ...overrides,
  } as Express.Multer.File;
}

describe('DocumentosService — archivos (validación / integridad)', () => {
  const user: JwtRequestUser = {
    id: 'user-1',
    email: 'u@local.test',
    nombres: 'U',
    apellidos: 'S',
    roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
    dependenciaId: 'dep-1',
  };

  let service: DocumentosService;
  let prisma: {
    documento: { findFirst: jest.Mock };
    documentoArchivo: {
      findFirst: jest.Mock;
      aggregate: jest.Mock;
      update: jest.Mock;
    };
    documentoArchivoEvento: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      documento: { findFirst: jest.fn() },
      documentoArchivo: {
        findFirst: jest.fn(),
        aggregate: jest.fn(),
        update: jest.fn(),
      },
      documentoArchivoEvento: { create: jest.fn() },
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
          useValue: { assertAssignable: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(DocumentosService);
  });

  it('upload 0 bytes → 400', async () => {
    prisma.documento.findFirst.mockResolvedValue({
      id: DOC_ID,
      estado: 'REGISTRADO',
    });
    await expect(
      service.uploadArchivo(
        DOC_ID,
        pdfFile({ buffer: Buffer.alloc(0), size: 0 }),
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('upload límite + 1 → 413', async () => {
    prisma.documento.findFirst.mockResolvedValue({
      id: DOC_ID,
      estado: 'REGISTRADO',
    });
    const oversized = Buffer.concat([
      Buffer.from('%PDF-'),
      Buffer.alloc(DOCUMENTO_ARCHIVO_MAX_BYTES),
    ]);
    await expect(
      service.uploadArchivo(
        DOC_ID,
        pdfFile({ buffer: oversized, size: oversized.length }),
        user,
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('upload MIME vacío → 400', async () => {
    prisma.documento.findFirst.mockResolvedValue({
      id: DOC_ID,
      estado: 'REGISTRADO',
    });
    await expect(
      service.uploadArchivo(DOC_ID, pdfFile({ mimetype: '' }), user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upload no-PDF / ejecutable → 400', async () => {
    prisma.documento.findFirst.mockResolvedValue({
      id: DOC_ID,
      estado: 'BORRADOR',
    });
    await expect(
      service.uploadArchivo(
        DOC_ID,
        pdfFile({
          originalname: 'a.exe',
          mimetype: 'application/x-msdownload',
        }),
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upload RECHAZADO pasa freeze (editable)', async () => {
    prisma.documento.findFirst.mockResolvedValue({
      id: DOC_ID,
      estado: 'RECHAZADO',
    });
    prisma.documentoArchivo.aggregate.mockResolvedValue({
      _max: { version: 0 },
    });
    prisma.$transaction.mockRejectedValue(new Error('stop-after-write'));
    await expect(
      service.uploadArchivo(DOC_ID, pdfFile(), user),
    ).rejects.toThrow('stop-after-write');
    expect(fs.writeFile).toHaveBeenCalled();
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('mismo originalname no define el mismo storedName (UUID.pdf)', async () => {
    prisma.documento.findFirst.mockResolvedValue({
      id: DOC_ID,
      estado: 'BORRADOR',
    });
    prisma.documentoArchivo.aggregate.mockResolvedValue({
      _max: { version: 1 },
    });
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          documentoArchivo: {
            create: jest
              .fn()
              .mockImplementation(
                ({
                  data,
                }: {
                  data: { storedName: string; originalName: string };
                }) => {
                  expect(data.storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/i);
                  expect(data.storedName).not.toBe(data.originalName);
                  return {
                    id: FILE_ID,
                    version: 2,
                    originalName: data.originalName,
                    mimeType: 'application/pdf',
                    sizeBytes: 8,
                    sha256: 'abc',
                    createdAt: new Date(),
                    createdBy: { id: user.id, email: user.email },
                  };
                },
              ),
          },
          documentoArchivoEvento: { create: jest.fn() },
        };
        return fn(tx);
      },
    );
    await service.uploadArchivo(DOC_ID, pdfFile(), user);
    await service.uploadArchivo(DOC_ID, pdfFile(), user);
    const calls = jest.mocked(fs.writeFile).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[0]).not.toEqual(calls[1]?.[0]);
  });

  it('download archivo físico ausente → 404 sin path', async () => {
    prisma.documento.findFirst.mockResolvedValue({ id: DOC_ID });
    prisma.documentoArchivo.findFirst.mockResolvedValue({
      id: FILE_ID,
      documentoId: DOC_ID,
      activo: true,
      pathRel:
        'documentos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/ffffffff-ffff-4fff-8fff-ffffffffffff.pdf',
      originalName: 'x.pdf',
      mimeType: 'application/pdf',
    });
    (fs.stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));
    await expect(
      service.prepareDownloadArchivo(DOC_ID, FILE_ID, user, null),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete repetido → 404', async () => {
    prisma.documento.findFirst.mockResolvedValue({
      id: DOC_ID,
      estado: 'REGISTRADO',
    });
    prisma.documentoArchivo.findFirst.mockResolvedValue(null);
    await expect(
      service.deleteArchivo(DOC_ID, FILE_ID, user),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
