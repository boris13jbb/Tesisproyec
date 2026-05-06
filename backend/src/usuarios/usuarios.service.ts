import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import type { AuditContext } from '../auditoria/audit.types';
import { AuditService } from '../auditoria/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
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
  createdAt: Date;
  updatedAt: Date;
  roles: { codigo: string; nombre: string }[];
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

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
    createdAt: Date;
    updatedAt: Date;
    roles: { role: { codigo: string; nombre: string } }[];
  }): UsuarioResponse {
    return {
      id: u.id,
      email: u.email,
      nombres: u.nombres,
      apellidos: u.apellidos,
      dependenciaId: u.dependenciaId,
      cargoId: u.cargoId,
      activo: u.activo,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      roles: u.roles.map((r) => ({
        codigo: r.role.codigo,
        nombre: r.role.nombre,
      })),
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
        createdAt: true,
        updatedAt: true,
        roles: { include: { role: true } },
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
        createdAt: true,
        updatedAt: true,
        roles: { include: { role: true } },
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

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            nombres: dto.nombres?.trim() || null,
            apellidos: dto.apellidos?.trim() || null,
            dependenciaId: dto.dependenciaId ?? null,
            cargoId: dto.cargoId ?? null,
            activo,
          },
        });

        await tx.userRole.createMany({
          data: roles.map((r) => ({ userId: user.id, roleId: r.id })),
        });

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
            createdAt: true,
            updatedAt: true,
            roles: { include: { role: true } },
          },
        });
      });

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
    const passwordHash = dto.password
      ? await argon2.hash(dto.password, { type: argon2.argon2id })
      : undefined;

    const rolesToSet = dto.roles
      ?.map((r) => r.trim().toUpperCase())
      .filter(Boolean);

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

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id },
          data: {
            email,
            passwordHash,
            nombres:
              dto.nombres !== undefined
                ? dto.nombres?.trim() || null
                : undefined,
            apellidos:
              dto.apellidos !== undefined
                ? dto.apellidos?.trim() || null
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
            createdAt: true,
            updatedAt: true,
            roles: { include: { role: true } },
          },
        });
      });

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
        },
      });

      return this.sanitize(updated);
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
      select: { id: true, activo: true },
    });
    if (!user) {
      throw new NotFoundException();
    }
    if (!user.activo) {
      throw new BadRequestException(
        'No se puede cambiar la contraseña de un usuario inactivo',
      );
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
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
