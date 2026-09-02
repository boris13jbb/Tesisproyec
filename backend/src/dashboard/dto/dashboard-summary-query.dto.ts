import { IsIn, IsOptional } from 'class-validator';
import {
  ACTIVIDAD_DOCUMENTAL_PERIODOS,
  type ActividadDocumentalPeriodo,
} from '../actividad-periodo.util';

export class DashboardSummaryQueryDto {
  @IsOptional()
  @IsIn(ACTIVIDAD_DOCUMENTAL_PERIODOS)
  actividadPeriodo?: ActividadDocumentalPeriodo;
}
