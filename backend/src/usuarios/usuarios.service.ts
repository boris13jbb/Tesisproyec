import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import type { AuditContext } from '../auditoria/audit.types';
import { AuditService } from '../auditoria/audit.service';
import { CargosService } from '../cargos/cargos.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ROLE_ADMIN } from '../auth/role-constants';
import { ALL_PERMISSION_CODES, PERM } from '../auth/permission-codes';
import {
  assertDirectPermissionsAssignableByActor,
  assertSuperadminUserMutationAllowed,
} from '../auth/rbac-policy.util';
import { PasswordPolicyService } from '../auth/password-policy.service';
import { PermissionsService } from '../auth/permissions.service';
import { normalizeAdministrativeText } from '../common/text-normalize.util';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

type UsuarioResponse = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  dependenciaId: string | null;
  cargoId: string | null;
  activo: boolean;
  ultimoLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: { codigo: string; nombre: string }[];
  /** Permisos en `user_permissions` (además de los heredados por roles). */
  directPermissionCodes: string[];
};

export type InvitacionCorreoInfo = {
  solicitada: boolean;
  enviada: boolean;
  motivoOmitido?: string;
};

export type CreateUsuarioResult = UsuarioResponse & {
  invitacionCorreo: InvitacionCorreoInfo;
};

@Injectable()
export class UsuariosService {
  private readonly allowedDirectPermCodes = new Set<string>(
    ALL_PERMISSION_CODES,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly permissions: PermissionsService,
    private readonly cargos: CargosService,
  ) {}

  /** Cambiar `activo` exige USERS_DISABLE además de USERS_UPDATE del endpoint. */
  private async assertCanToggleActivo(
    actorUserId: string | null | undefined,
  ): Promise<void> {
    if (!actorUserId) {
      throw new ForbiddenException(
        'No autorizado para activar o desactivar usuarios',
      );
    }
    const codes = await this.permissions.getCodesForUserId(actorUserId);
    if (!codes.has(PERM.USERS_DISABLE)) {
      throw new ForbiddenException(
        'Se requiere el permiso USERS_DISABLE para activar o desactivar cuentas',
      );
    }
  }

  /**
   * Nueva asignación de dependencia: debe existir y estar activa.
   * `null` limpia la asignación; `undefined` no cambia.
   */
  private async assertDependenciaAssignable(
    dependenciaId: string | null | undefined,
  ): Promise<void> {
    if (dependenciaId === undefined || dependenciaId === null) {
      return;
    }
    const d = await this.prisma.dependencia.findUnique({
      where: { id: dependenciaId },
      select: { id: true, activo: true },
    });
    if (!d) {
      throw new BadRequestException('Dependencia no encontrada');
    }
    if (!d.activo) {
      throw new BadRequestException('Dependencia inactiva');
    }
  }

  /** Resuelve IDs de `permissions` para códigos directos; valida catálogo, política y filas en BD. */
  private async resolveDirectPermissionIds(
    codesInput: string[],
    actorRoleCodes: string[],
  ): Promise<string[]> {
    const unique = Array.from(
      new Set(codesInput.map((c) => c.trim()).filter(Boolean)),
    );
    assertDirectPermissionsAssignableByActor({
      actorRoleCodes,
      codes: unique,
    });
    const invalid = unique.filter((c) => !this.allowedDirectPermCodes.has(c));
    if (invalid.length) {
      throw new BadRequestException({
        message: 'Códigos de permiso directo no reconocidos',
        invalid,
      });
    }
    if (!unique.length) {
      return [];
    }
    const rows = await this.prisma.permission.findMany({
      where: { codigo: { in: unique } },
      select: { id: true },
    });
    if (rows.length !== unique.length) {
      throw new BadRequestException(
        'Hay permisos no registrados en la base de datos. Ejecute `npx prisma db seed` en el backend.',
      );
    }
    return rows.map((r) => r.id);
  }

