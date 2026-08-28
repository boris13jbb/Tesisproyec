import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';

export function NotFoundPage() {
  return (
    <AuthLayout title="Página no encontrada">
      <Stack spacing={2} sx={{ alignItems: 'stretch' }}>
        <Box
          aria-hidden
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
            color: 'primary.main',
            alignSelf: 'flex-start',
          }}
        >
          <SearchOffOutlinedIcon />
        </Box>
        <Typography variant="body2" color="text.secondary">
          La dirección solicitada no existe o ha sido movida. Compruebe la URL o utilice el menú del
          sistema.
        </Typography>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: 1, lineHeight: 1 }}
        >
          Código 404
        </Typography>
        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          color="secondary"
          fullWidth
          size="large"
        >
          Ir al inicio
        </Button>
      </Stack>
    </AuthLayout>
  );
}
