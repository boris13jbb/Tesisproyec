import { IsIn } from 'class-validator';

export const DASHBOARD_ALERT_CODIGOS = [
  'PENDIENTES_REVISION',
  'AUTHZ_FORBIDDEN',
  'AUTH_LOGIN_FAIL',
  'BACKUP_SIN_REGISTRO',
] as const;

export type DashboardAlertCodigo = (typeof DASHBOARD_ALERT_CODIGOS)[number];

export class AcknowledgeDashboardAlertDto {
  @IsIn(DASHBOARD_ALERT_CODIGOS)
  codigo!: DashboardAlertCodigo;
}
