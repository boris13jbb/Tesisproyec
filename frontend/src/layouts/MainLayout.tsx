import type { ReactNode } from 'react';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ListOutlinedIcon from '@mui/icons-material/ListOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  AppBar,
  Avatar,
  Box,
  Breadcrumbs,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { getBreadcrumbsForPath } from '../nav/breadcrumbs';
import { BreadcrumbDetailProvider } from './BreadcrumbDetailProvider';
import { useBreadcrumbDetail } from './useBreadcrumbDetail';

const drawerWidth = 272;

const navItems: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Inicio', icon: <HomeOutlinedIcon fontSize="small" /> },
  {
    to: '/documentos',
    label: 'Documentos',
    icon: <DescriptionOutlinedIcon fontSize="small" />,
  },
  {
    to: '/tramites',
    label: 'Trámites',
    icon: <AssignmentOutlinedIcon fontSize="small" />,
  },
  {
    to: '/clasificacion',
    label: 'Clasificación',
    icon: <LayersOutlinedIcon fontSize="small" />,
  },
];

const catalogNav: { to: string; label: string; icon: ReactNode }[] = [
  {
    to: '/catalogos/dependencias',
    label: 'Dependencias',
    icon: <BusinessOutlinedIcon fontSize="small" />,
  },
  { to: '/catalogos/cargos', label: 'Cargos', icon: <BadgeOutlinedIcon fontSize="small" /> },
  {
    to: '/catalogos/tipos-documentales',
    label: 'Tipos documentales',
    icon: <ArticleOutlinedIcon fontSize="small" />,
  },
  {
    to: '/catalogos/series',
    label: 'Series',
    icon: <AccountTreeOutlinedIcon fontSize="small" />,
  },
  {
    to: '/catalogos/subseries',
    label: 'Subseries',
    icon: <ListOutlinedIcon fontSize="small" />,
  },
];

const adminNav: { to: string; label: string; icon: ReactNode }[] = [
  {
    to: '/admin/usuarios',
    label: 'Usuarios y roles',
    icon: <PeopleOutlinedIcon fontSize="small" />,
  },
  {
    to: '/admin/auditoria',
    label: 'Auditoría',
    icon: <FactCheckOutlinedIcon fontSize="small" />,
  },
  {
    to: '/admin/respaldos',
    label: 'Respaldos',
    icon: <BackupOutlinedIcon fontSize="small" />,
  },
  {
    to: '/admin/reportes',
    label: 'Reportes',
    icon: <AssessmentOutlinedIcon fontSize="small" />,
  },
  {
    to: '/admin/configuracion',
    label: 'Configuración',
    icon: <SettingsOutlinedIcon fontSize="small" />,
  },
];

