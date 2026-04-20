import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Códigos de rol (`Role.codigo`), p. ej. `ADMIN`, `USUARIO`. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
