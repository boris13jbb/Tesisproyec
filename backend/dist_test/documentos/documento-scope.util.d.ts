import type { Prisma } from '@prisma/client';
import { JwtRequestUser } from '../auth/request-user';
export declare function documentoVisibilityWhere(viewer: JwtRequestUser): Prisma.DocumentoWhereInput | undefined;
export declare function assertUsuarioPuedeVerDocumento(row: {
    nivelConfidencialidad: string;
    dependenciaId: string | null;
    createdById: string;
}, viewer: JwtRequestUser): void;