function initialsFromEmail(email: string | undefined): string {
  if (!email) return 'U';
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function LayoutBreadcrumbs() {
  const location = useLocation();
  const { labelsByPath } = useBreadcrumbDetail();
  const crumbs = getBreadcrumbsForPath(location.pathname, {
    documentDetailLabel: labelsByPath[location.pathname],
  });

  return (
    <Breadcrumbs
      aria-label="Ruta de navegación"
      sx={{
        mb: { xs: 2, sm: 2.5 },
        px: { xs: 1, sm: 1.5 },
        py: { xs: 0.75, sm: 1 },
        borderRadius: 2,
        bgcolor: 'rgba(30, 58, 95, 0.03)',
        border: '1px solid',
        borderColor: 'divider',
        '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap', rowGap: 0.5 },
      }}
    >
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        if (last || !c.to) {
          return (
            <Typography key={`${c.label}-${i}`} color="text.primary" variant="body2" sx={{ fontWeight: 600 }}>
              {c.label}
            </Typography>
          );
        }
        return (
          <Link
            key={`${c.label}-${i}`}
            component={RouterLink}
            to={c.to}
            underline="hover"
            color="text.secondary"
            variant="body2"
          >
            {c.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}

function BrandBlock() {
  return (
    <Box
      sx={{
        px: 2,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'secondary.main',
          color: 'common.white',
          fontWeight: 800,
          fontSize: '0.8rem',
          letterSpacing: 0.4,
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(30, 124, 137, 0.28)',
        }}
      >
        SGD
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.15, color: 'primary.main' }}>
          SGD-GADPR-LM
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
          Gestión documental
        </Typography>
      </Box>
    </Box>
  );
}

export function MainLayout() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;
  const [myPermissionCodes, setMyPermissionCodes] = useState<string[] | null>(null);
  const canCreateDocumento = useMemo(() => {
    if (isAdmin) return true;
    return myPermissionCodes?.includes('DOC_CREATE') ?? false;
  }, [isAdmin, myPermissionCodes]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!user?.id) {
          if (!cancelled) setMyPermissionCodes(null);
          return;
        }
        const res = await apiClient.get<{ codigos: string[] }>('/rbac/me/permissions');
        if (cancelled) return;
        setMyPermissionCodes(Array.isArray(res.data?.codigos) ? res.data.codigos : []);
      } catch {
        if (cancelled) return;
        setMyPermissionCodes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleNav = (to: string) => {
    setMobileOpen(false);
    void navigate(to);
  };

  const isSelected = (to: string, exact = false) => {
    if (exact || to === '/') {
      return location.pathname === to;
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const drawer = (
    <Box
      sx={{
        width: drawerWidth,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="navigation"
      aria-label="Menú principal"
    >
      <BrandBlock />
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <List dense disablePadding>
          <ListSubheader
            component="div"
            sx={{
              bgcolor: 'transparent',
              lineHeight: 2.2,
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              px: 2.5,
            }}
          >
            Principal
          </ListSubheader>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              selected={isSelected(item.to, item.to === '/')}
              onClick={() => handleNav(item.to)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2' } }} />
            </ListItemButton>
          ))}
          {canCreateDocumento && (
            <ListItemButton
              key="/documentos/nuevo"
              selected={location.pathname === '/documentos/nuevo'}
              onClick={() => handleNav('/documentos/nuevo')}
            >
              <ListItemIcon>
                <AddOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Nuevo documento"
                slotProps={{ primary: { variant: 'body2' } }}
              />
            </ListItemButton>
          )}
          {isAdmin && (
            <>
              <ListSubheader
                component="div"
                sx={{
                  bgcolor: 'transparent',
                  lineHeight: 2.2,
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  px: 2.5,
                  mt: 1,
                }}
              >
                Administración
              </ListSubheader>
              {adminNav.map((item) => (
                <ListItemButton
                  key={item.to}
                  selected={isSelected(item.to)}
                  onClick={() => handleNav(item.to)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { variant: 'body2' } }}
                  />
                </ListItemButton>
              ))}
              <ListSubheader
                component="div"
                sx={{
                  bgcolor: 'transparent',
                  lineHeight: 2.2,
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  px: 2.5,
                  mt: 1,
                }}
              >
                Catálogos
              </ListSubheader>
              {catalogNav.map((item) => (
                <ListItemButton
                  key={item.to}
                  selected={location.pathname === item.to}
                  onClick={() => handleNav(item.to)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2' } }} />
                </ListItemButton>
              ))}
            </>
          )}
        </List>
      </Box>
      <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Intranet institucional · Acceso controlado
        </Typography>
      </Box>
    </Box>
  );

  return (
    <BreadcrumbDetailProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            zIndex: (t) => t.zIndex.drawer + 1,
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
            borderBottom: '1px solid',
            borderColor: 'primary.dark',
            boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset',
          }}
        >
          <Toolbar sx={{ gap: 1.5, minHeight: { xs: 56, sm: 64 } }}>
            {!isMdUp && (
              <IconButton
                color="inherit"
                edge="start"
                aria-label="Abrir menú de navegación"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" component="div" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                SGD-GADPR-LM
              </Typography>
              <Typography
                variant="caption"
                sx={{ opacity: 0.8, display: { xs: 'none', sm: 'block' } }}
              >
                Sistema de gestión documental
              </Typography>
            </Box>
            <Chip
              size="small"
              label="Sesión activa"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                bgcolor: 'rgba(255,255,255,0.14)',
                color: 'common.white',
                fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.22)',
              }}
            />
            <Box
              component="button"
              type="button"
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              aria-haspopup="menu"
              aria-expanded={Boolean(userMenuAnchor)}
              aria-label="Menú de cuenta"
              title={user?.email ?? ''}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                maxWidth: 260,
                color: 'inherit',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 999,
                cursor: 'pointer',
                font: 'inherit',
                px: 1,
                py: 0.5,
                transition: 'background-color 120ms ease',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  bgcolor: 'secondary.main',
                }}
              >
                {initialsFromEmail(user?.email)}
              </Avatar>
              <Typography
                variant="body2"
                sx={{
                  display: { xs: 'none', md: 'block' },
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}
              >
                {user?.email}
              </Typography>
              <KeyboardArrowDownIcon sx={{ fontSize: 18, opacity: 0.9 }} />
            </Box>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    minWidth: 240,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 4,
                  },
                },
              }}
            >
              <MenuItem
                disabled
                sx={{ opacity: '1 !important', flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}
              >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', width: '100%' }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      bgcolor: 'secondary.main',
                    }}
                  >
                    {initialsFromEmail(user?.email)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      Conectado como
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
                      {user?.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Roles: {user?.roles.map((r) => r.codigo).join(', ') || '—'}
                    </Typography>
                  </Box>
                </Stack>
              </MenuItem>
              <Divider />
              <MenuItem component={RouterLink} to="/perfil" onClick={() => setUserMenuAnchor(null)}>
                Mi perfil
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  void logout();
                }}
              >
                Cerrar sesión
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                borderRight: 1,
                borderColor: 'divider',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        <Box
          component="main"
          className="page-fade-enter"
          key={location.pathname}
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${drawerWidth}px)` },
            minWidth: 0,
            pb: { xs: 6, md: 5 },
            px: { xs: 1.5, sm: 2.5, md: 3 },
            pt: 0,
          }}
        >
          <Toolbar />
          <Box
            sx={{
              maxWidth: { xs: '100%', xl: 1360 },
              mx: 'auto',
              width: '100%',
              pt: { xs: 1.5, sm: 2 },
            }}
          >
            <LayoutBreadcrumbs />
            <Outlet />
          </Box>
        </Box>
      </Box>
    </BreadcrumbDetailProvider>
  );
}
