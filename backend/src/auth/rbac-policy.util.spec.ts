import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ALL_PERMISSION_CODES, PERM } from './permission-codes';
import {
  assertDirectPermissionsAssignableByActor,
  assertDocUnlockDirectTargetAllowed,
  assertDocUnlockRoleMatrixAllowed,
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

    it('impide que ADMIN asigne rol ADMIN', () => {
      expect(() =>
        assertSuperadminUserMutationAllowed({
          actorRoleCodes: ['ADMIN'],
          targetRoleCodes: ['USUARIO'],
          nextRoleCodes: ['USUARIO', 'ADMIN'],
        }),
      ).toThrow(ForbiddenException);
    });

    it('impide que ADMIN revoque rol ADMIN', () => {
      expect(() =>
        assertSuperadminUserMutationAllowed({
          actorRoleCodes: ['ADMIN'],
          targetRoleCodes: ['USUARIO', 'ADMIN'],
          nextRoleCodes: ['USUARIO'],
        }),
      ).toThrow(ForbiddenException);
    });

    it('permite que SUPERADMIN asigne rol ADMIN', () => {
      expect(() =>
        assertSuperadminUserMutationAllowed({
          actorRoleCodes: ['SUPERADMIN'],
          targetRoleCodes: ['USUARIO'],
          nextRoleCodes: ['USUARIO', 'ADMIN'],
        }),
      ).not.toThrow();
    });

    it('permite que SUPERADMIN revoque rol ADMIN', () => {
      expect(() =>
        assertSuperadminUserMutationAllowed({
          actorRoleCodes: ['SUPERADMIN'],
          targetRoleCodes: ['USUARIO', 'ADMIN'],
          nextRoleCodes: ['USUARIO'],
        }),
      ).not.toThrow();
    });

    it('permite que ADMIN asigne USUARIO y REVISOR', () => {
      expect(() =>
        assertSuperadminUserMutationAllowed({
          actorRoleCodes: ['ADMIN'],
          targetRoleCodes: ['USUARIO'],
          nextRoleCodes: ['USUARIO', 'REVISOR'],
        }),
      ).not.toThrow();
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

    it('ADMIN no puede otorgar DOC_UNLOCK', () => {
      expect(() =>
        assertDirectPermissionsAssignableByActor({
          actorRoleCodes: ['ADMIN'],
          codes: [PERM.DOC_UNLOCK],
        }),
      ).toThrow(ForbiddenException);
    });

    it('ADMIN no puede revocar DOC_UNLOCK existente', () => {
      expect(() =>
        assertDirectPermissionsAssignableByActor({
          actorRoleCodes: ['ADMIN'],
          codes: [PERM.DOC_FILES_UPLOAD],
          previousCodes: [PERM.DOC_UNLOCK],
          targetRoleCodes: ['ADMIN'],
        }),
      ).toThrow(ForbiddenException);
    });

    it('ADMIN puede preservar DOC_UNLOCK sin añadir ni quitarlo', () => {
      expect(() =>
        assertDirectPermissionsAssignableByActor({
          actorRoleCodes: ['ADMIN'],
          codes: [PERM.DOC_UNLOCK, PERM.DOC_FILES_UPLOAD],
          previousCodes: [PERM.DOC_UNLOCK],
          targetRoleCodes: ['ADMIN'],
        }),
      ).not.toThrow();
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

    it('SUPERADMIN puede otorgar DOC_UNLOCK a ADMIN', () => {
      expect(() =>
        assertDirectPermissionsAssignableByActor({
          actorRoleCodes: ['SUPERADMIN'],
          codes: [PERM.DOC_UNLOCK],
          targetRoleCodes: ['ADMIN'],
        }),
      ).not.toThrow();
    });

    it('SUPERADMIN no puede otorgar DOC_UNLOCK a USER', () => {
      expect(() =>
        assertDirectPermissionsAssignableByActor({
          actorRoleCodes: ['SUPERADMIN'],
          codes: [PERM.DOC_UNLOCK],
          targetRoleCodes: ['USUARIO'],
        }),
      ).toThrow(BadRequestException);
    });

    it('SUPERADMIN no puede otorgar DOC_UNLOCK a REVISOR', () => {
      expect(() =>
        assertDocUnlockDirectTargetAllowed({
          codes: [PERM.DOC_UNLOCK],
          targetRoleCodes: ['REVISOR'],
        }),
      ).toThrow(BadRequestException);
    });

    it('SUPERADMIN no puede otorgar DOC_UNLOCK a AUDITOR/CONSULTA/EDITOR_DOC', () => {
      for (const role of ['AUDITOR', 'CONSULTA', 'EDITOR_DOC']) {
        expect(() =>
          assertDocUnlockDirectTargetAllowed({
            codes: [PERM.DOC_UNLOCK],
            targetRoleCodes: [role],
          }),
        ).toThrow(BadRequestException);
      }
    });

    it('DOC_UNLOCK no va a matriz de rol ADMIN', () => {
      expect(() =>
        assertDocUnlockRoleMatrixAllowed({
          roleCodigo: 'ADMIN',
          permissionCodes: [PERM.DOC_UNLOCK, PERM.DOC_READ],
        }),
      ).toThrow(BadRequestException);
    });

    it('DOC_UNLOCK sí puede estar en matriz SUPERADMIN', () => {
      expect(() =>
        assertDocUnlockRoleMatrixAllowed({
          roleCodigo: 'SUPERADMIN',
          permissionCodes: [PERM.DOC_UNLOCK],
        }),
      ).not.toThrow();
    });
  });
});
