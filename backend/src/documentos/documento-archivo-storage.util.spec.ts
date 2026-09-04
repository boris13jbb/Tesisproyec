import { BadRequestException, NotFoundException } from '@nestjs/common';
import os from 'os';
import path from 'path';
import {
  assertPdfFilenameAndMime,
  buildDocumentoArchivoPathRel,
  buildStoredPdfName,
  downloadContentType,
  DOCUMENTO_ARCHIVO_MIME_PDF,
  resolveStoragePathOrThrow,
  safeContentDispositionFilename,
  sanitizeOriginalName,
} from './documento-archivo-storage.util';

describe('documento-archivo-storage.util', () => {
  const root = path.join(os.tmpdir(), 'sgd-storage-qa');

  it('sanitizeOriginalName no conserva separadores ni CRLF', () => {
    expect(sanitizeOriginalName('../../archivo.pdf')).not.toContain('..');
    expect(sanitizeOriginalName('..\\..\\archivo.pdf')).not.toMatch(/[\\/]/);
    expect(sanitizeOriginalName('a\r\n.pdf')).not.toMatch(/[\r\n]/);
    expect(sanitizeOriginalName('archivo con espacios.pdf')).toContain(' ');
    expect(sanitizeOriginalName('<script>.pdf')).not.toContain('<');
  });

  it('originalname no define el nombre físico (UUID.pdf)', () => {
    const stored = buildStoredPdfName('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(stored).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf');
    expect(stored).not.toContain('contrato');
    const rel = buildDocumentoArchivoPathRel(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      stored,
    );
    expect(rel).toBe(
      'documentos/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf',
    );
  });

  it('resolveStoragePathOrThrow rechaza traversal y absolutos', () => {
    expect(() => resolveStoragePathOrThrow(root, '../outside.pdf')).toThrow(
      NotFoundException,
    );
    expect(() => resolveStoragePathOrThrow(root, '..\\outside.pdf')).toThrow(
      NotFoundException,
    );
    expect(() =>
      resolveStoragePathOrThrow(root, 'C:\\Windows\\file.pdf'),
    ).toThrow(NotFoundException);
    expect(() =>
      resolveStoragePathOrThrow(root, '\\\\server\\share\\file.pdf'),
    ).toThrow(NotFoundException);
    expect(() => resolveStoragePathOrThrow(root, '/etc/passwd')).toThrow(
      NotFoundException,
    );
    expect(() =>
      resolveStoragePathOrThrow(root, 'documentos/id/../../etc/passwd'),
    ).toThrow(NotFoundException);
    expect(() => resolveStoragePathOrThrow(root, 'a\0b.pdf')).toThrow(
      NotFoundException,
    );
  });

  it('pathRel legítimo queda bajo el root', () => {
    const abs = resolveStoragePathOrThrow(
      root,
      'documentos/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf',
    );
    expect(abs.startsWith(path.resolve(root))).toBe(true);
    expect(abs.includes('..')).toBe(false);
  });

  it('assertPdfFilenameAndMime exige .pdf + MIME real', () => {
    expect(() =>
      assertPdfFilenameAndMime('ok.pdf', DOCUMENTO_ARCHIVO_MIME_PDF),
    ).not.toThrow();
    expect(() => assertPdfFilenameAndMime('ok.pdf', '')).toThrow(
      BadRequestException,
    );
    expect(() =>
      assertPdfFilenameAndMime('ok.exe', DOCUMENTO_ARCHIVO_MIME_PDF),
    ).toThrow(BadRequestException);
    expect(() =>
      assertPdfFilenameAndMime('doc.pdf.exe', DOCUMENTO_ARCHIVO_MIME_PDF),
    ).toThrow(BadRequestException);
    expect(() =>
      assertPdfFilenameAndMime('malware.exe.pdf', DOCUMENTO_ARCHIVO_MIME_PDF),
    ).toThrow(BadRequestException);
    expect(() => assertPdfFilenameAndMime('x.pdf', 'text/html')).toThrow(
      BadRequestException,
    );
    expect(() =>
      assertPdfFilenameAndMime('../../a.pdf', DOCUMENTO_ARCHIVO_MIME_PDF),
    ).toThrow(BadRequestException);
  });

  it('Content-Disposition filename sin inyección de cabecera', () => {
    const fn = safeContentDispositionFilename('a";\r\nfilename=x.pdf');
    expect(fn).not.toMatch(/[\r\n]/);
    expect(fn).not.toContain('"');
    expect(downloadContentType('text/html')).toBe('application/octet-stream');
    expect(downloadContentType(DOCUMENTO_ARCHIVO_MIME_PDF)).toBe(
      DOCUMENTO_ARCHIVO_MIME_PDF,
    );
  });
});
