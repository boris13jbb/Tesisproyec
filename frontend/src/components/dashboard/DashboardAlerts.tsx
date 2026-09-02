import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import {
  hrefForDashboardAlertCodigo,
  pickFirstDashboardAlertDestination,
  type DashboardAlertItemClient,
} from '../../nav/dashboard-alert-navigation';
import { EmptyState } from '../EmptyState';
import { listSurfaceSx } from '../listSurfaces';

type Props = {
  items: DashboardAlertItemClient[];
  loading?: boolean;
  isAdmin?: boolean;
  serverItems?: DashboardAlertItemClient[];
  ackInFlight?: string | null;
  ackError?: string | null;
  onAcknowledge?: (codigo: string) => void;
};

export function DashboardAlerts({
  items,
  loading,
  isAdmin,
  serverItems = [],
  ackInFlight,
  ackError,
  onAcknowledge,
}: Props) {
  const navigate = useNavigate();
  const count = items.length;
  const firstDest = pickFirstDashboardAlertDestination(items, Boolean(isAdmin));

  return (
    <Box id="alertas" sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.5 }, height: '100%', scrollMarginTop: { xs: 88, md: 96 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
        <Box
          aria-hidden
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (t) => alpha(t.palette.error.main, 0.12),
            color: 'error.main',
          }}
        >
          <NotificationsOutlinedIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            Alertas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Señales operativas que requieren seguimiento.
          </Typography>
        </Box>
        <Chip
          size="small"
          color={count > 0 ? 'error' : 'default'}
          label={loading ? '…' : String(count)}
          sx={{ fontWeight: 800 }}
        />
      </Stack>

      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Cargando alertas…
        </Typography>
      ) : count === 0 ? (
        <Box sx={{ mt: 1 }}>
          <EmptyState dense title="No existen alertas pendientes." description="Todo está al día." />
        </Box>
      ) : (
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {items.map((item) => {
            const href = hrefForDashboardAlertCodigo(item.codigo, Boolean(isAdmin));
            return (
              <Box
                key={item.codigo}
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  cursor: href ? 'pointer' : 'default',
                }}
                role={href ? 'button' : undefined}
                tabIndex={href ? 0 : undefined}
                onClick={() => href && navigate(href)}
                onKeyDown={(e) => {
                  if (href && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    navigate(href);
                  }
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {item.mensaje}
                </Typography>
              </Box>
            );
          })}
          {firstDest ? (
            <Button size="small" variant="outlined" sx={{ alignSelf: 'flex-start', fontWeight: 700 }} onClick={() => navigate(firstDest)}>
              Ir a la primera acción sugerida
            </Button>
          ) : null}
        </Stack>
      )}

      {isAdmin && !loading && serverItems.length > 0 && onAcknowledge ? (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Ocultar alertas revisadas
          </Typography>
          {ackError ? (
            <Alert severity="error" sx={{ mb: 1 }}>
              {ackError}
            </Alert>
          ) : null}
          <Stack spacing={1}>
            {serverItems.map((item) => (
              <Stack
                key={item.codigo}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                  {item.mensaje}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  disabled={ackInFlight !== null && ackInFlight !== undefined}
                  onClick={() => onAcknowledge(item.codigo)}
                >
                  {ackInFlight === item.codigo ? 'Guardando…' : 'Marcar como revisada'}
                </Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}
