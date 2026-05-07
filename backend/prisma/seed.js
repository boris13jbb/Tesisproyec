"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const prisma = new client_1.PrismaClient();
async function main() {
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? 'admin@local.test';
    const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
    if (password.length < 8) {
        throw new Error('SEED_ADMIN_PASSWORD debe tener al menos 8 caracteres');
    }
    const adminRole = await prisma.role.upsert({
        where: { codigo: 'ADMIN' },
        create: {
            codigo: 'ADMIN',
            nombre: 'Administrador',
            descripcion: 'Acceso completo al sistema (prototipo)',
            activo: true,
        },
        update: {},
    });
    await prisma.role.upsert({
        where: { codigo: 'USUARIO' },
        create: {
            codigo: 'USUARIO',
            nombre: 'Usuario',
            descripcion: 'Usuario estándar',
            activo: true,
        },
        update: {},
    });
    await prisma.role.upsert({
        where: { codigo: 'REVISOR' },
        create: {
            codigo: 'REVISOR',
            nombre: 'Revisor',
            descripcion: 'Revisor documental (MVP mismo alcance lectura que USUARIO hasta flujo formal)',
            activo: true,
        },
        update: {},
    });
    await prisma.role.upsert({
        where: { codigo: 'AUDITOR' },
        create: {
            codigo: 'AUDITOR',
            nombre: 'Auditor',
            descripcion: 'Auditor interno — consultas (UI auditoría ADMIN compartido por ahora)',
            activo: true,
        },
        update: {},
    });
    await prisma.role.upsert({
        where: { codigo: 'CONSULTA' },
        create: {
            codigo: 'CONSULTA',
            nombre: 'Consulta',
            descripcion: 'Solo lectura / consulta (MVP igual a USUARIO)',
            activo: true,
        },
        update: {},
    });
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.upsert({
        where: { email },
        create: {
            email,
            passwordHash,
            nombres: 'Admin',
            apellidos: 'Sistema',
            activo: true,
        },
        update: {
            passwordHash,
            activo: true,
        },
    });
    await prisma.userRole.upsert({
        where: {
            userId_roleId: { userId: user.id, roleId: adminRole.id },
        },
        create: {
            userId: user.id,
            roleId: adminRole.id,
        },
        update: {},
    });
    await prisma.dependencia.upsert({
        where: { codigo: 'GADPR-LM' },
        create: {
            codigo: 'GADPR-LM',
            nombre: 'Gobierno Autónomo Descentralizado Provincial de Los Ríos',
            descripcion: 'Dependencia de ejemplo (seed)',
            activo: true,
        },
        update: {},
    });
    await prisma.dependencia.upsert({
        where: { codigo: 'SGD' },
        create: {
            codigo: 'SGD',
            nombre: 'Sistema de Gestión Documental',
            descripcion: 'Unidad de gestión documental (ejemplo)',
            activo: true,
        },
        update: {},
    });
    const depGadpr = await prisma.dependencia.findUnique({
        where: { codigo: 'GADPR-LM' },
    });
    await prisma.user.update({
        where: { id: user.id },
        data: { dependenciaId: depGadpr?.id ?? null },
    });
    await prisma.cargo.upsert({
        where: { codigo: 'DIR-GEN' },
        create: {
            codigo: 'DIR-GEN',
            nombre: 'Director/a general (ejemplo)',
            descripcion: 'Cargo de seed',
            dependenciaId: depGadpr?.id ?? null,
            activo: true,
        },
        update: {},
    });
    await prisma.cargo.upsert({
        where: { codigo: 'ASIST' },
        create: {
            codigo: 'ASIST',
            nombre: 'Asistente administrativo (ejemplo)',
            descripcion: 'Cargo sin dependencia fija (ejemplo)',
            dependenciaId: null,
            activo: true,
        },
        update: {},
    });
    await prisma.tipoDocumental.upsert({
        where: { codigo: 'MEMO' },
        create: {
            codigo: 'MEMO',
            nombre: 'Memorando',
            descripcion: 'Tipo documental de ejemplo (seed)',
            activo: true,
        },
        update: {},
    });
    await prisma.tipoDocumental.upsert({
        where: { codigo: 'OFICIO' },
        create: {
            codigo: 'OFICIO',
            nombre: 'Oficio',
            descripcion: 'Tipo documental de ejemplo (seed)',
            activo: true,
        },
        update: {},
    });
    const serieAdm = await prisma.serie.upsert({
        where: { codigo: 'ADM' },
        create: {
            codigo: 'ADM',
            nombre: 'Administración',
            descripcion: 'Serie de ejemplo (seed)',
            activo: true,
        },
        update: {},
    });
    await prisma.subserie.upsert({
        where: { codigo: 'ADM-CORR' },
        create: {
            codigo: 'ADM-CORR',
            nombre: 'Correspondencia',
            descripcion: 'Subserie de ejemplo (seed)',
            serieId: serieAdm.id,
            activo: true,
        },
        update: {},
    });
    const tipoMemo = await prisma.tipoDocumental.findUnique({
        where: { codigo: 'MEMO' },
    });
    const subAdmCorr = await prisma.subserie.findUnique({
        where: { codigo: 'ADM-CORR' },
    });
    if (tipoMemo && subAdmCorr) {
        await prisma.documento.upsert({
            where: { codigo: 'DOC-0001' },
            create: {
                codigo: 'DOC-0001',
                asunto: 'Documento de ejemplo (seed)',
                descripcion: 'Registro documental inicial para pruebas',
                fechaDocumento: new Date(),
                estado: 'REGISTRADO',
                activo: true,
                tipoDocumentalId: tipoMemo.id,
                subserieId: subAdmCorr.id,
                createdById: user.id,
            },
            update: {},
        });
    }
    console.log(`Seed OK: usuario ${email} con rol ADMIN; catálogos y documento de ejemplo`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map