import { JwtRequestUser } from '../auth/request-user';
import { ReportesService } from './reportes.service';

/** Pruebas de mínimo privilegio / alcance documental en ReportesService. */
describe('ReportesService — seguridad por alcance', () => {
  const adminViewer: JwtRequestUser = {
    id: 'admin-1',
    email: 'admin@local.test',
    nombres: 'Admin',
    apellidos: 'QA',
    roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
    dependenciaId: null,
  };

  const userViewer: JwtRequestUser = {
    id: 'user-1',
    email: 'usuario@local.test',
    nombres: 'Usuario',
    apellidos: 'QA',
    roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
    dependenciaId: 'dep-1',
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
    documento: {
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
    auditLog: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
    dependencia: { findMany: jest.Mock };
  };

  function buildPrismaMock(): PrismaMock {
    return {
      documento: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      dependencia: { findMany: jest.fn().mockResolvedValue([]) },
    };
  }

  function extractBaseWhere(
    where: Record<string, unknown>,
  ): Record<string, unknown> {
    if (Array.isArray(where.AND) && where.AND.length > 0) {
      return where.AND[0] as Record<string, unknown>;
    }
    return where;
  }

  function lastDocWhere(prisma: PrismaMock): Record<string, unknown> {
    const calls = prisma.documento.findMany.mock.calls as unknown[][];
    const arg = calls.at(-1)?.[0] as
      | { where?: Record<string, unknown> }
      | undefined;
    return arg?.where ?? {};
  }

  function lastDocBaseWhere(prisma: PrismaMock): Record<string, unknown> {
    return extractBaseWhere(lastDocWhere(prisma));
  }

  function lastGroupByWhere(prisma: PrismaMock): Record<string, unknown> {
    const calls = prisma.documento.groupBy.mock.calls as unknown[][];
    const arg = calls.at(-1)?.[0] as
      | { where?: Record<string, unknown> }
      | undefined;
    return arg?.where ?? {};
  }

  it('findDocumentos — USUARIO aplica documentoVisibilityWhere (AND)', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findDocumentos({}, userViewer);
    const where = lastDocWhere(prisma);
    expect(Array.isArray(where.AND)).toBe(true);
    expect((where.AND as unknown[]).length).toBe(2);
  });

  it('findDocumentos — ADMIN no añade filtro de visibilidad', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findDocumentos({ estado: 'APROBADO' }, adminViewer);
    const where = lastDocWhere(prisma);
    expect(where.AND).toBeUndefined();
    expect(where.estado).toBe('APROBADO');
  });

  it('findDocumentosPorUsuario — filtro creador ajeno no elimina scope USUARIO', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findDocumentosPorUsuario(
      { createdByUserId: 'otro-user-id' },
      userViewer,
    );
    const where = lastDocWhere(prisma);
    const base = lastDocBaseWhere(prisma);
    expect(base.createdById).toBe('otro-user-id');
    expect(Array.isArray(where.AND)).toBe(true);
  });

  it('findPendientesRevision — fuerza estado EN_REVISION y aplica scope REVISOR', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findPendientesRevision(revisorViewer);
    const where = lastDocWhere(prisma);
    const base = lastDocBaseWhere(prisma);
    expect(base.estado).toBe('EN_REVISION');
    expect(Array.isArray(where.AND)).toBe(true);
  });

  it('aggregateDocumentosPorEstado — USUARIO usa scope documental', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.aggregateDocumentosPorEstado(userViewer, {});
    const where = lastGroupByWhere(prisma);
    expect(Array.isArray(where.AND)).toBe(true);
  });

  it('aggregateDocumentosPorDependencia — ADMIN sin AND de visibilidad', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.aggregateDocumentosPorDependencia(adminViewer, {});
    const where = lastGroupByWhere(prisma);
    expect(where.AND).toBeUndefined();
  });

  it('findProximosVencimiento — USUARIO aplica scope documental', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findProximosVencimiento(userViewer, 30);
    const where = lastDocWhere(prisma);
    expect(Array.isArray(where.AND)).toBe(true);
  });

  it('findDocumentosPorUsuario — createdByUserId ajeno no elimina scope REVISOR', async () => {
    const prisma = buildPrismaMock();
    const service = new ReportesService(prisma as never);
    await service.findDocumentosPorUsuario(
      { createdByUserId: 'otro-user' },
      revisorViewer,
    );
    const where = lastDocWhere(prisma);
    const base = lastDocBaseWhere(prisma);
    expect(base.createdById).toBe('otro-user');
    expect(Array.isArray(where.AND)).toBe(true);
  });
});
