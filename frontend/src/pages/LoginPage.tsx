import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../auth/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';

const loginSchema = z.object({
  email: z.string().min(1, 'Correo requerido').email('Correo no válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user, ready } = useAuth();
  const [error, setError] = useState<string | null>(null);

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

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data.email, data.password);
      await navigate('/', { replace: true });
    } catch {
      setError(
        'No fue posible iniciar sesión. Verifique sus datos o intente más tarde.',
      );
    }
  };

  return (
    <AuthLayout title="Iniciar sesión">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Acceso con correo y contraseña institucional.
      </Typography>
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
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          sx={{ mt: 2 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </Box>
      <Button component={RouterLink} to="/recuperar" variant="text" fullWidth sx={{ mt: 1 }}>
        ¿Olvidó su contraseña?
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
        El uso de este sistema está restringido a personal autorizado. Las sesiones pueden quedar
        registradas con fines de seguridad y auditoría.
      </Typography>
    </AuthLayout>
  );
}
