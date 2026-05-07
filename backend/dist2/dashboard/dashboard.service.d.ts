import { PrismaService } from '../prisma/prisma.service';
import type { JwtRequestUser } from '../auth/request-user';
export type DashboardRecentDocumento = {
    id: string;
    codigo: string;
    asunto: string;
    estado: string;
    fechaDocumento: string;
};
export type DashboardComplianceMetric = {
    key: 'access_control' | 'identity_management' | 'authentication_information' | 'document_traceability' | 'input_validation';
    title: string;
    standard: string;
    percent: number;
    evidence: Record<string, number | string | null>;
};
export type DashboardSummary = {
    generatedAt: string;
    kpis: {
        documentosTotal: number;
        pendientesRevision: number;
        usuariosActivos: number | null;
        alertas: number;
    };
    documentosRecientes: DashboardRecentDocumento[];
    compliance: DashboardComplianceMetric[];
    lastSignals: {
        lastAuditAt: string | null;
        lastLoginOkAt: string | null;
    };
};
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSummary(viewer: JwtRequestUser): Promise<DashboardSummary>;
}
