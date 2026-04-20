import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }
    const req = context.switchToHttp().getRequest<{
      user?: { roles?: { codigo: string }[] };
    }>();
    const codes = req.user?.roles?.map((r) => r.codigo) ?? ([] as string[]);
    const allowed = required.some((role) => codes.includes(role));
    if (!allowed) {
      throw new ForbiddenException();
    }
    return true;
  }
}
