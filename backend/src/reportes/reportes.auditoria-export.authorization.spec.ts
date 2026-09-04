import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuditService } from '../auditoria/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERM } from '../auth/permission-codes';
import { PermissionsService } from '../auth/permissions.service';
import type { JwtRequestUser } from '../auth/request-user';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

function cellText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }
  if (value && typeof value === 'object' && 'text' in value) {
    const text = (value as { text?: unknown }).text;
    return typeof text === 'string' ? text : '';
  }
  return '';
}

/**
 * Autorización real de GET /reportes/auditoria.xlsx:
 * rol ADMIN + AUDIT_EXPORT (independiente de AUDIT_READ).
 */
describe('GET /reportes/auditoria.xlsx (autorización y fechas)', () => {
  let app: INestApplication<App>;
  const getCodesForUserId = jest.fn<Promise<Set<string>>, [string]>();
  const findAuditLogs = jest.fn();
  const auditLog = jest.fn().mockResolvedValue(undefined);

  let authUser: JwtRequestUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        RolesGuard,
        PermissionsGuard,
        { provide: ReportesService, useValue: { findAuditLogs } },
        { provide: AuditService, useValue: { log: auditLog } },
        { provide: PermissionsService, useValue: { getCodesForUserId } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx
            .switchToHttp()
            .getRequest<{ user?: JwtRequestUser }>();
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
    findAuditLogs.mockReset();
    auditLog.mockClear();
    findAuditLogs.mockResolvedValue([]);
  });

  function setUser(user: JwtRequestUser) {
    authUser = user;
  }

  const admin = (): JwtRequestUser => ({
    id: 'admin-audit-exp',
    email: 'admin-exp@local.test',
    nombres: 'Admin',
    apellidos: 'Export',
    roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
    dependenciaId: null,
  });

  it('ADMIN con AUDIT_READ sin AUDIT_EXPORT → 403', async () => {
    setUser(admin());
    getCodesForUserId.mockResolvedValue(new Set([PERM.AUDIT_READ]));

    await request(app.getHttpServer())
      .get('/reportes/auditoria.xlsx')
      .expect(403);

    expect(findAuditLogs).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('ADMIN con AUDIT_EXPORT (sin AUDIT_READ) → 200', async () => {
    setUser(admin());
    getCodesForUserId.mockResolvedValue(new Set([PERM.AUDIT_EXPORT]));

    await request(app.getHttpServer())
      .get('/reportes/auditoria.xlsx')
      .expect(200);

    expect(findAuditLogs).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalled();
  });

  it('USER → 403', async () => {
    setUser({
      id: 'user-1',
      email: 'user@local.test',
      nombres: 'User',
      apellidos: 'QA',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    });
    getCodesForUserId.mockResolvedValue(new Set([PERM.AUDIT_EXPORT]));

    await request(app.getHttpServer())
      .get('/reportes/auditoria.xlsx')
      .expect(403);
    expect(findAuditLogs).not.toHaveBeenCalled();
  });

  it('from > to → 400 sin escribir REPORT_EXPORTED', async () => {
    setUser(admin());
    getCodesForUserId.mockResolvedValue(new Set([PERM.AUDIT_EXPORT]));

    await request(app.getHttpServer())
      .get('/reportes/auditoria.xlsx')
      .query({
        from: '2026-09-02T00:00:00.000Z',
        to: '2026-09-01T00:00:00.000Z',
      })
      .expect(400);

    expect(findAuditLogs).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('export redacta meta (misma política que lectura)', async () => {
    setUser(admin());
    getCodesForUserId.mockResolvedValue(new Set([PERM.AUDIT_EXPORT]));
    findAuditLogs.mockResolvedValue([
      {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        action: 'AUTH_LOGIN_FAIL',
        result: 'FAIL',
        actorEmail: '=CMD',
        ip: '127.0.0.1',
        resourceType: null,
        resourceId: null,
        resourceCodigo: null,
        metaJson: JSON.stringify({
          password: 'plain',
          otpauthUrl: 'otpauth://totp/x?secret=ABC',
          reason: 'INVALID_PASSWORD',
        }),
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/reportes/auditoria.xlsx')
      .buffer(true)
      .parse((res, callback) => {
        const data: Buffer[] = [];
        res.on('data', (chunk: Buffer) => data.push(chunk));
        res.on('end', () => {
          callback(null, Buffer.concat(data));
        });
      })
      .expect(200);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body as Buffer);
    const ws = wb.getWorksheet('Auditoria');
    expect(ws).toBeDefined();
    const emailCell = cellText(ws!.getRow(2).getCell(4).value);
    expect(emailCell).toBe("'=CMD");
    const metaCell = cellText(ws!.getRow(2).getCell(9).value);
    expect(metaCell).toContain('[REDACTED]');
    expect(metaCell).toContain('INVALID_PASSWORD');
    expect(metaCell).not.toContain('otpauth://');
    expect(metaCell).not.toContain('"password":"plain"');
  });
});
