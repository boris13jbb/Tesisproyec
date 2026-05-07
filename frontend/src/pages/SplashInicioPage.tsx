import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Box, Button, Chip, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function SplashInicioPage() {
  const cards = [
    { id: 'card-1', top: 10, left: 0, rotate: -10, opacity: 0.92 },
    { id: 'card-2', top: 0, left: 70, rotate: 8, opacity: 0.85 },
    { id: 'card-3', top: 40, left: 140, rotate: 0, opacity: 0.78 },
  ] as const;

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#1E7C89',
        backgroundImage:
          'radial-gradient(900px 420px at 18% 22%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 60%), radial-gradient(760px 420px at 88% 38%, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 62%)',
        color: 'common.white',
        px: 2,
        py: { xs: 6, md: 8 },
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 6, md: 8 }}
          sx={{ alignItems: { xs: 'flex-start', md: 'center' } }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} sx={{ mb: 3, alignItems: 'center' }}>
              <Box
                aria-hidden
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <DescriptionOutlinedIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.4 }}>
                GADPR-LM
              </Typography>
            </Stack>

            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 800,
                lineHeight: 1.08,
                mb: 1.75,
                maxWidth: 560,
                textWrap: 'balance',
              }}
            >
              Gestión Documental Institucional
            </Typography>
            <Typography
              variant="body1"
              sx={{
                opacity: 0.92,
                maxWidth: 520,
                mb: 3.25,
              }}
            >
              Aplicación web local para organizar, proteger y consultar documentación digitalizada.
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 3.25, flexWrap: 'wrap', rowGap: 1 }}
            >
              <Chip
                label="ISO/IEC 27001:2022"
                size="small"
                sx={{
                  color: 'common.white',
                  bgcolor: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  fontWeight: 700,
                }}
              />
              <Chip
                label="ISO 15489"
                size="small"
                sx={{
                  color: 'common.white',
                  bgcolor: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  fontWeight: 700,
                }}
              />
              <Chip
                label="OWASP ASVS"
                size="small"
                sx={{
                  color: 'common.white',
                  bgcolor: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  fontWeight: 700,
                }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 4 }}>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                size="large"
                startIcon={<LockOutlinedIcon />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.92)',
                  color: '#0B2D33',
                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                }}
              >
                Iniciar sesión
              </Button>
              <Button
                component={RouterLink}
                to="/recuperar"
                variant="outlined"
                size="large"
                sx={{
                  borderColor: 'rgba(255,255,255,0.65)',
                  color: 'common.white',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.85)',
                    bgcolor: 'rgba(255,255,255,0.08)',
                  },
                }}
              >
                Recuperar acceso
              </Button>
            </Stack>

            <Box sx={{ mt: { xs: 2, md: 6 } }}>
              <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700 }}>
                Acceso seguro por intranet institucional
              </Typography>
              <Box
                aria-hidden
                sx={{
                  mt: 1.25,
                  height: 2,
                  width: 320,
                  maxWidth: '75%',
                  bgcolor: 'rgba(255,255,255,0.55)',
                  borderRadius: 999,
                }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              width: '100%',
              display: 'flex',
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'relative',
                width: { xs: 280, sm: 360, md: 420 },
                height: { xs: 220, sm: 280, md: 320 },
              }}
            >
              {cards.map((card) => (
                <Box
                  key={card.id}
                  sx={{
                    position: 'absolute',
                    top: card.top,
                    left: card.left,
                    width: { xs: 180, sm: 220, md: 250 },
                    height: { xs: 210, sm: 250, md: 280 },
                    borderRadius: 3,
                    transform: `rotate(${card.rotate}deg)`,
                    backgroundColor: 'rgba(255,255,255,0.98)',
                    boxShadow: '0 30px 70px rgba(2, 6, 23, 0.22)',
                    opacity: card.opacity,
                  }}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

