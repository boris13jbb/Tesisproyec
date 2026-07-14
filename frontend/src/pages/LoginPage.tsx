import { zodResolver } from '@hookform/resolvers/zod';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/api-error-message';

const loginSchema = z.object({
  email: z.string().min(1, 'Correo requerido').email('Correo no válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

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
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (ready && user) {
    return <Navigate to="/" replace />;
  }

  const onSubmitCredentials = async (data: LoginForm) => {
    setError(null);
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
        setSetupSecret(null);
        setMfaCode('');
        return;
      }

      if (
        'mfaSetupRequired' in loginRes &&
        loginRes.mfaSetupRequired
      ) {
        setStep('MFA_SETUP_REQUIRED');
        setSetupChallengeToken(loginRes.setupChallengeToken);
        setChallengeToken(null);
        setMfaCode('');
        setSetupBusy(true);
        setSetupSecret(null);
        try {
          const { data: setupBegin } = await apiClient.post<{ secret: string }>(
            '/auth/mfa/setup/begin-login',
            {
              setupChallengeToken: loginRes.setupChallengeToken,
            },
          );
          setSetupSecret(setupBegin.secret);
        } finally {
          setSetupBusy(false);
        }
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
      setSession(data.accessToken, data.user);
      await navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Código de verificación inválido o expirado.'));
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
        bgcolor: '#EAF1F6',
        backgroundImage:
          'radial-gradient(900px 420px at 18% 30%, rgba(30, 58, 95, 0.10) 0%, rgba(30, 58, 95, 0) 60%)',
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
              backgroundColor: '#0D2C46',
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
                backgroundImage:
                  'radial-gradient(circle at 18% 18%, rgba(24, 226, 206, 0.35) 0 2px, rgba(24, 226, 206, 0) 3px), radial-gradient(980px 520px at 12% 18%, rgba(20, 198, 183, 0.25) 0%, rgba(20, 198, 183, 0) 62%)',
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
                border: '2px solid rgba(24, 226, 206, 0.35)',
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
                border: '2px solid rgba(24, 226, 206, 0.25)',
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
                      bgcolor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 3,
                      px: 2,
                      py: 1.6,
                      color: 'inherit',
                    }}
                  >
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                      <CheckCircleRoundedIcon sx={{ color: '#22C3B3' }} />
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
                border: '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: '0 18px 60px rgba(15, 23, 42, 0.10)',
                p: { xs: 3, sm: 4, md: 5 },
              }}
            >
              <Typography variant="h4" component="h2" sx={{ fontWeight: 900, mb: 0.5 }}>
                Iniciar sesión
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ingrese sus credenciales institucionales.
              </Typography>

              {step === 'CREDENTIALS' ? (
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
                      bgcolor: '#FCE7E7',
                      border: '1px solid rgba(185, 28, 28, 0.12)',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: '#9F1239', fontWeight: 700 }}
                    >
                      Acceso restringido a la red local institucional
                    </Typography>
                  </Paper>
                </Box>
              ) : (
                <Box component="form" onSubmit={(e) => { e.preventDefault(); void onSubmitMfa(); }} noValidate>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
                    {step === 'MFA_REQUIRED'
                      ? 'Verificación en dos pasos'
                      : 'Configurar verificación en dos pasos'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Ingrese el código de su app autenticadora.
                  </Typography>

                  {step === 'MFA_SETUP_REQUIRED' && (
                    <>
                      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                          En este acceso el sistema solicita enrolar su TOTP. En la app
                          autenticadora agregue una cuenta con la clave indicada.
                        </Typography>
                      </Alert>

                      <TextField
                        label="Clave TOTP (secret)"
                        value={setupSecret ?? ''}
                        placeholder="Generando…"
                        fullWidth
                        margin="normal"
                        size="small"
                        disabled={setupBusy}
                      />
                      {setupBusy ? (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Preparando enrolamiento…
                        </Typography>
                      ) : null}
                    </>
                  )}

                  <TextField
                    label="Código de 6 dígitos"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    fullWidth
                    margin="normal"
                    slotProps={{
                      htmlInput: {
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        maxLength: 6,
                        autoComplete: 'one-time-code',
                        'aria-label': 'Código de verificación de 6 dígitos',
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    fullWidth
                    size="large"
                    disabled={mfaBusy || setupBusy}
                    sx={{ mt: 1, borderRadius: 3, py: 1.3 }}
                  >
                    {mfaBusy ? 'Verificando…' : step === 'MFA_REQUIRED' ? 'Confirmar código' : 'Finalizar configuración'}
                  </Button>

                  <Button
                    variant="text"
                    fullWidth
                    sx={{ mt: 1 }}
                    disabled={mfaBusy || setupBusy}
                    onClick={() => {
                      setStep('CREDENTIALS');
                      setChallengeToken(null);
                      setSetupChallengeToken(null);
                      setSetupSecret(null);
                      setMfaCode('');
                      setError(null);
                    }}
                  >
                    Volver a iniciar con credenciales
                  </Button>
                </Box>
              )}
            </Paper>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
