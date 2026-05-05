import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { apiClient } from '../api/client';
import { AuthLayout } from '../layouts/AuthLayout';

const schema = z.object({
  token: z.string().min(1, 'Token requerido'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenFromUrl = useMemo(() => searchParams.get('token') ?? '', [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { token: tokenFromUrl, newPassword: '' },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await apiClient.post('/auth/password-reset/confirm', {
        token: data.token,
        newPassword: data.newPassword,
      });
      setDone(true);
    } catch {
      setError(
        'No fue posible restablecer la contraseña. El enlace puede haber expirado o ser inválido.',
      );
    }
  };

  return (
    <AuthLayout title="Restablecer contraseña">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ingrese el token recibido y su nueva contraseña. Tras confirmar, deberá iniciar sesión de
        nuevo.
      </Typography>

      {done ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Contraseña actualizada. Ya puede iniciar sesión con sus nuevas credenciales.
        </Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            label="Token"
            fullWidth
            margin="normal"
            error={!!errors.token}
            helperText={errors.token?.message}
            {...register('token')}
          />
          <TextField
            label="Nueva contraseña"
            type="password"
            fullWidth
            margin="normal"
            autoComplete="new-password"
            error={!!errors.newPassword}
            helperText={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Confirmando…' : 'Confirmar restablecimiento'}
          </Button>
        </Box>
      )}

      <Button component={RouterLink} to="/login" variant="text" fullWidth sx={{ mt: 2 }}>
        Volver al inicio de sesión
      </Button>
    </AuthLayout>
  );
}
