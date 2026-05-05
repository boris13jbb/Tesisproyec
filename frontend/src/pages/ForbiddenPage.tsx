import { Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';

export function ForbiddenPage() {
  return (
    <AuthLayout title="Acceso denegado">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        No tiene permiso para acceder a este recurso. Si cree que es un error, contacte al
        administrador del sistema.
      </Typography>
      <Typography variant="overline" color="text.secondary" sx={{ mb: 2, letterSpacing: 1, display: 'block' }}>
        Código 403
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" color="primary" fullWidth size="large">
        Volver al inicio
      </Button>
    </AuthLayout>
  );
}
