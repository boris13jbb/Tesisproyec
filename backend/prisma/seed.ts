import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  ALL_PERMISSION_CODES,
  PERM_DESCRIPTIONS,
  PERM,
} from '../src/auth/permission-codes';
import { ROLE_SUPERADMIN } from '../src/auth/role-constants';

const prisma = new PrismaClient();

/** Permisos y matriz rol ↔ permiso (idempotente; alineado con `PermissionsGuard`). */
async function seedRolePermissions(): Promise<void> {
  for (const codigo of ALL_PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { codigo },
      create: { codigo, descripcion: PERM_DESCRIPTIONS[codigo] },
      update: { descripcion: PERM_DESCRIPTIONS[codigo] },
    });
  }

  const rows = await prisma.permission.findMany({ select: { id: true, codigo: true } });
  const permissionIdByCode = new Map(rows.map((p) => [p.codigo, p.id]));

  const replaceForRole = async (roleCodigo: string, codes: readonly string[]) => {
    const role = await prisma.role.findUnique({ where: { codigo: roleCodigo } });
    if (!role) return;
    const data = codes
      .map((c) => {
        const permissionId = permissionIdByCode.get(c);
        return permissionId ? { roleId: role.id, permissionId } : null;
      })
      .filter((x): x is { roleId: string; permissionId: string } => x !== null);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (data.length) {
      await prisma.rolePermission.createMany({ data });
    }
  };

  // DOC_UNLOCK: solo SUPERADMIN por rol; ADMIN lo recibe únicamente por delegación directa.
  const adminRoleCodes = ALL_PERMISSION_CODES.filter(
    (c) => c !== PERM.DOC_UNLOCK,
  );
  await replaceForRole('ADMIN', adminRoleCodes);

  const auditorConsultaBase = [
    PERM.DASHBOARD_SUMMARY,
    PERM.DOC_READ,
    PERM.DOC_FILES_READ,
    PERM.DOC_FILES_DOWNLOAD,
  ];
  await replaceForRole('AUDITOR', auditorConsultaBase);
  await replaceForRole('CONSULTA', auditorConsultaBase);

  await replaceForRole('USUARIO', [
    ...auditorConsultaBase,
    PERM.DOC_CREATE,
    PERM.DOC_UPDATE,
    PERM.DOC_FILES_UPLOAD,
    PERM.DOC_REVISION_SEND,
  ]);

  await replaceForRole('EDITOR_DOC', [
    ...auditorConsultaBase,
    PERM.DOC_REVISION_SEND,
    PERM.DOC_UPDATE,
    PERM.DOC_FILES_UPLOAD,
  ]);

  await replaceForRole('REVISOR', [
    ...auditorConsultaBase,
    PERM.DOC_REVISION_SEND,
    PERM.DOC_REVISION_RESOLVE,
    PERM.REPORTS_PENDIENTES,
  ]);

  await replaceForRole(ROLE_SUPERADMIN, ALL_PERMISSION_CODES);
}

async function main() {
  const email =
    process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? 'admin@local.test';
  const password =
    process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

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
      descripcion:
        'Usuario operativo: puede registrar, editar, adjuntar, descargar y enviar documentos a revisión según su ámbito de acceso.',
      activo: true,
    },
    update: {
      descripcion:
        'Usuario operativo: puede registrar, editar, adjuntar, descargar y enviar documentos a revisión según su ámbito de acceso.',
    },
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

  await prisma.role.upsert({
    where: { codigo: ROLE_SUPERADMIN },
    create: {
      codigo: ROLE_SUPERADMIN,
      nombre: 'Superadministrador',
      descripcion:
        'Cuenta técnica de mantenimiento y contingencia (no asignación cotidiana)',
      activo: true,
    },
    update: {},
  });

  /** Complementario: combinar con USUARIO vía multi-rol para perfiles especiales; USUARIO ya incluye crear/editar/subir por defecto. */
  await prisma.role.upsert({
    where: { codigo: 'EDITOR_DOC' },
    create: {
      codigo: 'EDITOR_DOC',
      nombre: 'Editor documental (complemento)',
      descripcion:
        'Otorga edición de metadatos y gestión de archivos en documentos; permisos granulares vía BD (no es administrador)',
      activo: true,
    },
    update: {},
  });

  await seedRolePermissions();

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

  const superRole = await prisma.role.findUnique({
    where: { codigo: ROLE_SUPERADMIN },
  });
  const superEmail =
    process.env.SEED_SUPERADMIN_EMAIL?.trim().toLowerCase() ??
    'superadmin@local.test';
  const superPassword =
    process.env.SEED_SUPERADMIN_PASSWORD ?? 'SuperAdmin123!';
  if (superPassword.length < 8) {
    throw new Error('SEED_SUPERADMIN_PASSWORD debe tener al menos 8 caracteres');
  }
  const superHash = await argon2.hash(superPassword, { type: argon2.argon2id });
  const superUser = await prisma.user.upsert({
    where: { email: superEmail },
    create: {
      email: superEmail,
      passwordHash: superHash,
      nombres: 'Super',
      apellidos: 'Administrador',
      activo: true,
    },
    update: {
      passwordHash: superHash,
      activo: true,
    },
  });
  if (superRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: superUser.id, roleId: superRole.id },
      },
      create: { userId: superUser.id, roleId: superRole.id },
      update: {},
    });
  }

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

  const tipoMemo = await prisma.tipoDocumental.findUnique({
    where: { codigo: 'MEMO' },
  });

  if (tipoMemo) {
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
        createdById: user.id,
      },
      update: {},
    });
  }

  console.log(
    `Seed OK: ADMIN ${email}; SUPERADMIN ${superEmail}; permisos RBAC; catálogos y documento de ejemplo`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
