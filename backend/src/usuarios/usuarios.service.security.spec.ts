import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AuditService } from '../auditoria/audit.service';
import { PERM } from '../auth/permission-codes';
import { PasswordPolicyService } from '../auth/password-policy.service';
import { PermissionsService } from '../auth/permissions.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsuariosService } from './usuarios.service';

/**
 * Seguridad IAM: SUPERADMIN, escalamiento, USERS_DISABLE, sanitize, sesiones.
 */
describe('UsuariosService — seguridad (RBAC / SUPERADMIN)', () => {
  const adminActorId = 'actor-admin';
  const superId = 'user-super';
  const targetId = 'user-target';

  let service: UsuariosService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    role: { findMany: jest.Mock };
    userRole: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    userPermission: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    refreshToken: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let permissions: { getCodesForUserId: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      role: { findMany: jest.fn() },
      userRole: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      userPermission: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn(),
    };
    permissions = {
      getCodesForUserId: jest
        .fn()
        .mockResolvedValue(
          new Set([
            PERM.USERS_READ,
            PERM.USERS_UPDATE,
            PERM.USERS_DISABLE,
            PERM.USERS_CREATE,
          ]),
        ),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PasswordPolicyService,
          useValue: {
            assertPasswordNotReused: jest.fn(),
            recordPasswordChange: jest.fn(),
            assertMeetsPolicy: jest.fn(),
          },
        },
        { provide: AuditService, useValue: audit },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
        {
          provide: MailService,
          useValue: { isConfigured: () => false, sendPasswordReset: jest.fn() },
        },
        { provide: PermissionsService, useValue: permissions },
      ],
    }).compile();

    service = moduleRef.get(UsuariosService);
  });

  function mockAdminActorRoles() {
    prisma.userRole.findMany.mockResolvedValue([{ role: { codigo: 'ADMIN' } }]);
  }

  function mockExistingUser(opts: {
    id: string;
    roles: string[];
    activo?: boolean;
    email?: string;
  }) {
    prisma.user.findUnique.mockResolvedValue({
      id: opts.id,
      email: opts.email ?? 't@local.test',
      passwordHash: 'hash',
      nombres: 'T',
      apellidos: 'U',
      dependenciaId: null,
      cargoId: null,
      activo: opts.activo ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: opts.roles.map((codigo) => ({
        role: { codigo, nombre: codigo },
      })),
    });
  }

  it('ADMIN no desactiva SUPERADMIN', async () => {
    mockAdminActorRoles();
    mockExistingUser({ id: superId, roles: ['SUPERADMIN'] });
    await expect(
      service.update(
        superId,
        { activo: false },
        { actorUserId: adminActorId, actorEmail: 'admin@local.test' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ADMIN no asigna SUPERADMIN a otro usuario', async () => {
    mockAdminActorRoles();
    mockExistingUser({ id: targetId, roles: ['USUARIO'] });
    await expect(
      service.update(
        targetId,
        { roles: ['SUPERADMIN'] },
        { actorUserId: adminActorId, actorEmail: 'admin@local.test' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ADMIN no crea usuario SUPERADMIN', async () => {
    mockAdminActorRoles();
    await expect(
      service.create(
        {
          email: 'evil@local.test',
          password: 'SecurePass1!',
          roles: ['SUPERADMIN'],
        },
        { actorUserId: adminActorId, actorEmail: 'admin@local.test' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ADMIN no autoescala a SUPERADMIN', async () => {
    mockAdminActorRoles();
    mockExistingUser({
      id: adminActorId,
      roles: ['ADMIN'],
      email: 'admin@local.test',
    });
    await expect(
      service.update(
        adminActorId,
        { roles: ['SUPERADMIN'] },
        { actorUserId: adminActorId, actorEmail: 'admin@local.test' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sin USERS_DISABLE no puede cambiar activo', async () => {
    mockAdminActorRoles();
    mockExistingUser({ id: targetId, roles: ['USUARIO'], activo: true });
    permissions.getCodesForUserId.mockResolvedValue(
      new Set([PERM.USERS_READ, PERM.USERS_UPDATE]),
    );
    await expect(
      service.update(
        targetId,
        { activo: false },
        { actorUserId: adminActorId, actorEmail: 'admin@local.test' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('con USERS_DISABLE desactiva y revoca refresh tokens', async () => {
    mockAdminActorRoles();
    mockExistingUser({ id: targetId, roles: ['USUARIO'], activo: true });
    const updatedRow = {
      id: targetId,
      email: 't@local.test',
      nombres: 'T',
      apellidos: 'U',
      dependenciaId: null,
      cargoId: null,
      activo: false,
      ultimoLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: [{ role: { codigo: 'USUARIO', nombre: 'Usuario' } }],
      directPermissions: [],
    };
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({}),
            findUniqueOrThrow: jest.fn().mockResolvedValue(updatedRow),
          },
          userRole: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
          userPermission: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        };
        return fn(tx);
      },
    );

    const result = await service.update(
      targetId,
      { activo: false },
      { actorUserId: adminActorId, actorEmail: 'admin@local.test' },
    );

    expect(result.activo).toBe(false);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(
      /passwordHash|totpSecret|secret/i,
    );
  });

  it('findAll no expone passwordHash ni secretos', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: targetId,
        email: 't@local.test',
        nombres: 'T',
        apellidos: 'U',
        dependenciaId: null,
        cargoId: null,
        activo: true,
        ultimoLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        roles: [{ role: { codigo: 'USUARIO', nombre: 'Usuario' } }],
        directPermissions: [],
      },
    ]);
    const list = await service.findAll();
    const raw = JSON.stringify(list);
    expect(raw).not.toMatch(/passwordHash|totpSecret|resetToken/i);
    expect(list[0]).toHaveProperty('email');
    expect(list[0]).not.toHaveProperty('passwordHash');
  });

  it('ADMIN no otorga permisos directos críticos (USERS_UPDATE)', async () => {
    mockAdminActorRoles();
    mockExistingUser({ id: targetId, roles: ['USUARIO'] });
    await expect(
      service.update(
        targetId,
        { directPermissionCodes: [PERM.USERS_UPDATE] },
        { actorUserId: adminActorId, actorEmail: 'admin@local.test' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
