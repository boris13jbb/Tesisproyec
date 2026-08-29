import { ForbiddenException } from '@nestjs/common';
import { ALL_PERMISSION_CODES, PERM } from './permission-codes';
import {
  assertDirectPermissionsAssignableByActor,
  assertSuperadminRoleMatrixMutationAllowed,
  assertSuperadminUserMutationAllowed,
} from './rbac-policy.util';

describe('rbac-policy.util', () => {
  describe('assertSuperadminUserMutationAllowed', () => {
    it('impide que ADMIN desactive SUPERADMIN', () => {
      expect(() =>
        assertSuperadminUserMutationAllowed({
          actorRoleCodes: ['ADMIN'],
          targetRoleCodes: ['SUPERADMIN'],
          nextActivo: false,
        }),
      ).toThrow(ForbiddenException);
    });

    it('impide degradar SUPERADMIN', () => {
      expect(() =>
        assertSuperadminUserMutationAllowed({
          actorRoleCodes: ['ADMIN'],
          targetRoleCodes: ['SUPERADMIN'],
          nextRoleCodes: ['ADMIN'],
        }),
      ).toThrow(ForbiddenException);
    });

    it('impide que ADMIN asigne SUPERADMIN', () => {
      expect(() =>
        assertSuperadminUserMutationAllowed({
          actorRoleCodes: ['ADMIN'],
          targetRoleCodes: ['USUARIO'],
          nextRoleCodes: ['SUPERADMIN'],
        }),
      ).toThrow(ForbiddenException);
    });

    it('permite que SUPERADMIN actualice su cuenta sin degradar', () => {
      expect(() =>
        assertSuperadminUserMutationAllowed({
          actorRoleCodes: ['SUPERADMIN'],
          targetRoleCodes: ['SUPERADMIN'],
          nextRoleCodes: ['SUPERADMIN'],
          nextActivo: true,
        }),
      ).not.toThrow();
    });
  });

  describe('assertSuperadminRoleMatrixMutationAllowed', () => {
    it('ADMIN no puede PUT permisos de SUPERADMIN', () => {
      expect(() =>
        assertSuperadminRoleMatrixMutationAllowed({
          actorRoleCodes: ['ADMIN'],
          roleCodigo: 'SUPERADMIN',
        }),
      ).toThrow(ForbiddenException);
    });

    it('SUPERADMIN sí puede modificar su matriz', () => {
      expect(() =>
        assertSuperadminRoleMatrixMutationAllowed({
          actorRoleCodes: ['SUPERADMIN'],
          roleCodigo: 'SUPERADMIN',
        }),
      ).not.toThrow();
    });

    it('ADMIN puede modificar la matriz de USUARIO', () => {
      expect(() =>
        assertSuperadminRoleMatrixMutationAllowed({
          actorRoleCodes: ['ADMIN'],
          roleCodigo: 'USUARIO',
        }),
      ).not.toThrow();
    });
  });

  describe('assertDirectPermissionsAssignableByActor', () => {
    it('ADMIN no puede otorgar DOC_REVISION_RESOLVE como permiso directo', () => {
      expect(() =>
        assertDirectPermissionsAssignableByActor({
          actorRoleCodes: ['ADMIN'],
          codes: [PERM.DOC_REVISION_RESOLVE],
        }),
      ).toThrow(ForbiddenException);
    });

    it('ADMIN no puede otorgar el catálogo completo', () => {
      expect(() =>
        assertDirectPermissionsAssignableByActor({
          actorRoleCodes: ['ADMIN'],
          codes: [...ALL_PERMISSION_CODES],
        }),
      ).toThrow(ForbiddenException);
    });

    it('ADMIN sí puede otorgar DOC_FILES_UPLOAD', () => {
      expect(() =>
        assertDirectPermissionsAssignableByActor({
          actorRoleCodes: ['ADMIN'],
          codes: [PERM.DOC_FILES_UPLOAD],
        }),
      ).not.toThrow();
    });

    it('SUPERADMIN puede otorgar DOC_REVISION_RESOLVE directo', () => {
      expect(() =>
        assertDirectPermissionsAssignableByActor({
          actorRoleCodes: ['SUPERADMIN'],
          codes: [PERM.DOC_REVISION_RESOLVE],
        }),
      ).not.toThrow();
    });
  });
});
