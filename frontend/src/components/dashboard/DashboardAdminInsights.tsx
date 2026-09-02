import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import type { DashboardAuditResumen, DashboardUsuariosResumen } from './dashboard-types';
import { formatDashboardNumber } from './dashboard-utils';
import {
  dashboardCardPadding,
  dashboardSectionSubtitleSx,
  dashboardSectionTitleSx,
  dashboardSurfaceSx,
} from './dashboard-surface';

type Props = {
  usuarios?: DashboardUsuariosResumen | null;
  audit?: DashboardAuditResumen | null;
  lastBackupAt?: string | null;
  lastAuditAt?: string | null;
  loading?: boolean;
  canManageUsers?: boolean;
  canViewAudit?: boolean;
  formatBackup: (iso: string | null) => string;
};

function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'primary' | 'success' | 'info';
}) {
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
        <Box
          aria-hidden
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (t) => alpha(t.palette[accent].main, 0.1),
            color: `${accent}.main`,
          }}
        >
          {icon}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
      </Stack>
      <Typography
        variant={value.length > 24 ? 'body2' : 'h6'}
        sx={{ fontWeight: 800, lineHeight: 1.2 }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function DashboardAdminInsights({
  usuarios,
  audit,
  lastBackupAt,
  lastAuditAt,
  loading,
  canManageUsers,
  canViewAudit,
  formatBackup,
}: Props) {
  const navigate = useNavigate();

  return (
    <Box sx={{ ...dashboardSurfaceSx, p: dashboardCardPadding }}>
      <Typography component="h2" sx={dashboardSectionTitleSx}>
        Indicadores operativos
      </Typography>
      <Typography sx={dashboardSectionSubtitleSx}>
        Resumen de usuarios, auditoría y respaldos del sistema.
      </Typography>

      <Grid container spacing={1.25} sx={{ mt: 1.5 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <MiniStat
            icon={<PeopleOutlinedIcon sx={{ fontSize: 16 }} />}
            label="Usuarios activos"
            value={loading ? '…' : formatDashboardNumber(usuarios?.activos ?? 0)}
            accent="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <MiniStat
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 16 }} />}
            label="Auditoría hoy"
            value={loading ? '…' : formatDashboardNumber(audit?.accionesHoy ?? 0)}
            accent="primary"
          />
        </Grid>
        <Grid size={12}>
          <MiniStat
            icon={<BackupOutlinedIcon sx={{ fontSize: 16 }} />}
            label="Último respaldo verificado"
            value={loading ? '…' : formatBackup(lastBackupAt ?? null)}
            accent="info"
          />
        </Grid>
      </Grid>

      {!loading && lastAuditAt ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
          Última línea auditada:{' '}
          {new Intl.DateTimeFormat('es-EC', { dateStyle: 'short', timeStyle: 'short' }).format(
            new Date(lastAuditAt),
          )}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
        {canManageUsers ? (
          <Button
            size="small"
            variant="outlined"
            sx={{ fontWeight: 700 }}
            onClick={() => navigate('/admin/usuarios')}
          >
            Usuarios
          </Button>
        ) : null}
        {canViewAudit ? (
          <Button
            size="small"
            variant="outlined"
            sx={{ fontWeight: 700 }}
            onClick={() => navigate('/admin/auditoria')}
          >
            Auditoría
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