  private async actorRoleCodes(
    actorUserId: string | null | undefined,
  ): Promise<string[]> {
    if (!actorUserId) return [];
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { roles: { select: { role: { select: { codigo: true } } } } },
    });
    return actor?.roles.map((r) => r.role.codigo) ?? [];
  }

  private async revokeUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Registra asignaciones/revocaciones individuales de roles con trazabilidad. */
  private async auditRoleChanges(input: {
    userId: string;
    antes: string[];
    despues: string[];
    ctx?: AuditContext;
    targetEmail?: string | null;
  }): Promise<void> {
    const antesSet = new Set(input.antes);
    const despuesSet = new Set(input.despues);
    const assigned = input.despues.filter((r) => !antesSet.has(r));
    const revoked = input.antes.filter((r) => !despuesSet.has(r));
    const auditCtx = {
      actorUserId: input.ctx?.actorUserId ?? null,
      actorEmail: input.ctx?.actorEmail ?? null,
      ip: input.ctx?.ip ?? null,
      userAgent: input.ctx?.userAgent ?? null,
      correlationId: input.ctx?.correlationId ?? null,
    };
    for (const role of assigned) {
      await this.audit.log({
        action: 'ROLE_ASSIGNED',
        result: 'OK',
        resource: { type: 'User', id: input.userId },
        context: auditCtx,
        meta: {
          role,
          targetEmail: input.targetEmail ?? null,
          roles: input.despues,
        },
      });
    }
    for (const role of revoked) {
      await this.audit.log({
        action: 'ROLE_REVOKED',
        result: 'OK',
        resource: { type: 'User', id: input.userId },
        context: auditCtx,
        meta: {
          role,
          targetEmail: input.targetEmail ?? null,
          roles: input.despues,
        },
      });
    }
  }

  private rolesRequireSessionRevocation(
    antes: string[],
    despues: string[],
  ): boolean {
    const antesSet = new Set(antes);
    const despuesSet = new Set(despues);
    const changed =
      [...antesSet].some((r) => !despuesSet.has(r)) ||
      [...despuesSet].some((r) => !antesSet.has(r));
    if (!changed) return false;
    const sensitive = new Set<string>([ROLE_ADMIN, 'REVISOR', 'SUPERADMIN']);
    return [...antesSet, ...despuesSet].some((r) => sensitive.has(r));
  }

  private assertSuperadminMutationAllowed(input: {
    actorRoleCodes: string[];
    targetRoleCodes: string[];
    nextRoleCodes?: string[];
    nextActivo?: boolean;
  }): void {
    assertSuperadminUserMutationAllowed(input);
  }

  private hashOpaqueToken(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  private buildPasswordSetupUrl(rawToken: string): string {
    const explicit =
      this.config.get<string>('PASSWORD_RESET_FRONTEND_URL')?.trim() ||
      this.config.get<string>('FRONTEND_PUBLIC_URL')?.trim();
    const corsFirst = this.config
      .get<string>('CORS_ORIGIN')
      ?.split(',')[0]
      ?.trim();
    const base = (explicit || corsFirst || 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
    const pathRaw =
      this.config.get<string>('PASSWORD_RESET_PATH')?.trim() ?? '/restablecer';
    const path = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
    return `${base}${path}?token=${encodeURIComponent(rawToken)}`;
  }

  private sanitize(u: {
    id: string;
    email: string;
    nombres: string | null;
    apellidos: string | null;
    dependenciaId: string | null;
    cargoId: string | null;
    activo: boolean;
    ultimoLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    roles: { role: { codigo: string; nombre: string } }[];
    directPermissions?: { permission: { codigo: string } }[];
  }): UsuarioResponse {
    const directPermissionCodes = (u.directPermissions ?? [])
      .map((p) => p.permission.codigo)
      .sort();
    return {
      id: u.id,
      email: u.email,
      nombres: u.nombres,
      apellidos: u.apellidos,
      dependenciaId: u.dependenciaId,
      cargoId: u.cargoId,
      activo: u.activo,
      ultimoLoginAt: u.ultimoLoginAt ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      roles: u.roles.map((r) => ({
        codigo: r.role.codigo,
        nombre: r.role.nombre,
      })),
      directPermissionCodes,
    };
  }

  async findAll(): Promise<UsuarioResponse[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        nombres: true,
        apellidos: true,
        dependenciaId: true,
        cargoId: true,
        activo: true,
        ultimoLoginAt: true,
        createdAt: true,
        updatedAt: true,
        roles: { include: { role: true } },
        directPermissions: {
          select: { permission: { select: { codigo: true } } },
        },
      },
    });
    return users.map((u) => this.sanitize(u));
  }

  async findOne(id: string): Promise<UsuarioResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombres: true,
        apellidos: true,
        dependenciaId: true,
        cargoId: true,
        activo: true,
        ultimoLoginAt: true,
        createdAt: true,
        updatedAt: true,
        roles: { include: { role: true } },
        directPermissions: {
          select: { permission: { select: { codigo: true } } },
        },
      },
    });
    if (!user) {
      throw new NotFoundException();
    }
    return this.sanitize(user);
  }

  async create(
    dto: CreateUsuarioDto,
    ctx?: AuditContext,
  ): Promise<CreateUsuarioResult> {
    const email = dto.email.toLowerCase().trim();
    const activo = dto.activo ?? true;

    const roleCodes = (dto.roles?.length ? dto.roles : ['USUARIO']).map((r) =>
      r.trim().toUpperCase(),
    );
    const uniqueRoleCodes = Array.from(new Set(roleCodes)).filter(Boolean);
    if (!uniqueRoleCodes.length) {
      throw new BadRequestException('Debe asignarse al menos un rol');
    }

    const actorRoles = await this.actorRoleCodes(ctx?.actorUserId);
    this.assertSuperadminMutationAllowed({
      actorRoleCodes: actorRoles,
      targetRoleCodes: [],
      nextRoleCodes: uniqueRoleCodes,
      nextActivo: activo,
    });

    if (dto.activo === false) {
      await this.assertCanToggleActivo(ctx?.actorUserId);
    }

    await this.assertDependenciaAssignable(dto.dependenciaId ?? null);
    await this.cargos.assertAssignable(
      dto.cargoId ?? null,
      dto.dependenciaId ?? null,
    );

    const roles = await this.prisma.role.findMany({
      where: { codigo: { in: uniqueRoleCodes } },
      select: { id: true, codigo: true },
    });
    if (roles.length !== uniqueRoleCodes.length) {
      const found = new Set(roles.map((r) => r.codigo));
      const missing = uniqueRoleCodes.filter((c) => !found.has(c));
      throw new BadRequestException(`Roles no válidos: ${missing.join(', ')}`);
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    let directPermIdsCreate: string[] | null = null;
    if (dto.directPermissionCodes !== undefined) {
      directPermIdsCreate = await this.resolveDirectPermissionIds(
        dto.directPermissionCodes,
        actorRoles,
      );
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            nombres: normalizeAdministrativeText(dto.nombres),
            apellidos: normalizeAdministrativeText(dto.apellidos),
            dependenciaId: dto.dependenciaId ?? null,
            cargoId: dto.cargoId ?? null,
            activo,
          },
        });

        await tx.userRole.createMany({
          data: roles.map((r) => ({ userId: user.id, roleId: r.id })),
        });

        if (directPermIdsCreate !== null && directPermIdsCreate.length > 0) {
          await tx.userPermission.createMany({
            data: directPermIdsCreate.map((permissionId) => ({
              userId: user.id,
              permissionId,
            })),
          });
        }

        return tx.user.findUniqueOrThrow({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            nombres: true,
            apellidos: true,
            dependenciaId: true,
            cargoId: true,
            activo: true,
            ultimoLoginAt: true,
            createdAt: true,
            updatedAt: true,
            roles: { include: { role: true } },
            directPermissions: {
              select: { permission: { select: { codigo: true } } },
            },
          },
        });
      });

      const createdSanitized = this.sanitize(created);

      await this.audit.log({
        action: 'USER_CREATED',
        result: 'OK',
        resource: { type: 'User', id: created.id },
        context: {
          actorUserId: ctx?.actorUserId ?? null,
          actorEmail: ctx?.actorEmail ?? null,
          ip: ctx?.ip ?? null,
          userAgent: ctx?.userAgent ?? null,
          correlationId: ctx?.correlationId ?? null,
        },
        meta: {
          roles: created.roles.map((r) => r.role.codigo),
          activo: created.activo,
          directPermissionCodes: createdSanitized.directPermissionCodes,
        },
      });

      const invitar = dto.invitarPorCorreo !== false;

      let invitacionCorreo: InvitacionCorreoInfo;

      if (!invitar) {
        invitacionCorreo = { solicitada: false, enviada: false };
      } else if (!this.mail.isConfigured()) {
        await this.audit.log({
          action: 'USER_INVITE_MAIL_SKIP',
          result: 'FAIL',
          resource: { type: 'User', id: created.id },
          context: {
            actorUserId: ctx?.actorUserId ?? null,
            actorEmail: ctx?.actorEmail ?? null,
            ip: ctx?.ip ?? null,
            userAgent: ctx?.userAgent ?? null,
            correlationId: ctx?.correlationId ?? null,
          },
          meta: { reason: 'SMTP_NOT_CONFIGURED' },
        });
        invitacionCorreo = {
          solicitada: true,
          enviada: false,
          motivoOmitido: 'SMTP_NOT_CONFIGURED',
        };
      } else {
        try {
          const inviteMinutes = Number(
            this.config.get('USER_INVITE_MINUTES', '4320'),
          );

          await this.prisma.passwordResetToken.updateMany({
            where: {
              userId: created.id,
              usedAt: null,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
            data: { revokedAt: new Date() },
          });

          const rawToken = randomBytes(32).toString('hex');
          const tokenHash = this.hashOpaqueToken(rawToken);
          await this.prisma.passwordResetToken.create({
            data: {
              userId: created.id,
              tokenHash,
              expiresAt: new Date(Date.now() + inviteMinutes * 60 * 1000),
              requestedIp: ctx?.ip ?? null,
              userAgent: ctx?.userAgent ?? null,
            },
          });

          const setupUrl = this.buildPasswordSetupUrl(rawToken);
          await this.mail.sendUserInvitation({
            to: email,
            setupUrl,
            expiresMinutes: inviteMinutes,
          });

          await this.audit.log({
            action: 'USER_INVITE_MAIL_SENT',
            result: 'OK',
            resource: { type: 'User', id: created.id },
            context: {
              actorUserId: ctx?.actorUserId ?? null,
              actorEmail: ctx?.actorEmail ?? null,
              ip: ctx?.ip ?? null,
              userAgent: ctx?.userAgent ?? null,
              correlationId: ctx?.correlationId ?? null,
            },
          });

          invitacionCorreo = { solicitada: true, enviada: true };
        } catch {
          await this.audit.log({
            action: 'USER_INVITE_MAIL_FAIL',
            result: 'FAIL',
            resource: { type: 'User', id: created.id },
            context: {
              actorUserId: ctx?.actorUserId ?? null,
              actorEmail: ctx?.actorEmail ?? null,
              ip: ctx?.ip ?? null,
              userAgent: ctx?.userAgent ?? null,
              correlationId: ctx?.correlationId ?? null,
            },
            meta: { reason: 'SMTP_ERROR' },
          });
          invitacionCorreo = {
            solicitada: true,
            enviada: false,
            motivoOmitido: 'SMTP_ERROR',
          };
        }
      }

      return {
        ...this.sanitize(created),
        invitacionCorreo,
      };
    } catch (e) {
      // P2002 unique constraint
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Unique constraint') || msg.includes('P2002')) {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: UpdateUsuarioDto,
    ctx?: AuditContext,
  ): Promise<UsuarioResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        nombres: true,
        apellidos: true,
        dependenciaId: true,
        cargoId: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        roles: { include: { role: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException();
    }

    const email = dto.email ? dto.email.toLowerCase().trim() : undefined;
    if (dto.password) {
      await this.passwordPolicy.assertPasswordNotReused(
        id,
        dto.password,
        existing.passwordHash,
      );
    }
    const passwordHash = dto.password
      ? await argon2.hash(dto.password, { type: argon2.argon2id })
      : undefined;

    const rolesToSet = dto.roles
      ?.map((r) => r.trim().toUpperCase())
      .filter(Boolean);

    const actorRoles = await this.actorRoleCodes(ctx?.actorUserId);
    const existingRoleCodes = existing.roles.map((r) => r.role.codigo);
    this.assertSuperadminMutationAllowed({
      actorRoleCodes: actorRoles,
      targetRoleCodes: existingRoleCodes,
      nextRoleCodes: rolesToSet ? Array.from(new Set(rolesToSet)) : undefined,
      nextActivo: dto.activo,
    });

    const togglingActivo =
      dto.activo !== undefined && dto.activo !== existing.activo;
    if (togglingActivo) {
      await this.assertCanToggleActivo(ctx?.actorUserId);
    }

    await this.assertDependenciaAssignable(dto.dependenciaId);

    const nextDependenciaId =
      dto.dependenciaId !== undefined
        ? dto.dependenciaId
        : existing.dependenciaId;
    const nextCargoId =
      dto.cargoId !== undefined ? dto.cargoId : existing.cargoId;
    const cargoChanged =
      dto.cargoId !== undefined && dto.cargoId !== existing.cargoId;
    const dependenciaChanged =
      dto.dependenciaId !== undefined &&
      dto.dependenciaId !== existing.dependenciaId;
    // Histórico: no revalidar el mismo cargo. Nueva asignación o cambio de
    // dependencia con cargo vigente sí exige cargo asignable y coherente.
    if (cargoChanged || (dependenciaChanged && nextCargoId)) {
      await this.cargos.assertAssignable(nextCargoId, nextDependenciaId);
    }

    let roleRows: { id: string; codigo: string }[] | null = null;
    if (rolesToSet) {
      const unique = Array.from(new Set(rolesToSet));
      if (!unique.length) {
        throw new BadRequestException('Debe asignarse al menos un rol');
      }
      const roles = await this.prisma.role.findMany({
        where: { codigo: { in: unique } },
        select: { id: true, codigo: true },
      });
      if (roles.length !== unique.length) {
        const found = new Set(roles.map((r) => r.codigo));
        const missing = unique.filter((c) => !found.has(c));
        throw new BadRequestException(
          `Roles no válidos: ${missing.join(', ')}`,
        );
      }
      roleRows = roles;
    }

    let directPermIdsUpdate: string[] | undefined;
    let antesDirectSorted: string[] | undefined;
    if (dto.directPermissionCodes !== undefined) {
      directPermIdsUpdate = await this.resolveDirectPermissionIds(
        dto.directPermissionCodes,
        actorRoles,
      );
      const cur = await this.prisma.userPermission.findMany({
        where: { userId: id },
        select: { permission: { select: { codigo: true } } },
      });
      antesDirectSorted = cur.map((c) => c.permission.codigo).sort();
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id },
          data: {
            email,
            passwordHash,
            nombres:
              dto.nombres !== undefined
                ? normalizeAdministrativeText(dto.nombres)
                : undefined,
            apellidos:
              dto.apellidos !== undefined
                ? normalizeAdministrativeText(dto.apellidos)
                : undefined,
            dependenciaId:
              dto.dependenciaId === undefined ? undefined : dto.dependenciaId,
            cargoId: dto.cargoId === undefined ? undefined : dto.cargoId,
            activo: dto.activo,
          },
        });

        if (roleRows) {
          await tx.userRole.deleteMany({ where: { userId: id } });
          await tx.userRole.createMany({
            data: roleRows.map((r) => ({ userId: id, roleId: r.id })),
          });
        }

        if (directPermIdsUpdate !== undefined) {
          await tx.userPermission.deleteMany({ where: { userId: id } });
          if (directPermIdsUpdate.length > 0) {
            await tx.userPermission.createMany({
              data: directPermIdsUpdate.map((permissionId) => ({
                userId: id,
                permissionId,
              })),
            });
          }
        }

        return tx.user.findUniqueOrThrow({
          where: { id },
          select: {
            id: true,
            email: true,
            nombres: true,
            apellidos: true,
            dependenciaId: true,
            cargoId: true,
            activo: true,
            ultimoLoginAt: true,
            createdAt: true,
            updatedAt: true,
            roles: { include: { role: true } },
            directPermissions: {
              select: { permission: { select: { codigo: true } } },
            },
          },
        });
      });

      if (dto.password) {
        await this.passwordPolicy.recordPasswordChange(
          id,
          existing.passwordHash,
        );
      }

      const updatedSanitized = this.sanitize(updated);

      if (roleRows) {
        const antesRoles = existingRoleCodes.slice().sort();
        const despuesRoles = updated.roles.map((r) => r.role.codigo).sort();
        await this.auditRoleChanges({
          userId: id,
          antes: antesRoles,
          despues: despuesRoles,
          ctx,
          targetEmail: existing.email,
        });
        if (this.rolesRequireSessionRevocation(antesRoles, despuesRoles)) {
          await this.revokeUserRefreshTokens(id);
        }
      }

      if (
        dto.directPermissionCodes !== undefined &&
        antesDirectSorted !== undefined
      ) {
        const despues = Array.from(
          new Set(
            dto.directPermissionCodes.map((c) => c.trim()).filter(Boolean),
          ),
        ).sort();
        await this.audit.log({
          action: 'USER_DIRECT_PERMISSIONS_UPDATED',
          result: 'OK',
          resource: { type: 'User', id },
          context: {
            actorUserId: ctx?.actorUserId ?? null,
            actorEmail: ctx?.actorEmail ?? null,
            ip: ctx?.ip ?? null,
            userAgent: ctx?.userAgent ?? null,
            correlationId: ctx?.correlationId ?? null,
          },
          meta: {
            antes: antesDirectSorted,
            despues,
          },
        });
        await this.revokeUserRefreshTokens(id);
      }

      // Desactivación: invalidar refresh de inmediato (access JWT muere en JwtStrategy).
      if (togglingActivo && dto.activo === false) {
        await this.revokeUserRefreshTokens(id);
      }

      if (dto.password) {
        await this.revokeUserRefreshTokens(id);
      }

      await this.audit.log({
        action: 'USER_UPDATED',
        result: 'OK',
        resource: { type: 'User', id },
        context: {
          actorUserId: ctx?.actorUserId ?? null,
          actorEmail: ctx?.actorEmail ?? null,
          ip: ctx?.ip ?? null,
          userAgent: ctx?.userAgent ?? null,
          correlationId: ctx?.correlationId ?? null,
        },
        meta: {
          activo: updated.activo,
          roles: updated.roles.map((r) => r.role.codigo),
          dependenciaId: updated.dependenciaId,
          cargoId: updated.cargoId,
          directPermissionCodes: updatedSanitized.directPermissionCodes,
        },
      });

      return updatedSanitized;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Unique constraint') || msg.includes('P2002')) {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw e;
    }
  }

  async resetPassword(
    id: string,
    newPassword: string,
    ctx?: AuditContext,
  ): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, activo: true, passwordHash: true },
    });
    if (!user) {
      throw new NotFoundException();
    }
    const actorRoles = await this.actorRoleCodes(ctx?.actorUserId);
    const targetRoles = await this.prisma.userRole.findMany({
      where: { userId: id },
      select: { role: { select: { codigo: true } } },
    });
    this.assertSuperadminMutationAllowed({
      actorRoleCodes: actorRoles,
      targetRoleCodes: targetRoles.map((r) => r.role.codigo),
    });
    if (!user.activo) {
      throw new BadRequestException(
        'No se puede cambiar la contraseña de un usuario inactivo',
      );
    }

    await this.passwordPolicy.assertPasswordNotReused(
      id,
      newPassword,
      user.passwordHash,
    );

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
    await this.passwordPolicy.recordPasswordChange(id, user.passwordHash);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      action: 'USER_PASSWORD_RESET',
      result: 'OK',
      resource: { type: 'User', id },
      context: {
        actorUserId: ctx?.actorUserId ?? null,
        actorEmail: ctx?.actorEmail ?? null,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
        correlationId: ctx?.correlationId ?? null,
      },
    });

    return { ok: true };
  }
}
