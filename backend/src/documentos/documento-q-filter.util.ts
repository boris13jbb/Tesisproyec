import type { Prisma } from '@prisma/client';

/**
 * Fragmento `OR` para búsqueda libre (`q`) alineado con la bandeja documental:
 * texto en metadatos del documento, dependencia aplicada, quien registra,
 * tipo/subserie/serie documental.
 */
export function documentoWhereLibre(
  qRaw: string | undefined,
): Prisma.DocumentoWhereInput {
  const q = qRaw?.trim();
  if (!q) return {};

  return {
    OR: [
      { codigo: { contains: q } },
      { asunto: { contains: q } },
      { descripcion: { contains: q } },
      {
        dependencia: {
          OR: [{ nombre: { contains: q } }, { codigo: { contains: q } }],
        },
      },
      {
        createdBy: {
          OR: [
            { email: { contains: q } },
            { nombres: { contains: q } },
            { apellidos: { contains: q } },
          ],
        },
      },
      {
        tipoDocumental: {
          OR: [{ nombre: { contains: q } }, { codigo: { contains: q } }],
        },
      },
      {
        subserie: {
          OR: [
            { nombre: { contains: q } },
            { codigo: { contains: q } },
            {
              serie: {
                OR: [{ nombre: { contains: q } }, { codigo: { contains: q } }],
              },
            },
          ],
        },
      },
    ],
  };
}
