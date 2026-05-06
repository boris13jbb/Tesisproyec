import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { JwtRequestUser, jwtUserIsAdmin } from '../auth/request-user';

/** Reglas anti‑IDOR (dependencia + confidencialidad). Solo ADMIN omite filtro en listados. */
export function documentoVisibilityWhere(
  viewer: JwtRequestUser,
): Prisma.DocumentoWhereInput | undefined {
  if (jwtUserIsAdmin(viewer)) return undefined;
  const or: Prisma.DocumentoWhereInput[] = [
    { nivelConfidencialidad: 'PUBLICO' },
    { createdById: viewer.id },
  ];
  if (viewer.dependenciaId) {
    or.push({
      AND: [
        { dependenciaId: viewer.dependenciaId },
        { nivelConfidencialidad: { in: ['INTERNO', 'RESERVADO'] } },
      ],
    });
  }
  return { OR: or };
}

/** Misma regla que listado; oculta existencia (404) por convención anti‑IDOR. */
export function assertUsuarioPuedeVerDocumento(
  row: {
    nivelConfidencialidad: string;
    dependenciaId: string | null;
    createdById: string;
  },
  viewer: JwtRequestUser,
): void {
  if (jwtUserIsAdmin(viewer)) return;
  if (row.nivelConfidencialidad === 'CONFIDENCIAL') {
    throw new NotFoundException('Documento no encontrado');
  }
  if (row.nivelConfidencialidad === 'PUBLICO') return;
  if (row.createdById === viewer.id) return;
  if (
    viewer.dependenciaId &&
    row.dependenciaId === viewer.dependenciaId &&
    (row.nivelConfidencialidad === 'INTERNO' ||
      row.nivelConfidencialidad === 'RESERVADO')
  ) {
    return;
  }
  throw new NotFoundException('Documento no encontrado');
}
