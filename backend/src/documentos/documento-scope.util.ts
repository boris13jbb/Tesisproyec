import type { Prisma } from '@prisma/client';
import { JwtRequestUser, jwtUserIsAdmin } from '../auth/request-user';

/**
 * Reglas anti‑IDOR (dependencia + confidencialidad + ACL por documento).
 * Solo ADMIN omite filtro en listados.
 *
 * ACL:
 * - Documento.accessPolicy = INHERIT: aplica reglas clásicas (dependencia/confidencialidad/propiedad).
 * - Documento.accessPolicy = RESTRICTED: solo creador + entradas en ACL (user/role).
 */
export function documentoVisibilityWhere(
  viewer: JwtRequestUser,
): Prisma.DocumentoWhereInput | undefined {
  if (jwtUserIsAdmin(viewer)) return undefined;
  const viewerRoleCodes = viewer.roles.map((r) => r.codigo);

  const inheritOr: Prisma.DocumentoWhereInput[] = [
    { nivelConfidencialidad: 'PUBLICO' },
    { createdById: viewer.id },
  ];
  if (viewer.dependenciaId) {
    inheritOr.push({
      AND: [
        { dependenciaId: viewer.dependenciaId },
        { nivelConfidencialidad: { in: ['INTERNO', 'RESERVADO'] } },
      ],
    });
  }

  const restrictedOr: Prisma.DocumentoWhereInput[] = [
    { createdById: viewer.id },
    { userAccess: { some: { userId: viewer.id, access: 'READ' } } },
  ];
  if (viewerRoleCodes.length) {
    restrictedOr.push({
      roleAccess: {
        some: { role: { codigo: { in: viewerRoleCodes } }, access: 'READ' },
      },
    });
  }

  return {
    OR: [
      { AND: [{ accessPolicy: { not: 'RESTRICTED' } }, { OR: inheritOr }] },
      { AND: [{ accessPolicy: 'RESTRICTED' }, { OR: restrictedOr }] },
    ],
  };
}
