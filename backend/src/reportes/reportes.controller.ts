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
import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  private parseBool(v?: string) {
    return v === 'true' || v === '1';
  }

  @Get('documentos.xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportDocumentosExcel(
    @Res() res: Response,
    @Query('incluirInactivos') incluirInactivos?: string,
    @Query('q') q?: string,
    @Query('archivoNombre') archivoNombre?: string,
    @Query('archivoMime') archivoMime?: string,
    @Query('archivoSha256') archivoSha256?: string,
    @Query('estado') estado?: string,
    @Query('tipoDocumentalId') tipoDocumentalId?: string,
    @Query('serieId') serieId?: string,
    @Query('subserieId') subserieId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('sortBy') sortBy?: 'codigo' | 'fechaDocumento' | 'estado',
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    const items = await this.service.findDocumentos({
      incluirInactivos: this.parseBool(incluirInactivos),
      q,
      archivoNombre,
      archivoMime,
      archivoSha256,
      estado,
      tipoDocumentalId,
      serieId,
      subserieId,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      sortBy,
      sortDir,
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SGD-GADPR-LM';
    const ws = wb.addWorksheet('Documentos');
    ws.columns = [
      { header: 'Código', key: 'codigo', width: 18 },
      { header: 'Asunto', key: 'asunto', width: 40 },
      { header: 'Fecha', key: 'fechaDocumento', width: 14 },
      { header: 'Estado', key: 'estado', width: 14 },
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
    @Req() req: Request,
    @Res() res: Response,
    @Query('incluirInactivos') incluirInactivos?: string,
    @Query('q') q?: string,
    @Query('archivoNombre') archivoNombre?: string,
    @Query('archivoMime') archivoMime?: string,
    @Query('archivoSha256') archivoSha256?: string,
    @Query('estado') estado?: string,
    @Query('tipoDocumentalId') tipoDocumentalId?: string,
    @Query('serieId') serieId?: string,
    @Query('subserieId') subserieId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('sortBy') sortBy?: 'codigo' | 'fechaDocumento' | 'estado',
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    const items = await this.service.findDocumentos({
      incluirInactivos: this.parseBool(incluirInactivos),
      q,
      archivoNombre,
      archivoMime,
      archivoSha256,
      estado,
      tipoDocumentalId,
      serieId,
      subserieId,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      sortBy,
      sortDir,
    });

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
}
