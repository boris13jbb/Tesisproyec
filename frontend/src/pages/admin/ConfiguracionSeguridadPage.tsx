import { useEffect, useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { apiClient } from '../../api/client';
import {
  APPLICATION_CONTROL_ROWS,
  SECURITY_CONFIG_COPY,
} from '../../constants/security-config-labels';
import { PageHeader } from '../../components/PageHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { listSurfaceSx } from '../../components/listSurfaces';
import { getApiErrorMessage } from '../../utils/api-error-message';

const paperCardSx = {
  ...listSurfaceSx,
  p: { xs: 2, md: 2.75 },
};

type AdminSecuritySummary = {
  schemaVersion: 1;
  passwordPolicy: { minLength: number; enforcedOnUserCreate: boolean };
  passwordReuseHistory: { enabled: boolean; retainCount: number };
  adminMfa: { requiredForAdmin: boolean; algorithm: 'TOTP' };
  accountLockout: {
    enabled: boolean;
    maxFailedAttempts: number;
    lockoutMinutes: number;
  };
  jwtAccessExpiresIn: string;
  refreshSessionDays: number;
  applicationControls: {
    helmetEnabled: boolean;
    globalValidationPipe: boolean;
    corsWithCredentials: boolean;
    loginThrottle: { limitPerIp: number; windowMinutes: number };
    fileUpload: { maxMegabytes: number; mimeAllowlistEnforced: boolean };
  };
};

type SecurityPolicyRecord = {
  schemaVersion: 1;
  desired: {
    passwordMinLength: number;
    lockoutEnabled: boolean;
    lockoutMaxAttempts: number;
    lockoutMinutes: number;
    jwtAccessExpiresIn: string;
    refreshSessionDays: number;
    passwordHistoryCount: number;
    adminStepUpAuth: boolean;
  };
  notes: string | null;
  updatedAt: string | null;
  updatedBy: { userId: string | null; email: string | null } | null;
};

function ControlStatusChip({ active }: { active: boolean }) {
  return (
    <Chip
      size="small"
      label={active ? 'Activa' : 'No activo'}
      color={active ? 'success' : 'default'}
      variant={active ? 'filled' : 'outlined'}
      sx={{ fontWeight: 700, '& .MuiChip-label': { px: 1 } }}
    />
  );
}

function EffectiveControlCard({
  title,
  value,
  caption,
}: {
  title: string;
  value: string;
  caption?: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: { xs: 1.75, md: 2 },
        py: { xs: 1.35, md: 1.5 },
        borderRadius: 2,
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.35 }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
        {value}
      </Typography>
      {caption ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {caption}
        </Typography>
      ) : null}
    </Paper>
  );
}

