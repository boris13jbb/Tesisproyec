import { useEffect, useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { apiClient } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';

const INSTITUTIONAL_TEAL = '#2D8A99';

const paperCardSx = {
  bgcolor: '#fff',
  borderRadius: 3,
  p: { xs: 2, md: 2.75 },
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
};

type AdminSecuritySummary = {
  schemaVersion: 1;
  passwordPolicy: { minLength: number; enforcedOnUserCreate: boolean };
  accountLockout: {
    enabled: boolean;
    maxFailedAttempts: number;
    lockoutMinutes: number;
  };
  jwtAccessExpiresIn: string;
  refreshSessionDays: number;
  passwordReuseHistory: { implemented: boolean; lastPasswordsRemembered: number };
  adminStepUpAuth: { implemented: boolean };
  applicationControls: {
    helmetEnabled: boolean;
    globalValidationPipe: boolean;
    corsWithCredentials: boolean;
    loginThrottle: { limitPerIp: number; windowMinutes: number };
    fileUpload: { maxMegabytes: number; mimeAllowlistEnforced: boolean };
  };
};

function ActivaBadge() {
  return (
    <Chip
      size="small"
      label="Activa"
      sx={{
        bgcolor: '#e8f5e9',
        color: '#1b5e20',
        fontWeight: 700,
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}

/** Switch reflectivo: estado desde API, sin persistencia desde UI (no engañar sobre edición real). */
function ReadOnlySwitch(props: { checked: boolean }) {
  return (
    <Switch
      checked={props.checked}
      disabled
      size="medium"
      color="success"
      slotProps={{ input: { 'aria-readonly': true } }}
      sx={{
        '&.Mui-disabled': { opacity: 1 },
        '& .MuiSwitch-switchBase.Mui-disabled+.MuiSwitch-track': {
          opacity: props.checked ? 0.95 : 0.48,
        },
      }}
    />
  );
}

function PolicyRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Box sx={{ flexShrink: 0 }}>{control}</Box>
      </Stack>
    </Stack>
  );
}

export function ConfiguracionSeguridadPage() {
  const [summary, setSummary] = useState<AdminSecuritySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const { data } = await apiClient.get<AdminSecuritySummary>('/auth/admin/security-summary');
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) {
          setSummary(null);
          setError(
            'No se pudo leer la política del servidor (¿ADMIN y backend en línea?).',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ctr = summary?.applicationControls;

  const controlBadgeRow = (
    title: string,
    desc: string,
    badge: ReactNode,
  ) => (
    <Paper
      variant="outlined"
      sx={{
        px: { xs: 1.75, md: 2 },
        py: { xs: 1.35, md: 1.5 },
        borderRadius: 2,
        borderColor: 'rgba(15,23,42,0.09)',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {desc}
          </Typography>
        </Box>
        {badge}
      </Stack>
    </Paper>
  );

  return (
    <>
      <PageHeader
        title="Parámetros de seguridad"
        description={
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Configuración de seguridad
              </Box>{' '}
              · GADPR-LM · Sistema de Gestión Documental
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              Políticas de contraseña, sesión, validación y protección de la aplicación.
            </Typography>
          </Stack>
        }
      />

      {error ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Alert severity="info" sx={{ mb: { xs: 2, md: 2.25 }, borderRadius: 2 }}>
        <Typography variant="body2">
          Los interruptores muestran el <strong>estado efectivo</strong> leído del backend (solo lectura).{' '}
          <strong>No se persisten cambios desde esta pantalla</strong>; el despliegue real sigue definido por código,
          ValidationPipe global y variables de entorno (p. ej. <code>JWT_ACCESS_EXPIRES</code>,{' '}
          <code>AUTH_LOCKOUT_MAX_ATTEMPTS</code>, <code>AUTH_LOCKOUT_MINUTES</code>).
        </Typography>
      </Alert>

      {loading ?
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress aria-label="Cargando política de seguridad" />
        </Box>
      : null}

      {!loading && summary ?
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
            gap: { xs: 2, md: 2.25 },
            alignItems: 'stretch',
          }}
        >
          <Paper elevation={1} sx={paperCardSx}>
            <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  bgcolor: `${INSTITUTIONAL_TEAL}29`,
                  color: INSTITUTIONAL_TEAL,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                }}
                aria-hidden
              >
                S
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Política de autenticación
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ISO 27001 A.5.17 · valores operativos en NestJS
                </Typography>
              </Box>
            </Stack>

            <Stack spacing={2}>
              <PolicyRow
                title="Política mínima de contraseña (altas/restablecimientos)"
                description={`${summary.passwordPolicy.minLength} caracteres (DTO validación servidor)`}
                control={
                  <ReadOnlySwitch
                    checked={
                      summary.passwordPolicy.enforcedOnUserCreate &&
                      summary.passwordPolicy.minLength > 0
                    }
                  />
                }
              />
              <Divider />
              <PolicyRow
                title="Bloqueo tras intentos fallidos"
                description={`${summary.accountLockout.maxFailedAttempts} intentos → bloqueo ${summary.accountLockout.lockoutMinutes} min`}
                control={<ReadOnlySwitch checked={summary.accountLockout.enabled} />}
              />
              <Divider />
              <PolicyRow
                title="Caducidad del token de acceso (JWT)"
                description={`Valor actual: ${summary.jwtAccessExpiresIn}. Cookie de refresco ~${summary.refreshSessionDays} día(s)`}
                control={<ReadOnlySwitch checked />}
              />
              <Divider />
              <PolicyRow
                title="Historial de contraseñas previas"
                description={
                  summary.passwordReuseHistory.implemented ?
                    `Últimas ${summary.passwordReuseHistory.lastPasswordsRemembered}`
                  : 'No implementado en backend'
                }
                control={<ReadOnlySwitch checked={summary.passwordReuseHistory.implemented} />}
              />
              <Divider />
              <PolicyRow
                title="Segundo factor / paso extra para ADMIN"
                description={
                  summary.adminStepUpAuth.implemented ?
                    'Activo según servidor'
                  : 'Pendiente (no configurado)'
                }
                control={<ReadOnlySwitch checked={summary.adminStepUpAuth.implemented} />}
              />
            </Stack>

            <Button
              variant="contained"
              onClick={() => setSaveDialogOpen(true)}
              sx={{
                mt: 3,
                textTransform: 'none',
                fontWeight: 800,
                bgcolor: INSTITUTIONAL_TEAL,
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': { bgcolor: INSTITUTIONAL_TEAL, filter: 'brightness(0.97)' },
              }}
            >
              Guardar política
            </Button>
          </Paper>

          <Paper elevation={1} sx={paperCardSx}>
            <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  bgcolor: 'rgba(14,165,233,0.22)',
                  color: '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                }}
                aria-hidden
              >
                A
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Controles de aplicación
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Lineamientos OWASP ASVS (evidencias técnicas resumidas)
                </Typography>
              </Box>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.75 }}>
              Login acotado: {ctr?.loginThrottle.limitPerIp} intentos / {ctr?.loginThrottle.windowMinutes} min por IP
              (endpoint <code>/auth/login</code>).
            </Typography>

            <Stack spacing={1.25}>
              {controlBadgeRow(
                'Validación de entradas',
                'DTO + ValidationPipe global (whitelist/forbid)',
                ctr?.globalValidationPipe ? <ActivaBadge /> : null,
              )}
              {controlBadgeRow(
                'Superficie web / navegador',
                'Helmet + CORS credenciales; JWT en cliente; cookie HttpOnly refresh',
                ctr?.helmetEnabled && ctr?.corsWithCredentials ? <ActivaBadge /> : null,
              )}
              {controlBadgeRow(
                'Cabeceras seguras base',
                'Helmet (p. ej. frameguard/XCTO según presets)',
                ctr?.helmetEnabled ? <ActivaBadge /> : null,
              )}
              {controlBadgeRow(
                'Manejo de errores API',
                'Filtros de auditoría; sin fugas deliberadas en payload genéricos',
                <ActivaBadge />,
              )}
              {controlBadgeRow(
                'Carga de archivos',
                `MIME permitido en upload y límite ${ctr?.fileUpload.maxMegabytes} MB`,
                ctr?.fileUpload.mimeAllowlistEnforced ? <ActivaBadge /> : null,
              )}
            </Stack>
          </Paper>
        </Box>
      : null}

      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Guardar política</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Los parámetros mostrados se obtienen de la configuración compilada (<code>NestJS</code>, variables de entorno,
            límites de Multer). No existe persistencia editable desde esta interfaz sin extender modelo de configuración en
            base de datos.
          </Typography>
          <Typography variant="body2">
            Para ajustes reales revise <code>.env</code>/<code>.env.example</code>, rutas protegidas y DTO — y documente
            el cambio en la bitácora de seguridad de la institución.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
