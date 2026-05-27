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
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        Si necesita este acceso, solicítelo al administrador del sistema documental.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" color="primary" fullWidth size="large">
        Volver al inicio
      </Button>
    </AuthLayout>
  );
}
