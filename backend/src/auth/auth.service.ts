import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashRefresh(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  private hashOpaqueToken(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  private accessSignOptions(): JwtSignOptions {
    return {
      expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES') ??
        '15m') as JwtSignOptions['expiresIn'],
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: true } },
      },
    });
    if (!user?.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      this.accessSignOptions(),
    );

    const rawRefresh = randomBytes(32).toString('hex');
    const tokenHash = this.hashRefresh(rawRefresh);
    const days = Number(this.config.get('JWT_REFRESH_DAYS', 7));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(refreshRaw: string | undefined) {
    if (!refreshRaw) {
      throw new UnauthorizedException();
    }
    const tokenHash = this.hashRefresh(refreshRaw);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
          },
        },
      },
    });
    if (
      !row ||
      row.revokedAt ||
      row.expiresAt < new Date() ||
      !row.user.activo
    ) {
      throw new UnauthorizedException();
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: row.user.id, email: row.user.email },
      this.accessSignOptions(),
    );

    return {
      accessToken,
      user: this.sanitizeUser(row.user),
    };
  }

  async logout(refreshRaw: string | undefined) {
    if (!refreshRaw) {
      return;
    }
    const tokenHash = this.hashRefresh(refreshRaw);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    nombres: string | null;
    apellidos: string | null;
    activo: boolean;
    roles: { role: { codigo: string; nombre: string } }[];
  }) {
    return {
      id: user.id,
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      roles: user.roles.map((ur) => ({
        codigo: ur.role.codigo,
        nombre: ur.role.nombre,
      })),
    };
  }

  async requestPasswordReset(input: {
    email: string;
    requestedIp?: string;
    userAgent?: string;
  }): Promise<{ ok: true; debugToken?: string }> {
    const email = input.email.toLowerCase().trim();

    // Respuesta constante (no enumeración de cuentas).
    const ok: { ok: true; debugToken?: string } = { ok: true };

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, activo: true },
    });
    if (!user?.activo) {
      return ok;
    }

    // Revocar tokens previos no usados para evitar múltiples enlaces válidos.
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashOpaqueToken(rawToken);
    const minutes = Number(this.config.get('PASSWORD_RESET_MINUTES', 30));
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestedIp: input.requestedIp,
        userAgent: input.userAgent,
      },
    });

    // En el MVP no enviamos correo real desde el backend.
    // En desarrollo devolvemos el token para pruebas manuales controladas.
    if (this.config.get('NODE_ENV') !== 'production') {
      ok.debugToken = rawToken;
    }

    return ok;
  }

  async confirmPasswordReset(input: {
    token: string;
    newPassword: string;
  }): Promise<{ ok: true }> {
    const token = input.token.trim();
    if (!token) {
      throw new UnauthorizedException();
    }

    const tokenHash = this.hashOpaqueToken(token);
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !row ||
      row.usedAt ||
      row.revokedAt ||
      row.expiresAt < new Date() ||
      !row.user.activo
    ) {
      throw new UnauthorizedException();
    }

    const passwordHash = await argon2.hash(input.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      // Invalida sesiones activas: fuerza re-login tras restablecer contraseña.
      this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }
}
