import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { z } from 'zod';
import { apiClient } from '../api/client';
import { AuthLayout } from '../layouts/AuthLayout';

const schema = z.object({
  email: z.string().min(1, 'Correo requerido').email('Correo no válido'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await apiClient.post('/auth/password-reset/request', { email: data.email });
      setDone(true);
    } catch {
      setError('No se pudo completar la solicitud. Intente nuevamente más tarde.');
    }
  };

  return (
    <AuthLayout title="Recuperación de credenciales">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Si el correo está asociado a una cuenta, recibirá instrucciones para restablecer su
        contraseña. Por seguridad, el resultado mostrado es el mismo en todos los casos.
      </Typography>

      {done ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Si el correo está registrado en el sistema, recibirá instrucciones para restablecer su
          contraseña.
        </Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            label="Correo"
            type="email"
            fullWidth
            margin="normal"
            autoComplete="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
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
            {isSubmitting ? 'Enviando…' : 'Solicitar restablecimiento'}
          </Button>
        </Box>
      )}

      <Button component={RouterLink} to="/login" variant="text" fullWidth sx={{ mt: 2 }}>
        Volver al inicio de sesión
      </Button>
    </AuthLayout>
  );
}
