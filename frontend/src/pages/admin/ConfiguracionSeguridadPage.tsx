import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
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

function StableSwitch(props: { checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <Switch
      checked={props.checked}
      disabled={props.disabled}
      onChange={(e) => props.onChange?.(e.target.checked)}
      size="medium"
      color="success"
      sx={{
        ...(props.disabled
          ? {
              '&.Mui-disabled': { opacity: 1 },
              '& .MuiSwitch-switchBase.Mui-disabled+.MuiSwitch-track': {
                opacity: props.checked ? 0.95 : 0.48,
              },
            }
          : null),
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

function PolicyPanel(props: {
  summary: AdminSecuritySummary;
  policy: SecurityPolicyRecord | null;
  draft: {
    desiredPasswordMinLength: number;
    desiredLockoutEnabled: boolean;
    desiredLockoutMaxAttempts: number;
    desiredLockoutMinutes: number;
    desiredJwtAccessExpiresIn: string;
    desiredRefreshSessionDays: number;
    desiredPasswordHistoryCount: number;
    desiredAdminStepUpAuth: boolean;
    notes: string;
  };
  saveBusy: boolean;
  setSaveBusy: (v: boolean) => void;
  setSaveMsg: (v: { severity: 'success' | 'warning'; text: string } | null) => void;
  setPolicy: (p: SecurityPolicyRecord | null) => void;
}) {
  const { summary, policy, draft, saveBusy, setSaveBusy, setSaveMsg, setPolicy } =
    props;
  const [form, setForm] = useState(() => draft);

  async function savePolicy(): Promise<void> {
    setSaveBusy(true);
    setSaveMsg(null);
    try {
      const payload = {
        desiredPasswordMinLength: Number(form.desiredPasswordMinLength),
        desiredLockoutEnabled: !!form.desiredLockoutEnabled,
        desiredLockoutMaxAttempts: Number(form.desiredLockoutMaxAttempts),
        desiredLockoutMinutes: Number(form.desiredLockoutMinutes),
        desiredJwtAccessExpiresIn: String(form.desiredJwtAccessExpiresIn ?? '').trim(),
        desiredRefreshSessionDays: Number(form.desiredRefreshSessionDays),
        desiredPasswordHistoryCount: Number(form.desiredPasswordHistoryCount),
        desiredAdminStepUpAuth: !!form.desiredAdminStepUpAuth,
        notes: String(form.notes ?? '').trim() || undefined,
      };
      const { data } = await apiClient.post<SecurityPolicyRecord>(
        '/auth/admin/security-policy',
        payload,
      );
      setPolicy(data);
      setSaveMsg({
        severity: 'success',
        text: 'Política institucional guardada y auditada (SECURITY_POLICY_UPDATED).',
      });
    } catch {
      setSaveMsg({
        severity: 'warning',
        text: 'No se pudo guardar la política (¿sesión ADMIN y backend en línea?).',
      });
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <>
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
            ISO 27001 A.5.17 · estado efectivo vs política institucional (editable)
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2}>
        <PolicyRow
          title="Política mínima de contraseña (altas/restablecimientos)"
          description={`Efectivo: ${summary.passwordPolicy.minLength} (DTO servidor). Política institucional: configurar valor deseado.`}
          control={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                size="small"
                type="number"
                value={form.desiredPasswordMinLength}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    desiredPasswordMinLength: Number(e.target.value),
                  }))
                }
                slotProps={{
                  htmlInput: {
                    min: 8,
                    max: 128,
                    'aria-label': 'Longitud mínima deseada',
                  },
                }}
                sx={{ width: 120 }}
              />
              <StableSwitch
                checked={
                  summary.passwordPolicy.enforcedOnUserCreate &&
                  summary.passwordPolicy.minLength > 0
                }
                disabled
              />
            </Stack>
          }
        />
        <Divider />
        <PolicyRow
          title="Bloqueo tras intentos fallidos"
          description={`Efectivo: ${summary.accountLockout.maxFailedAttempts} intentos → ${summary.accountLockout.lockoutMinutes} min. Política institucional: valores deseados.`}
          control={
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <StableSwitch
                checked={form.desiredLockoutEnabled}
                onChange={(v) =>
                  setForm((s) => ({ ...s, desiredLockoutEnabled: v }))
                }
              />
              <TextField
                size="small"
                type="number"
                value={form.desiredLockoutMaxAttempts}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    desiredLockoutMaxAttempts: Number(e.target.value),
                  }))
                }
                slotProps={{
                  htmlInput: { min: 1, max: 50, 'aria-label': 'Intentos máximos deseados' },
                }}
                sx={{ width: 110 }}
              />
              <TextField
                size="small"
                type="number"
                value={form.desiredLockoutMinutes}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    desiredLockoutMinutes: Number(e.target.value),
                  }))
                }
                slotProps={{
                  htmlInput: { min: 1, max: 1440, 'aria-label': 'Minutos de bloqueo deseados' },
                }}
                sx={{ width: 120 }}
              />
              <StableSwitch checked={summary.accountLockout.enabled} disabled />
            </Stack>
          }
        />
        <Divider />
        <PolicyRow
          title="Caducidad del token de acceso (JWT)"
          description={`Efectivo: ${summary.jwtAccessExpiresIn} (JWT) · refresco ${summary.refreshSessionDays} día(s). Política institucional: valor deseado.`}
          control={
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <TextField
                size="small"
                value={form.desiredJwtAccessExpiresIn}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    desiredJwtAccessExpiresIn: e.target.value,
                  }))
                }
                slotProps={{
                  htmlInput: { maxLength: 16, 'aria-label': 'JWT access expires in deseado' },
                }}
                sx={{ width: 120 }}
              />
              <TextField
                size="small"
                type="number"
                value={form.desiredRefreshSessionDays}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    desiredRefreshSessionDays: Number(e.target.value),
                  }))
                }
                slotProps={{
                  htmlInput: { min: 1, max: 365, 'aria-label': 'Días de refresh deseados' },
                }}
                sx={{ width: 120 }}
              />
              <StableSwitch checked disabled />
            </Stack>
          }
        />
        <Divider />
        <PolicyRow
          title="Historial de contraseñas previas"
          description={
            summary.passwordReuseHistory.implemented
              ? `Últimas ${summary.passwordReuseHistory.lastPasswordsRemembered}`
              : 'No implementado en backend'
          }
          control={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                size="small"
                type="number"
                value={form.desiredPasswordHistoryCount}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    desiredPasswordHistoryCount: Number(e.target.value),
                  }))
                }
                slotProps={{
                  htmlInput: { min: 0, max: 24, 'aria-label': 'Historial deseado (cantidad)' },
                }}
                sx={{ width: 120 }}
              />
              <StableSwitch checked={summary.passwordReuseHistory.implemented} disabled />
            </Stack>
          }
        />
        <Divider />
        <PolicyRow
          title="Segundo factor / paso extra para ADMIN"
          description={
            summary.adminStepUpAuth.implemented
              ? 'Activo según servidor'
              : 'Pendiente (no configurado)'
          }
          control={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <StableSwitch
                checked={form.desiredAdminStepUpAuth}
                onChange={(v) =>
                  setForm((s) => ({ ...s, desiredAdminStepUpAuth: v }))
                }
              />
              <StableSwitch checked={summary.adminStepUpAuth.implemented} disabled />
            </Stack>
          }
        />
      </Stack>

      <Button
        variant="contained"
        onClick={() => void savePolicy()}
        disabled={saveBusy}
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
        {saveBusy ? 'Guardando…' : 'Guardar política'}
      </Button>

      <TextField
        label="Notas (ISO 15489: contexto y justificación)"
        value={form.notes}
        onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
        multiline
        minRows={3}
        size="small"
        sx={{ mt: 2 }}
      />
      {policy?.updatedAt ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1 }}
        >
          Última actualización: {new Date(policy.updatedAt).toLocaleString('es-EC')} ·{' '}
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
      } catch {
        if (!cancelled) {
          setSummary(null);
          setPolicy(null);
          setError(
            'No se pudo leer la configuración de seguridad del servidor (¿ADMIN y backend en línea?).',
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

  const draft = useMemo(() => {
    const d = policy?.desired;
    return {
      desiredPasswordMinLength: d?.passwordMinLength ?? summary?.passwordPolicy.minLength ?? 8,
      desiredLockoutEnabled: d?.lockoutEnabled ?? summary?.accountLockout.enabled ?? true,
      desiredLockoutMaxAttempts: d?.lockoutMaxAttempts ?? summary?.accountLockout.maxFailedAttempts ?? 5,
      desiredLockoutMinutes: d?.lockoutMinutes ?? summary?.accountLockout.lockoutMinutes ?? 20,
      desiredJwtAccessExpiresIn: d?.jwtAccessExpiresIn ?? summary?.jwtAccessExpiresIn ?? '15m',
      desiredRefreshSessionDays: d?.refreshSessionDays ?? summary?.refreshSessionDays ?? 7,
      desiredPasswordHistoryCount: d?.passwordHistoryCount ?? 0,
      desiredAdminStepUpAuth: d?.adminStepUpAuth ?? false,
      notes: policy?.notes ?? '',
    };
  }, [policy, summary]);

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
          Esta pantalla separa dos cosas: (1) <strong>estado efectivo</strong> (lo que el backend aplica hoy) y (2){' '}
          <strong>política institucional</strong> persistida en base de datos como registro (ISO 15489), auditada al guardar.
        </Typography>
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
            <PolicyPanel
              key={policy?.updatedAt ?? 'policy-inicial'}
              summary={summary}
              policy={policy}
              draft={draft}
              saveBusy={saveBusy}
              setSaveBusy={setSaveBusy}
              setSaveMsg={setSaveMsg}
              setPolicy={setPolicy}
            />
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
                'Helmet + CORS credenciales; cookie HttpOnly refresh; JWT access en headers',
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
    </>
  );
}
