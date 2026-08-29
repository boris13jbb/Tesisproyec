import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { ActivoChip } from '../components/ActivoChip';
import { listSurfaceSx } from '../components/listSurfaces';
import { PageHeader } from '../components/PageHeader';
import { SectionHeader } from '../components/SectionHeader';
import { formatUserActivityLabel } from '../constants/audit-actions';
import { getApiErrorMessage } from '../utils/api-error-message';

const paperCardSx = {
  ...listSurfaceSx,
  p: { xs: 2, md: 2.75 },
  height: '100%',
};

type ProfileDependencia = { codigo: string; nombre: string } | null;

type AuthProfileResponse = {
  schemaVersion: 1;
  usuario: {
    id: string;
    email: string;
    nombres: string | null;
    apellidos: string | null;
    activo: boolean;
    dependencia: ProfileDependencia;
    cargoNombre: string | null;
    roles: { codigo: string; nombre: string }[];
  };
  lastLoginAt: string | null;
  activity: { id: string; at: string; action: string; label: string }[];
};

const EMPTY_ACTIVITY: AuthProfileResponse['activity'] = [];

function initialsForUser(
  nombres: string | null,
  apellidos: string | null,
  email: string,
): string {
  const joined = `${nombres ?? ''} ${apellidos ?? ''}`.trim();
  if (joined) {
    const parts = joined.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0][0];
      const b = parts[parts.length - 1][0];
      return `${a}${b}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function displayName(profile: AuthProfileResponse['usuario']): string {
  const n = `${profile.nombres ?? ''} ${profile.apellidos ?? ''}`.trim();
  return n || profile.email;
}

function subtitleRole(profile: AuthProfileResponse['usuario']): string {
  if (profile.cargoNombre?.trim()) {
    return profile.cargoNombre.trim();
  }
  const r = profile.roles.map((x) => x.nombre.trim()).filter(Boolean);
  return r.join(' · ') || 'Usuario institucional';
}

function primaryRoleLabel(profile: AuthProfileResponse['usuario']): string {
  const privileged = profile.roles.find(
    (r) => r.codigo === 'SUPERADMIN' || r.codigo === 'ADMIN',
  );
  if (privileged) return privileged.nombre;
  const first = profile.roles[0];
  return first?.nombre ?? '—';
}

function areaLabel(dep: ProfileDependencia): string {
  if (!dep) return '—';
  const code = dep.codigo?.trim();
  const name = dep.nombre?.trim();
  if (code && name) return `${code} — ${name}`;
  return code || name || '—';
}

function formatLastLogin(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yod = new Date(sod);
  yod.setDate(yod.getDate() - 1);
  if (d >= sod) {
    return new Intl.DateTimeFormat('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }
  if (d >= yod) {
    return 'Ayer';
  }
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function PerfilUsuarioPage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<AuthProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activity = profile?.activity ?? EMPTY_ACTIVITY;
  const visibleActivity = useMemo(() => {
    if (!activity.length) return [];
    return activity
      .map((item) => ({
        ...item,
        displayLabel: formatUserActivityLabel(item.label, item.action),
      }))
      .filter((item) => item.displayLabel.length > 0);
  }, [activity]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get<AuthProfileResponse>('/auth/profile');
        if (!cancelled) {
          setProfile(data);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(
              e,
              'No se pudo cargar el perfil. Intenta de nuevo en unos segundos.',
            ),
          );
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const data = profile?.usuario;
  const headerEmail = user?.email ?? data?.email ?? '';
  const headerInitials = data
    ? initialsForUser(data.nombres, data.apellidos, data.email)
    : headerEmail.slice(0, 2).toUpperCase();
  const headerRole = data ? primaryRoleLabel(data) : user?.roles[0]?.nombre ?? 'Usuario';

  return (
    <Box sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
      <PageHeader
        title="Perfil de usuario"
        description="GADPR-LM · Sistema de Gestión Documental"
        actions={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
          >
            <Chip
              size="small"
              label="INTRANET"
              variant="outlined"
              color="primary"
              sx={{
                alignSelf: { xs: 'flex-start', sm: 'center' },
                fontWeight: 800,
                letterSpacing: 0.4,
              }}
            />
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Avatar
                sx={{
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                  width: 40,
                  height: 40,
                  fontWeight: 800,
                }}
              >
                {headerInitials}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {headerRole}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap title={headerEmail}>
                  {headerEmail}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Cargando perfil" />
        </Box>
      ) : null}

      {!loading && profile && data ? (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>
              Mi perfil
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Datos de identidad, acceso y actividad reciente del usuario autenticado.
            </Typography>
          </Box>

          <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper component="section" elevation={0} sx={paperCardSx} aria-label="Información personal">
                <Box sx={{ mb: 2 }}>
                  <SectionHeader
                    icon={<PersonOutlinedIcon fontSize="small" />}
                    title="Información personal"
                    subtitle="Cuenta institucional"
                  />
                </Box>
                <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: 96,
                      height: 96,
                      bgcolor: 'secondary.main',
                      color: 'secondary.contrastText',
                      fontSize: 34,
                      fontWeight: 800,
                    }}
                  >
                    {initialsForUser(data.nombres, data.apellidos, data.email)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {displayName(data)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {subtitleRole(data)}
                    </Typography>
                  </Box>
                </Stack>

                <Stack spacing={1.25} sx={{ mt: 3 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Correo
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }} noWrap title={data.email}>
                      {data.email}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Rol
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                      {primaryRoleLabel(data)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Área
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                      {areaLabel(data.dependencia)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Estado
                    </Typography>
                    <ActivoChip activo={data.activo} />
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Último ingreso
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                      {formatLastLogin(profile.lastLoginAt)}
                    </Typography>
                  </Stack>
                </Stack>

                <Button
                  component={RouterLink}
                  to="/recuperar"
                  variant="contained"
                  color="secondary"
                  fullWidth
                  sx={{
                    mt: 3,
                    py: 1.25,
                    fontWeight: 800,
                  }}
                >
                  Cambiar contraseña
                </Button>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper component="section" elevation={0} sx={paperCardSx} aria-label="Actividad reciente">
                <Box sx={{ mb: 2 }}>
                  <SectionHeader
                    icon={<HistoryOutlinedIcon fontSize="small" />}
                    title="Actividad reciente"
                    subtitle="Últimas acciones que realizó en el sistema"
                  />
                </Box>
                <Box sx={{ pl: 0.5 }}>
                  {visibleActivity.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Sin actividad registrada recientemente.
                    </Typography>
                  ) : (
                    <Stack component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                      {visibleActivity.map((item, idx) => (
                        <Box
                          component="li"
                          key={item.id}
                          sx={{
                            display: 'flex',
                            gap: 1.5,
                            position: 'relative',
                            pb: idx < visibleActivity.length - 1 ? 2.25 : 0,
                            pl: 0.5,
                            '&::before':
                              idx < visibleActivity.length - 1
                                ? {
                                    content: '""',
                                    position: 'absolute',
                                    left: 14,
                                    top: 22,
                                    bottom: 0,
                                    width: 2,
                                    bgcolor: (t) => alpha(t.palette.secondary.main, 0.22),
                                  }
                                : undefined,
                          }}
                        >
                          <Box
                            aria-hidden
                            sx={{
                              width: 18,
                              flexShrink: 0,
                              display: 'flex',
                              justifyContent: 'center',
                              pt: 0.35,
                            }}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: 'secondary.main',
                              }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {item.displayLabel}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatActivityTime(item.at)}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Button
                  type="button"
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={() => {
                    void logout();
                  }}
                  sx={{
                    mt: 3,
                    py: 1.25,
                    fontWeight: 800,
                  }}
                >
                  Cerrar sesión de forma segura
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : null}
    </Box>
  );
}
