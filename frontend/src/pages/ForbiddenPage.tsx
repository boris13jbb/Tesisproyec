import { Button, Container, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h3" component="h1" gutterBottom>
        403
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No tienes permiso para acceder a este recurso.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Si crees que es un error, contacta al administrador del sistema.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Volver al inicio
      </Button>
    </Container>
  );
}
