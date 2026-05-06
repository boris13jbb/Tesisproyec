export type AuditResult = 'OK' | 'FAIL';

export type AuditResource = {
  type?: string | null;
  id?: string | null;
};

export type AuditContext = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
};
