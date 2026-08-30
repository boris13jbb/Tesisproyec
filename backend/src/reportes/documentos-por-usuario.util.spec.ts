import {
  buildDocumentosPorUsuarioSummary,
  buildResumenPorUsuario,
  buildRevisionFromAudit,
  parseDocReviewResolvedMeta,
  pickLatestReviewByDocumentoId,
  resolveRevisorDisplay,
  type AuditReviewRow,
} from './documentos-por-usuario.util';

describe('documentos-por-usuario.util', () => {
  describe('parseDocReviewResolvedMeta', () => {
    it('extrae decision y motivoRechazo', () => {
      const meta = parseDocReviewResolvedMeta(
        JSON.stringify({
          decision: 'RECHAZADO',
          motivoRechazo: 'Falta firma del responsable.',
        }),
      );
      expect(meta.decision).toBe('RECHAZADO');
      expect(meta.motivoRechazo).toBe('Falta firma del responsable.');
    });

    it('aprobado sin motivo', () => {
      const meta = parseDocReviewResolvedMeta(
        JSON.stringify({ decision: 'APROBADO' }),
      );
      expect(meta.decision).toBe('APROBADO');
      expect(meta.motivoRechazo).toBeNull();
    });

    it('meta inválida o vacía', () => {
      expect(parseDocReviewResolvedMeta(null).decision).toBeUndefined();
      expect(parseDocReviewResolvedMeta('not-json').motivoRechazo).toBeNull();
    });
  });

  describe('pickLatestReviewByDocumentoId', () => {
    it('conserva la resolución más reciente por documento', () => {
      const older: AuditReviewRow = {
        resourceId: 'doc-1',
        actorUserId: 'u1',
        actorEmail: 'a@test.com',
        createdAt: new Date('2026-08-01T10:00:00Z'),
        metaJson: JSON.stringify({
          decision: 'RECHAZADO',
          motivoRechazo: 'v1',
        }),
      };
      const newer: AuditReviewRow = {
        resourceId: 'doc-1',
        actorUserId: 'u2',
        actorEmail: 'b@test.com',
        createdAt: new Date('2026-08-20T12:00:00Z'),
        metaJson: JSON.stringify({ decision: 'APROBADO' }),
      };
      const other: AuditReviewRow = {
        resourceId: 'doc-2',
        actorUserId: 'u1',
        actorEmail: 'a@test.com',
        createdAt: new Date('2026-08-15T08:00:00Z'),
        metaJson: JSON.stringify({
          decision: 'RECHAZADO',
          motivoRechazo: 'Falta anexo',
        }),
      };
      const map = pickLatestReviewByDocumentoId([older, newer, other]);
      expect(map.get('doc-1')?.actorUserId).toBe('u2');
      expect(map.get('doc-2')?.actorEmail).toBe('a@test.com');
    });
  });

  describe('buildDocumentosPorUsuarioSummary', () => {
    it('cuenta totales por estado (filtro APROBADO / RECHAZADO / EN_REVISION)', () => {
      const summary = buildDocumentosPorUsuarioSummary([
        'APROBADO',
        'APROBADO',
        'RECHAZADO',
        'EN_REVISION',
        'REGISTRADO',
        'BORRADOR',
        'ARCHIVADO',
      ]);
      expect(summary.total).toBe(7);
      expect(summary.aprobados).toBe(2);
      expect(summary.rechazados).toBe(1);
      expect(summary.enRevision).toBe(1);
      expect(summary.registrados).toBe(1);
      expect(summary.borradores).toBe(1);
      expect(summary.archivados).toBe(1);
    });

    it('usuario con 0 documentos', () => {
      const summary = buildDocumentosPorUsuarioSummary([]);
      expect(summary).toEqual({
        total: 0,
        aprobados: 0,
        rechazados: 0,
        enRevision: 0,
        registrados: 0,
        borradores: 0,
        archivados: 0,
      });
    });
  });

  describe('buildResumenPorUsuario', () => {
    it('agrupa por creador con aprobados y rechazados', () => {
      const rows = buildResumenPorUsuario([
        {
          createdById: 'u-juan',
          estado: 'APROBADO',
          creadoPor: {
            id: 'u-juan',
            nombres: 'Juan',
            apellidos: 'Pérez',
            email: 'juan@email.com',
          },
        },
        {
          createdById: 'u-juan',
          estado: 'RECHAZADO',
          creadoPor: {
            id: 'u-juan',
            nombres: 'Juan',
            apellidos: 'Pérez',
            email: 'juan@email.com',
          },
        },
        {
          createdById: 'u-maria',
          estado: 'EN_REVISION',
          creadoPor: {
            id: 'u-maria',
            nombres: 'María',
            apellidos: 'López',
            email: 'maria@email.com',
          },
        },
      ]);
      expect(rows).toHaveLength(2);
      expect(rows[0].email).toBe('juan@email.com');
      expect(rows[0].total).toBe(2);
      expect(rows[0].aprobados).toBe(1);
      expect(rows[0].rechazados).toBe(1);
      expect(rows[1].enRevision).toBe(1);
    });
  });

  describe('resolveRevisorDisplay / buildRevisionFromAudit', () => {
    const users = new Map([
      [
        'rev-1',
        {
          id: 'rev-1',
          nombres: 'Administrador',
          apellidos: 'Sistema',
          email: 'admin@email.com',
        },
      ],
    ]);

    it('recupera revisor por actorUserId', () => {
      const audit: AuditReviewRow = {
        resourceId: 'doc-x',
        actorUserId: 'rev-1',
        actorEmail: 'admin@email.com',
        createdAt: new Date('2026-08-22T15:00:00Z'),
        metaJson: JSON.stringify({
          decision: 'RECHAZADO',
          motivoRechazo: 'Falta documento de respaldo',
        }),
      };
      const rev = buildRevisionFromAudit(audit, users);
      expect(rev?.revisadoPor?.nombres).toBe('Administrador');
      expect(rev?.motivoRechazo).toBe('Falta documento de respaldo');
      expect(rev?.decision).toBe('RECHAZADO');
    });

    it('fallback a actorEmail si el usuario ya no existe', () => {
      const audit: AuditReviewRow = {
        resourceId: 'doc-y',
        actorUserId: 'deleted-user',
        actorEmail: 'ex-revisor@email.com',
        createdAt: new Date('2026-08-22T15:00:00Z'),
        metaJson: JSON.stringify({ decision: 'APROBADO' }),
      };
      const actor = resolveRevisorDisplay(audit, users);
      expect(actor?.email).toBe('ex-revisor@email.com');
      expect(actor?.nombres).toBeNull();
    });

    it('documento sin auditoría de revisión → null', () => {
      expect(buildRevisionFromAudit(undefined, users)).toBeNull();
    });
  });

  describe('filtros conceptuales (combinación usuario + estado)', () => {
    it('simula filtro usuario + RECHAZADO sobre lista ya filtrada', () => {
      const filteredEstados = ['RECHAZADO', 'RECHAZADO'];
      const summary = buildDocumentosPorUsuarioSummary(filteredEstados);
      expect(summary.total).toBe(2);
      expect(summary.rechazados).toBe(2);
      expect(summary.aprobados).toBe(0);
    });

    it('simula filtro solo APROBADO', () => {
      const summary = buildDocumentosPorUsuarioSummary([
        'APROBADO',
        'APROBADO',
        'APROBADO',
      ]);
      expect(summary.aprobados).toBe(3);
      expect(summary.total).toBe(3);
    });
  });
});
