import { AUDIT_SENSITIVE_ACTIONS } from './audit-sensitive.util';

describe('AUDIT_SENSITIVE_ACTIONS', () => {
  it('incluye desactivación documental y cambios de permisos/roles', () => {
    expect(AUDIT_SENSITIVE_ACTIONS).toEqual(
      expect.arrayContaining([
        'DOC_DEACTIVATED',
        'DOC_FILE_DELETED',
        'USER_DIRECT_PERMISSIONS_UPDATED',
        'ROLE_PERMISSIONS_UPDATED',
        'DOC_STATE_CHANGED',
        'USER_UPDATED',
      ]),
    );
  });

  it('no confunde archivo eliminado con documento desactivado', () => {
    expect(
      AUDIT_SENSITIVE_ACTIONS.filter((a) => a === 'DOC_DEACTIVATED'),
    ).toHaveLength(1);
    expect(
      AUDIT_SENSITIVE_ACTIONS.filter((a) => a === 'DOC_FILE_DELETED'),
    ).toHaveLength(1);
  });
});
