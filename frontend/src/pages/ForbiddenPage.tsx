import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';

export function ForbiddenPage() {
  return (
    <AuthLayout title="Acceso denegado">
      <Stack spacing={2} sx={{ alignItems: 'stretch' }}>
        <Box
          aria-hidden
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(185, 28, 28, 0.10)',
            color: 'error.main',
            alignSelf: 'flex-start',
          }}
        >
          <BlockOutlinedIcon />
        </Box>
        <Typography variant="body2" color="text.secondary">
          No tiene permiso para acceder a este recurso. Si cree que es un error, contacte al
          administrador del sistema.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Si necesita este acceso, solicítelo al administrador del sistema documental.
        </Typography>
        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          color="secondary"
          fullWidth
          size="large"
        >
          Volver al inicio
        </Button>
      </Stack>
    </AuthLayout>
  );
}
