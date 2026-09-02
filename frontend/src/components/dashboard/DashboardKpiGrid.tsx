import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DraftsOutlinedIcon from '@mui/icons-material/DraftsOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActions';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAlt';
import { Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { DashboardDocumentosBloque } from './dashboard-types';
import { DashboardKpiCard } from './DashboardKpiCard';
import { formatDashboardNumber, formatPercentOfTotal } from './dashboard-utils';

type Props = {
  documentos: DashboardDocumentosBloque | undefined;
  loading?: boolean;
  creadosEsteMes?: number;
};

export function DashboardKpiGrid({ documentos, loading, creadosEsteMes }: Props) {
  const navigate = useNavigate();
  const total = documentos?.total ?? 0;
  const esteMes = creadosEsteMes ?? documentos?.creadosEsteMes ?? 0;

  const items = [
    {
      key: 'total',
      title: 'Documentos totales',
      description: 'Expedientes activos en su ámbito',
      value: loading ? '…' : formatDashboardNumber(total),
      secondary: !loading && esteMes > 0 ? `+${formatDashboardNumber(esteMes)} registrados este mes` : undefined,
      accent: 'primary' as const,
      icon: <DescriptionOutlinedIcon fontSize="small" />,
      trend: !loading && esteMes > 0 ? ('up' as const) : undefined,
      onClick: () => navigate('/documentos'),
      label: 'Ir a documentos',
    },
    {
      key: 'registrados',
      title: 'Registrados',
      description: 'Formalizados en el sistema',
      value: loading ? '…' : formatDashboardNumber(documentos?.registrados ?? 0),
      secondary: formatPercentOfTotal(documentos?.registrados ?? 0, total),
      accent: 'info' as const,
      icon: <TaskAltOutlinedIcon fontSize="small" />,
      onClick: () => navigate('/documentos?estado=REGISTRADO'),
      label: 'Ver registrados',
    },
    {
      key: 'borradores',
      title: 'Borradores',
      description: 'En elaboración',
      value: loading ? '…' : formatDashboardNumber(documentos?.borradores ?? 0),
      secondary: formatPercentOfTotal(documentos?.borradores ?? 0, total),
      accent: 'secondary' as const,
      icon: <DraftsOutlinedIcon fontSize="small" />,
      onClick: () => navigate('/documentos?estado=BORRADOR'),
      label: 'Ver borradores',
    },
    {
      key: 'revision',
      title: 'En revisión',
      description: 'Requieren atención',
      value: loading ? '…' : formatDashboardNumber(documentos?.enRevision ?? 0),
      secondary:
        (documentos?.enRevision ?? 0) > 0 ? 'Requieren atención' : 'Sin pendientes',
      accent: 'warning' as const,
      icon: <PendingActionsOutlinedIcon fontSize="small" />,
      onClick: () => navigate('/documentos?estado=EN_REVISION'),
      label: 'Ver en revisión',
    },
    {
      key: 'aprobados',
      title: 'Aprobados',
      description: 'Trámite favorable',
      value: loading ? '…' : formatDashboardNumber(documentos?.aprobados ?? 0),
      secondary: formatPercentOfTotal(documentos?.aprobados ?? 0, total),
      accent: 'success' as const,
      icon: <CheckCircleOutlinedIcon fontSize="small" />,
      onClick: () => navigate('/documentos?estado=APROBADO'),
      label: 'Ver aprobados',
    },
    {
      key: 'rechazados',
      title: 'Rechazados',
      description: 'Observados o devueltos',
      value: loading ? '…' : formatDashboardNumber(documentos?.rechazados ?? 0),
      secondary: formatPercentOfTotal(documentos?.rechazados ?? 0, total),
      accent: 'error' as const,
      icon: <CancelOutlinedIcon fontSize="small" />,
      onClick: () => navigate('/documentos?estado=RECHAZADO'),
      label: 'Ver rechazados',
    },
  ];

  return (
    <Grid container spacing={2}>
      {items.map((item) => (
        <Grid key={item.key} size={{ xs: 6, sm: 4, md: 4, lg: 2, xl: 2 }}>
          <DashboardKpiCard
            icon={item.icon}
            title={item.title}
            description={item.description}
            value={item.value}
            secondary={loading ? undefined : item.secondary}
            accent={item.accent}
            trend={item.trend}
            interactive={!loading}
            interactiveLabel={item.label}
            onClick={item.onClick}
          />
        </Grid>
      ))}
    </Grid>
  );
}
