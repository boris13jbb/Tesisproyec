import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

type AccessPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: true } },
      },
    });
    if (!user || !user.activo) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      dependenciaId: user.dependenciaId,
      roles: user.roles.map((ur) => ({
        codigo: ur.role.codigo,
        nombre: ur.role.nombre,
      })),
    };
  }
}
