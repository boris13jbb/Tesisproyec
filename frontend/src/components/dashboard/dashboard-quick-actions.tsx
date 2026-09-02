import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import type { ReactNode } from 'react';

export type QuickAction = {
  id: string;
  label: string;
  description: string;
  to: string;
  icon: ReactNode;
};

export function buildQuickActions(input: {
  isAdmin: boolean;
  canOpenNewDocument: boolean;
  canOpenReview: boolean;
  canOpenUsers: boolean;
  canOpenAudit: boolean;
  canOpenReports: boolean;
}): QuickAction[] {
  const actions: QuickAction[] = [];

  if (input.canOpenNewDocument) {
    actions.push({
      id: 'nuevo',
      label: 'Nuevo documento',
      description: 'Registrar un expediente',
      to: '/documentos/nuevo',
      icon: <AddOutlinedIcon fontSize="small" />,
    });
  }

  if (input.canOpenReview) {
    actions.push({
      id: 'pendientes',
      label: 'Revisar pendientes',
      description: 'Bandeja en revisión',
      to: '/documentos?estado=EN_REVISION',
      icon: <PendingActionsOutlinedIcon fontSize="small" />,
    });
  }

  actions.push({
    id: 'documentos',
    label: input.isAdmin ? 'Documentos' : 'Mis documentos',
    description: 'Bandeja documental',
    to: '/documentos',
    icon: <DescriptionOutlinedIcon fontSize="small" />,
  });

  if (!input.isAdmin) {
    actions.push({
      id: 'registrados',
      label: 'Documentos registrados',
      description: 'Expedientes formalizados',
      to: '/documentos?estado=REGISTRADO',
      icon: <DescriptionOutlinedIcon fontSize="small" />,
    });
  }

  if (input.canOpenUsers) {
    actions.push({
      id: 'usuarios',
      label: 'Usuarios',
      description: 'Gestión de cuentas y roles',
      to: '/admin/usuarios',
      icon: <PeopleOutlinedIcon fontSize="small" />,
    });
  }

  if (input.canOpenAudit) {
    actions.push({
      id: 'auditoria',
      label: 'Auditoría',
      description: 'Trazabilidad del sistema',
      to: '/admin/auditoria',
      icon: <FactCheckOutlinedIcon fontSize="small" />,
    });
  }

  if (input.canOpenReports) {
    actions.push({
      id: 'reportes',
      label: 'Reportes',
      description: 'Informes institucionales',
      to: '/reportes',
      icon: <AssessmentOutlinedIcon fontSize="small" />,
    });
  }

  actions.push({
    id: 'perfil',
    label: 'Perfil',
    description: 'Datos de su cuenta',
    to: '/perfil',
    icon: <PersonOutlineOutlinedIcon fontSize="small" />,
  });

  return actions;
}
