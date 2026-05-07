import {
  Controller,
  Get,
  Header,
  InternalServerErrorException,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtRequestUser } from '../auth/request-user';
import { AuditService } from '../auditoria/audit.service';
import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportesController {
  constructor(
    private readonly service: ReportesService,
    private readonly audit: AuditService,
  ) {}

  private parseBool(v?: string) {
    return v === 'true' || v === '1';
  }

  private async logReportExport(
    req: Request & { user?: JwtRequestUser },
    format: 'xlsx' | 'pdf',
    kind: 'documentos' | 'auditoria' | 'pendientes_revision',
  ) {
    const u = req.user;
    await this.audit.log({
      action: 'REPORT_EXPORTED',
      result: 'OK',
      context: {
        actorUserId: u?.id ?? null,
        actorEmail: u?.email ?? null,
        ip: req.ip ?? null,
        userAgent:
          typeof req.headers['user-agent'] === 'string'
            ? req.headers['user-agent']
            : null,
      },
      meta: { format, kind },
    });
  }

  @Get('pendientes-revision.xlsx')
  @Roles('ADMIN', 'REVISOR')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportPendientesRevisionExcel(
    @Req() req: Request & { user: JwtRequestUser },
    @Res() res: Response,
  ) {
    await this.logReportExport(req, 'xlsx', 'pendientes_revision');
    const items = await this.service.findPendientesRevision(req.user);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SGD-GADPR-LM';
    const ws = wb.addWorksheet('Pendientes revisión');
    ws.columns = [
      { header: 'Código', key: 'codigo', width: 18 },
      { header: 'Asunto', key: 'asunto', width: 40 },
      { header: 'Fecha', key: 'fechaDocumento', width: 14 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Confidencialidad', key: 'nivelConfidencialidad', width: 16 },
      { header: 'Dependencia', key: 'dependenciaCodigo', width: 16 },
      { header: 'Tipo documental', key: 'tipoDocumental', width: 28 },
      { header: 'Clasificación', key: 'clasificacion', width: 30 },
      { header: 'Adjuntos', key: 'archivosActivos', width: 10 },
      { header: 'Creado por', key: 'createdBy', width: 22 },
      { header: 'Creado el', key: 'createdAt', width: 20 },
    ];
    ws.getRow(1).font = { bold: true };

    for (const d of items) {
      ws.addRow({
        codigo: d.codigo,
        asunto: d.asunto,
        fechaDocumento: d.fechaDocumento.toISOString().slice(0, 10),
        estado: d.estado,
        nivelConfidencialidad: d.nivelConfidencialidad,
        dependenciaCodigo: d.dependenciaCodigo,
        tipoDocumental: d.tipoDocumental,
        clasificacion: d.clasificacion,
        archivosActivos: d.archivosActivos,
        createdBy: d.createdBy,
        createdAt: d.createdAt.toISOString().replace('T', ' ').slice(0, 19),
      });
    }

    const filename = `pendientes_revision_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('pendientes-revision.pdf')
  @Roles('ADMIN', 'REVISOR')
  @Header('Content-Type', 'application/pdf')
  async exportPendientesRevisionPdf(
    @Req() req: Request & { user: JwtRequestUser },
    @Res() res: Response,
  ) {
    await this.logReportExport(req, 'pdf', 'pendientes_revision');
    const items = await this.service.findPendientesRevision(req.user);

    const filename = `pendientes_revision_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.on('error', () => {
      if (!res.headersSent) {
        throw new InternalServerErrorException('Error generando PDF');
      }
    });
    doc.pipe(res);

    doc.fontSize(16).text('Pendientes de revisión', { align: 'left' });
    doc.moveDown(0.25);
    doc
      .fontSize(9)
      .fillColor('gray')
      .text(
        `Generado: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} — ${req.hostname}`,
      );
    doc.fillColor('black');
    doc.moveDown(0.75);

    doc.fontSize(10);
    for (const d of items) {
      doc
        .font('Helvetica-Bold')
        .text(`${d.codigo} — ${d.asunto}`, { continued: false });
      doc
        .font('Helvetica')
        .text(
          `Fecha: ${d.fechaDocumento.toISOString().slice(0, 10)} | Estado: ${
            d.estado
          } | Conf.: ${d.nivelConfidencialidad} | Dep.: ${
            d.dependenciaCodigo
          } | Adjuntos: ${d.archivosActivos}`,
        );
      doc
        .fillColor('gray')
        .text(
          `${d.tipoDocumental} | ${d.clasificacion} | Creado por: ${d.createdBy}`,
        )
        .fillColor('black');
      if (d.descripcion) {
        doc
          .fillColor('gray')
          .text(d.descripcion, { lineGap: 1 })
          .fillColor('black');
      }
      doc.moveDown(0.6);
      if (doc.y > 760) {
        doc.addPage();
      }
    }

    doc.end();
  }

  @Get('documentos.xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportDocumentosExcel(
    @Req() req: Request & { user: JwtRequestUser },
    @Res() res: Response,
    @Query('incluirInactivos') incluirInactivos?: string,
    @Query('q') q?: string,
    @Query('archivoNombre') archivoNombre?: string,
    @Query('archivoMime') archivoMime?: string,
    @Query('archivoSha256') archivoSha256?: string,
    @Query('estado') estado?: string,
    @Query('tipoDocumentalId') tipoDocumentalId?: string,
    @Query('dependenciaId') dependenciaId?: string,
    @Query('serieId') serieId?: string,
    @Query('subserieId') subserieId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('sortBy') sortBy?: 'codigo' | 'fechaDocumento' | 'estado',
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    await this.logReportExport(req, 'xlsx', 'documentos');
    const items = await this.service.findDocumentos(
      {
        incluirInactivos: this.parseBool(incluirInactivos),
        q,
        archivoNombre,
        archivoMime,
        archivoSha256,
        estado,
        tipoDocumentalId,
        dependenciaId,
        serieId,
        subserieId,
        fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
        fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
        sortBy,
        sortDir,
      },
      req.user,
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SGD-GADPR-LM';
    const ws = wb.addWorksheet('Documentos');
    ws.columns = [
      { header: 'Código', key: 'codigo', width: 18 },
      { header: 'Asunto', key: 'asunto', width: 40 },
      { header: 'Fecha', key: 'fechaDocumento', width: 14 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Confidencialidad', key: 'nivelConfidencialidad', width: 16 },
      { header: 'Dependencia', key: 'dependenciaCodigo', width: 16 },
      { header: 'Activo', key: 'activo', width: 10 },
      { header: 'Tipo documental', key: 'tipoDocumental', width: 28 },
      { header: 'Clasificación', key: 'clasificacion', width: 30 },
      { header: 'Adjuntos', key: 'archivosActivos', width: 10 },
      { header: 'Creado por', key: 'createdBy', width: 22 },
      { header: 'Creado el', key: 'createdAt', width: 20 },
    ];
    ws.getRow(1).font = { bold: true };

    for (const d of items) {
      ws.addRow({
        codigo: d.codigo,
        asunto: d.asunto,
        fechaDocumento: d.fechaDocumento.toISOString().slice(0, 10),
        estado: d.estado,
        nivelConfidencialidad: d.nivelConfidencialidad,
        dependenciaCodigo: d.dependenciaCodigo,
        activo: d.activo ? 'Sí' : 'No',
        tipoDocumental: d.tipoDocumental,
        clasificacion: d.clasificacion,
        archivosActivos: d.archivosActivos,
        createdBy: d.createdBy,
        createdAt: d.createdAt.toISOString().replace('T', ' ').slice(0, 19),
      });
    }

    const filename = `documentos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('documentos.pdf')
  @Header('Content-Type', 'application/pdf')
  async exportDocumentosPdf(
    @Req() req: Request & { user: JwtRequestUser },
    @Res() res: Response,
    @Query('incluirInactivos') incluirInactivos?: string,
    @Query('q') q?: string,
    @Query('archivoNombre') archivoNombre?: string,
    @Query('archivoMime') archivoMime?: string,
    @Query('archivoSha256') archivoSha256?: string,
    @Query('estado') estado?: string,
    @Query('tipoDocumentalId') tipoDocumentalId?: string,
    @Query('dependenciaId') dependenciaId?: string,
    @Query('serieId') serieId?: string,
    @Query('subserieId') subserieId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('sortBy') sortBy?: 'codigo' | 'fechaDocumento' | 'estado',
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    await this.logReportExport(req, 'pdf', 'documentos');
    const items = await this.service.findDocumentos(
      {
        incluirInactivos: this.parseBool(incluirInactivos),
        q,
        archivoNombre,
        archivoMime,
        archivoSha256,
        estado,
        tipoDocumentalId,
        dependenciaId,
        serieId,
        subserieId,
        fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
        fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
        sortBy,
        sortDir,
      },
      req.user,
    );

    const filename = `documentos_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.on('error', () => {
      if (!res.headersSent) {
        throw new InternalServerErrorException('Error generando PDF');
      }
    });
    doc.pipe(res);

    doc.fontSize(16).text('Reporte de documentos', { align: 'left' });
    doc.moveDown(0.25);
    doc
      .fontSize(9)
      .fillColor('gray')
      .text(
        `Generado: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} — ${req.hostname}`,
      );
    doc.fillColor('black');
    doc.moveDown(0.75);

    doc.fontSize(10);
    for (const d of items) {
      doc
        .font('Helvetica-Bold')
        .text(`${d.codigo} — ${d.asunto}`, { continued: false });
      doc
        .font('Helvetica')
        .text(
          `Fecha: ${d.fechaDocumento.toISOString().slice(0, 10)} | Estado: ${
            d.estado
          } | Conf.: ${d.nivelConfidencialidad} | Dep.: ${
            d.dependenciaCodigo
          } | Adjuntos: ${d.archivosActivos}`,
        );
      doc
        .fillColor('gray')
        .text(
          `${d.tipoDocumental} | ${d.clasificacion} | Creado por: ${d.createdBy}`,
        )
        .fillColor('black');
      if (d.descripcion) {
        doc
          .fillColor('gray')
          .text(d.descripcion, { lineGap: 1 })
          .fillColor('black');
      }
      doc.moveDown(0.6);
      if (doc.y > 760) {
        doc.addPage();
      }
    }

    doc.end();
  }

  @Get('auditoria.xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportAuditoriaExcel(
    @Req() req: Request & { user: JwtRequestUser },
    @Res() res: Response,
    @Query('action') action?: string,
    @Query('result') result?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.logReportExport(req, 'xlsx', 'auditoria');
    const items = await this.service.findAuditLogs({
      action,
      result,
      actorUserId,
      actorEmail,
      resourceType,
      resourceId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SGD-GADPR-LM';
    const ws = wb.addWorksheet('Auditoria');
    ws.columns = [
      { header: 'Fecha UTC', key: 'createdAt', width: 20 },
      { header: 'Acción', key: 'action', width: 26 },
      { header: 'Resultado', key: 'result', width: 10 },
      { header: 'Actor email', key: 'actorEmail', width: 28 },
      { header: 'IP', key: 'ip', width: 16 },
      { header: 'Recurso tipo', key: 'resourceType', width: 20 },
      { header: 'Recurso id', key: 'resourceId', width: 24 },
      { header: 'Documento código', key: 'resourceCodigo', width: 22 },
      { header: 'Meta (JSON)', key: 'metaJson', width: 50 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const row of items) {
      ws.addRow({
        createdAt: row.createdAt.toISOString().replace('T', ' ').slice(0, 19),
        action: row.action,
        result: row.result,
        actorEmail: row.actorEmail ?? '',
        ip: row.ip ?? '',
        resourceType: row.resourceType ?? '',
        resourceId: row.resourceId ?? '',
        resourceCodigo: row.resourceCodigo ?? '',
        metaJson: row.metaJson ?? '',
      });
    }

    const filename = `auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('auditoria.pdf')
  @Header('Content-Type', 'application/pdf')
  async exportAuditoriaPdf(
    @Req() req: Request & { user: JwtRequestUser },
    @Res() res: Response,
    @Query('action') action?: string,
    @Query('result') result?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.logReportExport(req, 'pdf', 'auditoria');
    const items = await this.service.findAuditLogs({
      action,
      result,
      actorUserId,
      actorEmail,
      resourceType,
      resourceId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    const filename = `auditoria_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.on('error', () => {
      if (!res.headersSent) {
        throw new InternalServerErrorException('Error generando PDF');
      }
    });
    doc.pipe(res);
    doc.fontSize(14).text('Reporte de auditoría (seguridad / trazabilidad)', {
      align: 'left',
    });
    doc.moveDown(0.25);
    doc
      .fontSize(8)
      .fillColor('gray')
      .text(
        `Generado: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`,
      );
    doc.fillColor('black');
    doc.moveDown(0.6);
    doc.fontSize(9);
    for (const row of items) {
      doc
        .font('Helvetica-Bold')
        .text(`${row.createdAt.toISOString().slice(0, 19)} — ${row.action}`, {
          continued: false,
        });
      doc
        .font('Helvetica')
        .text(
          `Resultado: ${row.result} | Actor: ${row.actorEmail ?? '—'} | IP: ${row.ip ?? '—'}`,
        );
      doc
        .fillColor('gray')
        .text(
          `Recurso: ${row.resourceType ?? '—'} / ${row.resourceId ?? '—'} · Código doc.: ${row.resourceCodigo ?? '—'}`,
        )
        .fillColor('black');
      doc.moveDown(0.35);
      if (doc.y > 760) doc.addPage();
    }
    doc.end();
  }
}
