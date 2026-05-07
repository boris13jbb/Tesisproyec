import { PrismaService } from './prisma/prisma.service';
export declare class AppController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    adminPing(): {
        ok: boolean;
        scope: string;
    };
    health(): Promise<{
        status: string;
        service: string;
        database: 'up' | 'down';
    }>;
}
