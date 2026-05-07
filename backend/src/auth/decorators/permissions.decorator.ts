import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../permission-codes';

export const PERMISSIONS_KEY = 'permissions';

/** Requiere que el usuario tenga **todos** los permisos listados (AND), vía `role_permissions`. */
export const Permissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
