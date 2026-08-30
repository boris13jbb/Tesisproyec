import { BadRequestException } from '@nestjs/common';
import { JwtRequestUser } from '../auth/request-user';
import { ReportesService } from './reportes.service';

/**
 * Pruebas de servicio con Prisma mockeado:
 * filtros, resumen, revisor/motivo y visibilidad (ADMIN sin scope).
 */
describe('ReportesService.findDocumentosPorUsuario', () => {
  const adminViewer: JwtRequestUser = {
    id: 'admin-1',
    email: 'admin@local.test',
    nombres: 'Admin',
    apellidos: 'QA',
    roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
    dependenciaId: null,
  };

  const revisorViewer: JwtRequestUser = {
    id: 'rev-1',
    email: 'revisor@local.test',
    nombres: 'Revisor',
    apellidos: 'QA',
    roles: [{ codigo: 'REVISOR', nombre: 'Revisor' }],
    dependenciaId: 'dep-1',
  };

  type PrismaMock = {
    documento: { findMany: jest.Mock };
    auditLog: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
  };

  function buildPrismaMock(overrides?: {
    docs?: unknown[];
    audits?: unknown[];
    users?: unknown[];
  }): PrismaMock {
    return {
      documento: {
        findMany: jest.fn().mockResolvedValue(overrides?.docs ?? []),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue(overrides?.audits ?? []),
      },
      user: {
        findMany: jest.fn().mockResolvedValue(overrides?.users ?? []),
      },
    };
  }

  function lastFindManyWhere(prisma: PrismaMock): Record<string, unknown> {
    const calls = prisma.documento.findMany.mock.calls as unknown[][];
    const arg = calls[0]?.[0] as
      | { where?: Record<string, unknown> }
      | undefined;
    return arg?.where ?? {};
  }

  it('filtra por createdByUserId en where Prisma', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findDocumentosPorUsuario(
      { createdByUserId: 'user-juan' },
      adminViewer,
    );
    expect(lastFindManyWhere(prisma).createdById).toBe('user-juan');
  });

  it('filtra por estado APROBADO', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findDocumentosPorUsuario({ estado: 'APROBADO' }, adminViewer);
    expect(lastFindManyWhere(prisma).estado).toBe('APROBADO');
  });

  it('filtra por estado RECHAZADO', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findDocumentosPorUsuario(
      { estado: 'RECHAZADO' },
      adminViewer,
    );
    expect(lastFindManyWhere(prisma).estado).toBe('RECHAZADO');
  });

  it('combinación usuario + estado', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findDocumentosPorUsuario(
      { createdByUserId: 'user-juan', estado: 'RECHAZADO' },
      adminViewer,
    );
    const where = lastFindManyWhere(prisma);
    expect(where.createdById).toBe('user-juan');
    expect(where.estado).toBe('RECHAZADO');
  });

  it('rechaza estado inválido', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await expect(
      service.findDocumentosPorUsuario({ estado: 'INVALIDO' }, adminViewer),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('usuario con 0 documentos → summary en cero', async () => {
    const prisma = buildPrismaMock({ docs: [] });
    const service = new ReportesService(prisma as never);
    const report = await service.findDocumentosPorUsuario({}, adminViewer);
    expect(report.items).toHaveLength(0);
    expect(report.summary.total).toBe(0);
    expect(report.porUsuario).toHaveLength(0);
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('recupera revisor y motivo de rechazo desde DOC_REVIEW_RESOLVED', async () => {
    const docs = [
      {
        id: 'doc-r1',
        codigo: 'DOC-0013',
        asunto: 'Solicitud de compra',
        fechaDocumento: new Date('2026-08-21'),
        estado: 'RECHAZADO',
        createdById: 'u-maria',
        tipoDocumental: {
          id: 't1',
          codigo: 'SOL',
          nombre: 'Solicitud',
        },
        dependencia: {
          id: 'd1',
          codigo: 'ADM',
          nombre: 'Administración',
        },
        createdBy: {
          id: 'u-maria',
          nombres: 'María',
          apellidos: 'López',
          email: 'maria@email.com',
        },
      },
      {
        id: 'doc-a1',
        codigo: 'DOC-0012',
        asunto: 'Informe mensual',
        fechaDocumento: new Date('2026-08-20'),
        estado: 'APROBADO',
        createdById: 'u-juan',
        tipoDocumental: {
          id: 't2',
          codigo: 'INF',
          nombre: 'Informe',
        },
        dependencia: {
          id: 'd2',
          codigo: 'SEC',
          nombre: 'Secretaría',
        },
        createdBy: {
          id: 'u-juan',
          nombres: 'Juan',
          apellidos: 'Pérez',
          email: 'juan@email.com',
        },
      },
    ];
    const audits = [
      {
        resourceId: 'doc-r1',
        actorUserId: 'admin-1',
        actorEmail: 'admin@email.com',
        createdAt: new Date('2026-08-22T10:00:00Z'),
        metaJson: JSON.stringify({
          decision: 'RECHAZADO',
          motivoRechazo: 'Falta documento de respaldo',
        }),
      },
      {
        resourceId: 'doc-a1',
        actorUserId: 'admin-1',
        actorEmail: 'admin@email.com',
        createdAt: new Date('2026-08-22T11:00:00Z'),
        metaJson: JSON.stringify({ decision: 'APROBADO' }),
      },
    ];
    const users = [
      {
        id: 'admin-1',
        nombres: 'Administrador',
        apellidos: null,
        email: 'admin@email.com',
      },
    ];
    const prisma = buildPrismaMock({ docs, audits, users });
    const service = new ReportesService(prisma as never);
    const report = await service.findDocumentosPorUsuario({}, adminViewer);

    expect(report.summary.total).toBe(2);
    expect(report.summary.aprobados).toBe(1);
    expect(report.summary.rechazados).toBe(1);

    const rechazado = report.items.find((i) => i.codigo === 'DOC-0013');
    expect(rechazado?.revision?.motivoRechazo).toBe(
      'Falta documento de respaldo',
    );
    expect(rechazado?.revision?.revisadoPor?.nombres).toBe('Administrador');

    const aprobado = report.items.find((i) => i.codigo === 'DOC-0012');
    expect(aprobado?.revision?.motivoRechazo).toBeNull();
    expect(aprobado?.revision?.decision).toBe('APROBADO');
  });

  it('documento sin auditoría de revisión deja revision = null', async () => {
    const docs = [
      {
        id: 'doc-plain',
        codigo: 'DOC-0099',
        asunto: 'Sin revisión',
        fechaDocumento: new Date('2026-08-10'),
        estado: 'REGISTRADO',
        createdById: 'u-juan',
        tipoDocumental: { id: 't1', codigo: 'INF', nombre: 'Informe' },
        dependencia: null,
        createdBy: {
          id: 'u-juan',
          nombres: 'Juan',
          apellidos: 'Pérez',
          email: 'juan@email.com',
        },
      },
    ];
    const prisma = buildPrismaMock({ docs, audits: [] });
    const service = new ReportesService(prisma as never);
    const report = await service.findDocumentosPorUsuario({}, adminViewer);
    expect(report.items[0].revision).toBeNull();
    expect(report.summary.registrados).toBe(1);
  });

  it('REVISOR aplica documentoVisibilityWhere (AND con scope)', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findDocumentosPorUsuario({}, revisorViewer);
    const where = lastFindManyWhere(prisma);
    expect(Array.isArray(where.AND)).toBe(true);
    expect((where.AND as unknown[]).length).toBe(2);
  });

  it('ADMIN no añade filtro de visibilidad (acceso completo)', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findDocumentosPorUsuario(
      { estado: 'EN_REVISION' },
      adminViewer,
    );
    const where = lastFindManyWhere(prisma);
    expect(where.AND).toBeUndefined();
    expect(where.estado).toBe('EN_REVISION');
  });
});
