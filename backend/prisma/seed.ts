import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email =
    process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? 'admin@local.test';
  const password =
    process.env.SEED_ADMIN_PASSWORD ?? 'AdminSeguro2026!';

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

  console.log(
    `Seed OK: usuario ${email} con rol ADMIN; dependencias y cargos de ejemplo`,
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