function AuthenticationStatusPanel(props: {
  summary: AdminSecuritySummary;
  policy: SecurityPolicyRecord | null;
  saveBusy: boolean;
  setSaveBusy: (v: boolean) => void;
  setSaveMsg: (v: { severity: 'success' | 'warning'; text: string } | null) => void;
  setPolicy: (p: SecurityPolicyRecord | null) => void;
}) {
  const { summary, policy, saveBusy, setSaveBusy, setSaveMsg, setPolicy } = props;
  const [notes, setNotes] = useState(() => policy?.notes ?? '');

  async function saveReview(): Promise<void> {
    setSaveBusy(true);
    setSaveMsg(null);
    try {
      const payload = {
        desiredPasswordMinLength: summary.passwordPolicy.minLength,
        desiredLockoutEnabled: summary.accountLockout.enabled,
        desiredLockoutMaxAttempts: summary.accountLockout.maxFailedAttempts,
        desiredLockoutMinutes: summary.accountLockout.lockoutMinutes,
        desiredJwtAccessExpiresIn: summary.jwtAccessExpiresIn,
        desiredRefreshSessionDays: summary.refreshSessionDays,
        desiredPasswordHistoryCount: summary.passwordReuseHistory.retainCount,
        desiredAdminStepUpAuth: summary.adminMfa.requiredForAdmin,
        notes: String(notes ?? '').trim() || undefined,
      };
      const { data } = await apiClient.post<SecurityPolicyRecord>(
        '/auth/admin/security-policy',
        payload,
      );
      setPolicy(data);
      setSaveMsg({
        severity: 'success',
        text: SECURITY_CONFIG_COPY.saveSuccess,
      });
    } catch (err: unknown) {
      setSaveMsg({
        severity: 'warning',
        text: getApiErrorMessage(err, SECURITY_CONFIG_COPY.saveFail),
      });
    } finally {
      setSaveBusy(false);
    }
  }

  const lockoutValue = summary.accountLockout.enabled
    ? `Tras ${summary.accountLockout.maxFailedAttempts} intentos fallidos, bloqueo ${summary.accountLockout.lockoutMinutes} minutos`
    : 'Desactivado';

  return (
    <>
      <SectionHeader
        icon={<SecurityOutlinedIcon fontSize="small" />}
        title={SECURITY_CONFIG_COPY.authPanelTitle}
        subtitle={SECURITY_CONFIG_COPY.authPanelSubtitle}
      />

      <Alert severity="info" sx={{ mt: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="body2">{SECURITY_CONFIG_COPY.opsNote}</Typography>
      </Alert>

      <Stack spacing={1.25}>
        <EffectiveControlCard
          title="Longitud mínima de contraseña"
          value={`${summary.passwordPolicy.minLength} caracteres`}
          caption="Al crear usuarios y al restablecer contraseña."
        />
        <EffectiveControlCard
          title="Bloqueo por contraseña incorrecta"
          value={lockoutValue}
          caption="Protege cuentas ante intentos repetidos de ingreso."
        />
        <EffectiveControlCard
          title="Duración de la sesión"
          value={`Activa hasta ${summary.jwtAccessExpiresIn} sin uso · recordar ingreso ${summary.refreshSessionDays} día(s) en este equipo`}
          caption="Cierre de sesión automático y opción «mantener sesión» en el login."
        />
        <EffectiveControlCard
          title="Límite de intentos en la pantalla de ingreso"
          value={`${summary.applicationControls.loginThrottle.limitPerIp} intentos cada ${summary.applicationControls.loginThrottle.windowMinutes} minutos por conexión`}
          caption="Complementa el bloqueo de cuenta; reduce abuso desde la misma red."
        />
        <EffectiveControlCard
          title="Historial de contraseñas"
          value={
            summary.passwordReuseHistory.enabled
              ? `Activa: últimas ${summary.passwordReuseHistory.retainCount} contraseñas`
              : 'Desactivado'
          }
          caption="Evita que un usuario reutilice contraseñas recientes cuando la política está activa."
        />
        <EffectiveControlCard
          title="MFA para administradores (TOTP)"
          value={
            summary.adminMfa.requiredForAdmin
              ? 'Requerida al iniciar sesión'
              : 'No requerida'
          }
          caption="Cuando se requiere, el ADMIN configura o verifica su TOTP antes de obtener sesión."
        />
      </Stack>

      <Divider sx={{ my: 2.5 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
        {SECURITY_CONFIG_COPY.reviewSectionTitle}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
        {SECURITY_CONFIG_COPY.reviewSectionHelper}
      </Typography>

      <TextField
        label={SECURITY_CONFIG_COPY.notesLabel}
        helperText={SECURITY_CONFIG_COPY.notesHelper}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        multiline
        minRows={3}
        size="small"
        fullWidth
      />

      <Button
        variant="contained"
        color="secondary"
        onClick={() => void saveReview()}
        disabled={saveBusy}
        sx={{
          mt: 2,
          textTransform: 'none',
          fontWeight: 800,
          borderRadius: 2,
        }}
      >
        {saveBusy ? SECURITY_CONFIG_COPY.savingReviewButton : SECURITY_CONFIG_COPY.saveReviewButton}
      </Button>

      {policy?.updatedAt ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1.25 }}
        >
          Último registro: {new Date(policy.updatedAt).toLocaleString('es-EC')} ·{' '}
          {policy.updatedBy?.email ?? '—'}
        </Typography>
      ) : null}
    </>
  );
}

export function ConfiguracionSeguridadPage() {
  const [summary, setSummary] = useState<AdminSecuritySummary | null>(null);
  const [policy, setPolicy] = useState<SecurityPolicyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ severity: 'success' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const [summaryRes, policyRes] = await Promise.all([
          apiClient.get<AdminSecuritySummary>('/auth/admin/security-summary'),
          apiClient.get<SecurityPolicyRecord>('/auth/admin/security-policy'),
        ]);
        if (!cancelled) {
          setSummary(summaryRes.data);
          setPolicy(policyRes.data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setSummary(null);
          setPolicy(null);
          setError(getApiErrorMessage(err, SECURITY_CONFIG_COPY.loadFail));
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
    technicalHint: string,
    badge: ReactNode,
  ) => (
    <Paper
      variant="outlined"
      sx={{
        px: { xs: 1.75, md: 2 },
        py: { xs: 1.35, md: 1.5 },
        borderRadius: 2,
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Tooltip title={technicalHint} arrow placement="top">
              <InfoOutlinedIcon
                sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }}
                aria-label="Detalle técnico"
              />
            </Tooltip>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {desc}
          </Typography>
        </Box>
        {badge}
      </Stack>
    </Paper>
  );

  const appControlActive = (index: number): boolean => {
    if (!ctr) return false;
    switch (index) {
      case 0:
        return ctr.globalValidationPipe;
      case 1:
        return ctr.helmetEnabled && ctr.corsWithCredentials;
      case 2:
        return ctr.helmetEnabled;
      case 3:
        return ctr.fileUpload.mimeAllowlistEnforced;
      default:
        return false;
    }
  };

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
              {SECURITY_CONFIG_COPY.pageSubtitle}
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
        <Typography variant="body2">{SECURITY_CONFIG_COPY.infoBanner}</Typography>
      </Alert>

      {saveMsg ? (
        <Alert severity={saveMsg.severity} sx={{ mb: 2 }} onClose={() => setSaveMsg(null)}>
          {saveMsg.text}
        </Alert>
      ) : null}

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
            <AuthenticationStatusPanel
              key={policy?.updatedAt ?? 'policy-inicial'}
              summary={summary}
              policy={policy}
              saveBusy={saveBusy}
              setSaveBusy={setSaveBusy}
              setSaveMsg={setSaveMsg}
              setPolicy={setPolicy}
            />
          </Paper>

          <Paper elevation={1} sx={paperCardSx}>
            <SectionHeader
              icon={<SettingsOutlinedIcon fontSize="small" />}
              title={SECURITY_CONFIG_COPY.appPanelTitle}
              subtitle={SECURITY_CONFIG_COPY.appPanelSubtitle}
            />

            <Stack spacing={1.25} sx={{ mt: 2 }}>
              {APPLICATION_CONTROL_ROWS.map((row, index) => {
                const active = appControlActive(index);
                const desc =
                  index === 3 && ctr
                    ? `${row.description} Tamaño máximo: ${ctr.fileUpload.maxMegabytes} MB.`
                    : row.description;
                return (
                  <Box key={row.title}>
                    {controlBadgeRow(
                      row.title,
                      desc,
                      row.technicalHint,
                      <ControlStatusChip active={active} />,
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Box>
      : null}
    </>
  );
}
