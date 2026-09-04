import { zodResolver } from '@hookform/resolvers/zod';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { apiClient } from '../api/client';
import { MfaSetupPanel, type MfaSetupPayload } from '../components/auth/MfaSetupPanel';
import { MfaVerifyPanel } from '../components/auth/MfaVerifyPanel';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/api-error-message';

const loginSchema = z.object({
  email: z.string().min(1, 'Correo requerido').email('Correo no válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

const MFA_INVALID_CODE_MSG =
  'El código ingresado no es válido. Verifica tu aplicación autenticadora e inténtalo nuevamente.';

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession, user, ready } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<
    'CREDENTIALS' | 'MFA_REQUIRED' | 'MFA_SETUP_REQUIRED'
  >('CREDENTIALS');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [setupChallengeToken, setSetupChallengeToken] = useState<
    string | null
  >(null);
  const [setupEmail, setSetupEmail] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupPayload, setSetupPayload] = useState<MfaSetupPayload | null>(null);
  const [setupLoadError, setSetupLoadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const clearSensitiveMfaState = useCallback(() => {
    setSetupPayload(null);
    setSetupLoadError(null);
    setSetupEmail(null);
    setMfaCode('');
  }, []);

  const resetToCredentials = useCallback(() => {
    setStep('CREDENTIALS');
    setChallengeToken(null);
    setSetupChallengeToken(null);
    clearSensitiveMfaState();
    setError(null);
  }, [clearSensitiveMfaState]);

  useEffect(() => {
    return () => {
      setSetupPayload(null);
    };
  }, []);

  const loadMfaSetup = useCallback(async (token: string) => {
    setSetupBusy(true);
    setSetupLoadError(null);
    setSetupPayload(null);
    try {
      const { data } = await apiClient.post<MfaSetupPayload>(
        '/auth/mfa/setup/begin-login',
        { setupChallengeToken: token },
      );
      setSetupPayload({
        otpauthUrl: data.otpauthUrl,
        secretMasked: data.secretMasked,
      });
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setSetupLoadError('La sesión de configuración expiró.');
      } else {
        setSetupLoadError('No fue posible preparar la verificación en dos pasos.');
      }
    } finally {
      setSetupBusy(false);
    }
  }, []);

  if (ready && user) {
    return <Navigate to="/" replace />;
  }

  const onSubmitCredentials = async (data: LoginForm) => {
    setError(null);
    clearSensitiveMfaState();
    try {
      const { data: loginRes } = await apiClient.post<
        | {
            accessToken: string;
            user: import('../auth/types').AuthUser;
          }
        | {
            mfaRequired: true;
            challengeToken: string;
            email: string;
          }
        | {
            mfaSetupRequired: true;
            setupChallengeToken: string;
            email: string;
          }
      >('/auth/login', { email: data.email, password: data.password });

      if ('accessToken' in loginRes) {
        setSession(loginRes.accessToken, loginRes.user);
        await navigate('/', { replace: true });
        return;
      }

      if ('mfaRequired' in loginRes && loginRes.mfaRequired) {
        setStep('MFA_REQUIRED');
        setChallengeToken(loginRes.challengeToken);
        setSetupChallengeToken(null);
        setMfaCode('');
        return;
      }

      if (
        'mfaSetupRequired' in loginRes &&
        loginRes.mfaSetupRequired
      ) {
        setStep('MFA_SETUP_REQUIRED');
        setSetupChallengeToken(loginRes.setupChallengeToken);
        setSetupEmail(loginRes.email);
        setChallengeToken(null);
        setMfaCode('');
        await loadMfaSetup(loginRes.setupChallengeToken);
        return;
      }
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'No fue posible completar la autenticación. Verifique sus credenciales o el código de verificación.',
        ),
      );
    }
  };

  const onSubmitMfa = async (): Promise<void> => {
    if (!mfaCode || !/^\d{6}$/.test(mfaCode)) {
      setError('El código debe tener 6 dígitos.');
      return;
    }
    if (step === 'MFA_REQUIRED' && !challengeToken) {
      setError('Falta el token de verificación.');
      return;
    }
    if (step === 'MFA_SETUP_REQUIRED' && !setupChallengeToken) {
      setError('Falta el token de enrolamiento.');
      return;
    }
    if (step === 'MFA_SETUP_REQUIRED' && !setupPayload) {
      setError('Espere a que el código QR esté listo o reintente la configuración.');
      return;
    }

    setError(null);
    setMfaBusy(true);
    try {
      if (step === 'MFA_REQUIRED') {
        const { data } = await apiClient.post<{
          accessToken: string;
          user: import('../auth/types').AuthUser;
        }>('/auth/mfa/verify-login', {
          challengeToken,
          code: mfaCode,
        });
        clearSensitiveMfaState();
        setSession(data.accessToken, data.user);
        await navigate('/', { replace: true });
        return;
      }

      const { data } = await apiClient.post<{
        accessToken: string;
        user: import('../auth/types').AuthUser;
      }>('/auth/mfa/setup/confirm-login', {
        setupChallengeToken,
        code: mfaCode,
      });
      clearSensitiveMfaState();
      setSession(data.accessToken, data.user);
      await navigate('/', { replace: true });
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 401) {
        const msg = messageFromBody(err.response.data);
        if (step === 'MFA_SETUP_REQUIRED' && !msg) {
          setSetupLoadError('La sesión de configuración expiró.');
          setSetupPayload(null);
          setError(null);
        } else {
          setError(
            msg && !msg.toLowerCase().includes('expir')
              ? MFA_INVALID_CODE_MSG
              : 'La sesión de configuración expiró. Vuelva a iniciar sesión.',
          );
        }
      } else {
        setError(
          getApiErrorMessage(err, MFA_INVALID_CODE_MSG),
        );
      }
    } finally {
      setMfaBusy(false);
    }
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        bgcolor: 'background.default',
        backgroundImage: (t) =>
          `radial-gradient(900px 420px at 18% 30%, ${alpha(t.palette.primary.main, 0.1)} 0%, ${alpha(t.palette.primary.main, 0)} 60%)`,
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          py: { xs: 4, md: 6 },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 6 }}
          sx={{ width: '100%', alignItems: 'stretch' }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              borderRadius: 4,
              px: { xs: 3, sm: 4, md: 5 },
              py: { xs: 4, md: 5 },
              color: 'common.white',
              backgroundColor: 'primary.dark',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0.9,
                pointerEvents: 'none',
                backgroundImage: (t) =>
                  `radial-gradient(circle at 18% 18%, ${alpha(t.palette.secondary.light, 0.35)} 0 2px, ${alpha(t.palette.secondary.light, 0)} 3px), radial-gradient(980px 520px at 12% 18%, ${alpha(t.palette.secondary.main, 0.25)} 0%, ${alpha(t.palette.secondary.main, 0)} 62%)`,
              }}
            />
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: -160,
                left: -220,
                width: 560,
                height: 560,
                borderRadius: '50%',
                border: (t) => `2px solid ${alpha(t.palette.secondary.light, 0.35)}`,
              }}
            />
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: -80,
                left: -80,
                width: 460,
                height: 460,
                borderRadius: '50%',
                border: (t) => `2px solid ${alpha(t.palette.secondary.light, 0.25)}`,
              }}
            />
            <Box sx={{ position: 'relative' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.6, mb: 1 }}>
                GADPR-LM
              </Typography>
              <Typography
                variant="h3"
                component="h1"
                sx={{ fontWeight: 900, lineHeight: 1.06, maxWidth: 520, mb: 2 }}
              >
                Gestión documental institucional segura
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.88, maxWidth: 520, mb: 4 }}>
                Organización, clasificación, control de acceso y conservación de documentos
                institucionales.
              </Typography>

              <Stack spacing={1.5} sx={{ maxWidth: 480 }}>
                {[
                  {
                    title: 'Autenticación segura',
                    subtitle: 'Usuario + contraseña',
                  },
                  {
                    title: 'Acceso por roles',
                    subtitle: 'Administrador / Usuario',
                  },
                  {
                    title: 'Sesiones protegidas',
                    subtitle: 'Control de ingreso intranet',
                  },
                ].map((item) => (
                  <Paper
                    key={item.title}
                    elevation={0}
                    sx={{
                      bgcolor: (t) => alpha(t.palette.common.white, 0.08),
                      border: (t) => `1px solid ${alpha(t.palette.common.white, 0.1)}`,
                      borderRadius: 3,
                      px: 2,
                      py: 1.6,
                      color: 'inherit',
                    }}
                  >
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                      <CheckCircleRoundedIcon sx={{ color: 'secondary.light' }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                          {item.title}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.85 }}>
                          {item.subtitle}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                maxWidth: 520,
                borderRadius: 4,
                border: 1,
                borderColor: 'divider',
                boxShadow: 5,
                p: { xs: 3, sm: 4, md: 5 },
              }}
            >
              {step === 'CREDENTIALS' ? (
                <>
                  <Typography variant="h4" component="h2" sx={{ fontWeight: 900, mb: 0.5 }}>
                    Iniciar sesión
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Ingrese sus credenciales institucionales.
                  </Typography>

                  <Box
                    component="form"
                    onSubmit={handleSubmit(onSubmitCredentials)}
                    noValidate
                  >
                    {error && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                      </Alert>
                    )}

                    <TextField
                      label="Correo o usuario"
                      type="email"
                      fullWidth
                      margin="normal"
                      autoComplete="email"
                      placeholder="admin@gadprlm.local"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      {...register('email')}
                    />
                    <TextField
                      label="Contraseña"
                      type="password"
                      fullWidth
                      margin="normal"
                      autoComplete="current-password"
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      {...register('password')}
                    />

                    <Box sx={{ mt: 1, mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button component={RouterLink} to="/recuperar" variant="text" size="small">
                        ¿Olvidó su contraseña?
                      </Button>
                    </Box>

                    <Button
                      type="submit"
                      variant="contained"
                      color="secondary"
                      fullWidth
                      size="large"
                      sx={{ mt: 0.5, borderRadius: 3, py: 1.3 }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Ingresando…' : 'Ingresar al sistema'}
                    </Button>

                    <Paper
                      elevation={0}
                      sx={{
                        mt: 2,
                        px: 2,
                        py: 1.1,
                        borderRadius: 3,
                        bgcolor: (t) => alpha(t.palette.error.main, 0.08),
                        border: (t) => `1px solid ${alpha(t.palette.error.main, 0.12)}`,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'error.dark', fontWeight: 700 }}>
                        Acceso restringido a la red local institucional
                      </Typography>
                    </Paper>
                  </Box>
                </>
              ) : (
                <>
                  {error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  ) : null}

                  {step === 'MFA_REQUIRED' ? (
                    <MfaVerifyPanel
                      mfaCode={mfaCode}
                      busy={mfaBusy}
                      onCodeChange={setMfaCode}
                      onSubmit={() => void onSubmitMfa()}
                      onBack={resetToCredentials}
                    />
                  ) : (
                    <MfaSetupPanel
                      email={setupEmail ?? undefined}
                      setupPayload={setupPayload}
                      loading={setupBusy}
                      loadError={setupLoadError}
                      mfaCode={mfaCode}
                      busy={mfaBusy}
                      onCodeChange={setMfaCode}
                      onSubmit={() => void onSubmitMfa()}
                      onBack={resetToCredentials}
                      onRetrySetup={() => {
                        if (setupChallengeToken) {
                          void loadMfaSetup(setupChallengeToken);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </Paper>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

function messageFromBody(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const m = (data as { message?: string | string[] }).message;
  if (Array.isArray(m)) {
    const joined = m.map((x) => String(x).trim()).filter(Boolean).join(' ');
    return joined.length > 0 ? joined : null;
  }
  if (typeof m === 'string' && m.trim()) {
    return m.trim();
  }
  return null;
}
