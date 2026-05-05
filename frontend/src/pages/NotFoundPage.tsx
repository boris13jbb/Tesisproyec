import { Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';

export function NotFoundPage() {
  return (
    <AuthLayout title="Página no encontrada">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        La dirección solicitada no existe o ha sido movida. Compruebe la URL o utilice el menú del
        sistema.
      </Typography>
      <Typography variant="overline" color="text.secondary" sx={{ mb: 2, letterSpacing: 1, display: 'block' }}>
        Código 404
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" color="primary" fullWidth size="large">
        Ir al inicio
      </Button>
    </AuthLayout>
  );
}
