import { Container, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';

export function NotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Página no encontrada.
      </Typography>
      <Link component={RouterLink} to="/" underline="hover">
        Volver al inicio
      </Link>
    </Container>
  );
}
