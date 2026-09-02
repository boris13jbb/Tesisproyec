import { Box, Button, TextField, Typography } from '@mui/material';

type Props = {
  mfaCode: string;
  busy: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export function MfaVerifyPanel({
  mfaCode,
  busy,
  onCodeChange,
  onSubmit,
  onBack,
}: Props) {
  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 900, mb: 0.5 }}>
        Verificación en dos pasos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Ingrese el código de 6 dígitos de su aplicación autenticadora.
      </Typography>

      <TextField
        label="Código de 6 dígitos"
        value={mfaCode}
        onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        fullWidth
        margin="normal"
        autoFocus
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
        disabled={busy}
        sx={{ mt: 1, borderRadius: 3, py: 1.3 }}
      >
        {busy ? 'Verificando…' : 'Confirmar código'}
      </Button>

      <Button variant="text" fullWidth sx={{ mt: 1 }} disabled={busy} onClick={onBack}>
        Volver a iniciar con credenciales
      </Button>
    </Box>
  );
}
