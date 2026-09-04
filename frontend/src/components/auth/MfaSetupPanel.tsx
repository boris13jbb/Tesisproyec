import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import {
  Alert,
  Box,
  Button,
  Collapse,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { extractTotpSecretFromOtpauth } from './otpauth-secret';

export type MfaSetupPayload = {
  otpauthUrl: string;
  secretMasked: string;
};

type Props = {
  email?: string;
  setupPayload: MfaSetupPayload | null;
  loading: boolean;
  loadError: string | null;
  mfaCode: string;
  busy: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onRetrySetup: () => void;
};

function maskedSecretDisplay(secret: string, visible: boolean): string {
  if (visible) {
    return secret;
  }
  if (secret.length <= 4) {
    return '••••••••';
  }
  return `${secret.slice(0, 4)}${'•'.repeat(Math.max(8, secret.length - 8))}${secret.slice(-4)}`;
}

export function MfaSetupPanel({
  email,
  setupPayload,
  loading,
  loadError,
  mfaCode,
  busy,
  onCodeChange,
  onSubmit,
  onBack,
  onRetrySetup,
}: Props) {
  const [manualOpen, setManualOpen] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const handleCopySecret = async () => {
    const secret = setupPayload
      ? extractTotpSecretFromOtpauth(setupPayload.otpauthUrl)
      : '';
    if (!secret) {
      return;
    }
    try {
      await navigator.clipboard.writeText(secret);
      setCopyHint('Clave copiada al portapapeles.');
    } catch {
      setCopyHint('No se pudo copiar. Copie la clave manualmente.');
    }
  };

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 900, mb: 0.5 }}>
        Configurar verificación en dos pasos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Protege su cuenta con una aplicación autenticadora compatible (Google Authenticator,
        Microsoft Authenticator, Authy, 1Password u otra app TOTP).
      </Typography>

      {loadError ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {loadError}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
            {loadError.includes('expiró') ? (
              <Button variant="contained" size="small" onClick={onBack}>
                Volver a iniciar sesión
              </Button>
            ) : (
              <>
                <Button variant="outlined" size="small" onClick={onRetrySetup} disabled={loading}>
                  Reintentar
                </Button>
                <Button variant="text" size="small" onClick={onBack}>
                  Volver al inicio de sesión
                </Button>
              </>
            )}
          </Stack>
        </Alert>
      ) : null}

      {!loadError ? (
        <>
          <Typography
            variant="overline"
            sx={{ fontWeight: 800, letterSpacing: 1, color: 'text.secondary', display: 'block' }}
          >
            Paso 1 — Escanee el código QR
          </Typography>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              my: 2,
            }}
          >
            <Box
              aria-label="Código QR para configurar autenticador"
              role="img"
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#FFFFFF',
                border: 1,
                borderColor: 'divider',
                boxShadow: 1,
                lineHeight: 0,
              }}
            >
              {loading || !setupPayload?.otpauthUrl ? (
                <Skeleton variant="rounded" width={200} height={200} />
              ) : (
                <QRCodeSVG
                  value={setupPayload.otpauthUrl}
                  size={200}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  level="M"
                  includeMargin={false}
                />
              )}
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            Abra su aplicación autenticadora y escanee este código.
            {email ? (
              <>
                {' '}
                La cuenta aparecerá como <strong>{email}</strong>.
              </>
            ) : null}
          </Typography>

          <Button
            variant="text"
            size="small"
            onClick={() => setManualOpen((v) => !v)}
            disabled={loading || !setupPayload}
            sx={{ mb: 1, fontWeight: 700 }}
            aria-expanded={manualOpen}
          >
            {manualOpen ? 'Ocultar clave manual' : '¿No puede escanearlo? Usar clave manual'}
          </Button>

          <Collapse in={manualOpen}>
            <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Clave de configuración manual
              </Typography>
              <TextField
                value={
                  setupPayload
                    ? maskedSecretDisplay(
                        extractTotpSecretFromOtpauth(setupPayload.otpauthUrl),
                        secretVisible,
                      )
                    : ''
                }
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    readOnly: true,
                    'aria-label': 'Clave de configuración manual TOTP',
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSecretVisible((v) => !v)}
                          aria-label={secretVisible ? 'Ocultar clave' : 'Mostrar clave'}
                          disabled={!setupPayload}
                        >
                          {secretVisible ? (
                            <VisibilityOffRoundedIcon fontSize="small" />
                          ) : (
                            <VisibilityRoundedIcon fontSize="small" />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => void handleCopySecret()}
                          aria-label="Copiar clave manual"
                          disabled={!setupPayload}
                        >
                          <ContentCopyRoundedIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              {copyHint ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                  {copyHint}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                  Use esta clave solo si no puede escanear el QR.
                </Typography>
              )}
            </Box>
          </Collapse>

          <Typography
            variant="overline"
            sx={{ fontWeight: 800, letterSpacing: 1, color: 'text.secondary', display: 'block', mt: 1 }}
          >
            Paso 2 — Ingrese el código de 6 dígitos
          </Typography>

          <TextField
            label="Código de 6 dígitos"
            value={mfaCode}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            fullWidth
            margin="normal"
            disabled={loading || !setupPayload}
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
            disabled={busy || loading || !setupPayload}
            sx={{ mt: 1, borderRadius: 3, py: 1.3 }}
          >
            {busy ? 'Verificando…' : 'Finalizar configuración'}
          </Button>
        </>
      ) : null}

      <Button variant="text" fullWidth sx={{ mt: 1 }} disabled={busy || loading} onClick={onBack}>
        Volver a iniciar con credenciales
      </Button>
    </Box>
  );
}
