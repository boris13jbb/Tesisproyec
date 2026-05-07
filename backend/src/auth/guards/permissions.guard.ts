import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { PermissionCode } from '../permission-codes';
import { PermissionsService } from '../permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }
    const req = context.switchToHttp().getRequest<{
      user?: { id?: string };
    }>();
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException();
    }
    const have = await this.permissions.getCodesForUserId(userId);
    const ok = required.every((p) => have.has(p));
    if (!ok) {
      throw new ForbiddenException();
    }
    return true;
  }
}
