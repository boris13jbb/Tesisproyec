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
import {
  AppBar,
  Box,
  Breadcrumbs,
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

const drawerWidth = 260;

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

function LayoutBreadcrumbs() {
  const location = useLocation();
  const { labelsByPath } = useBreadcrumbDetail();
  const crumbs = getBreadcrumbsForPath(location.pathname, {
    documentDetailLabel: labelsByPath[location.pathname],
  });

  return (
    <Breadcrumbs aria-label="Ruta de navegación" sx={{ mb: 2 }}>
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        if (last || !c.to) {
          return (
            <Typography key={`${c.label}-${i}`} color="text.primary" variant="body2">
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
            color="inherit"
            variant="body2"
          >
            {c.label}
          </Link>
        );
      })}
    </Breadcrumbs>
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

  const drawer = (
    <Box sx={{ width: drawerWidth, pt: 1 }} role="navigation" aria-label="Menú principal">
      <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
        Menú
      </Typography>
      <Divider />
      <List dense>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            selected={
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            }
            onClick={() => handleNav(item.to)}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2' } }} />
          </ListItemButton>
        ))}
        {canCreateDocumento && (
          <ListItemButton
            key="/documentos/nuevo"
            selected={location.pathname === '/documentos/nuevo'}
            onClick={() => handleNav('/documentos/nuevo')}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
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
              sx={{ bgcolor: 'transparent', lineHeight: 2, color: 'text.secondary' }}
            >
              Administración
            </ListSubheader>
            {adminNav.map((item) => (
              <ListItemButton
                key={item.to}
                selected={
                  location.pathname === item.to ||
                  location.pathname.startsWith(`${item.to}/`)
                }
                onClick={() => handleNav(item.to)}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { variant: 'body2' } }}
                />
              </ListItemButton>
            ))}
            <ListSubheader
              component="div"
              sx={{ bgcolor: 'transparent', lineHeight: 2, color: 'text.secondary' }}
            >
              Catálogos
            </ListSubheader>
            {catalogNav.map((item) => (
              <ListItemButton
                key={item.to}
                selected={location.pathname === item.to}
                onClick={() => handleNav(item.to)}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2' } }} />
              </ListItemButton>
            ))}
          </>
        )}
      </List>
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
          borderBottom: 1,
          borderColor: 'primary.dark',
        }}
      >
        <Toolbar>
          {!isMdUp && (
            <IconButton
              color="inherit"
              edge="start"
              aria-label="Abrir menú de navegación"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            SGD-GADPR-LM
          </Typography>
          <Typography
            variant="caption"
            sx={{ mr: 2, display: { xs: 'none', md: 'block' }, opacity: 0.9 }}
          >
            Sesión activa
          </Typography>
          <Typography
            component="button"
            type="button"
            variant="body2"
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            sx={{
              color: 'inherit',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 1,
              cursor: 'pointer',
              font: 'inherit',
              px: 1.5,
              py: 0.5,
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={user?.email ?? ''}
          >
            {user?.email}
          </Typography>
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled sx={{ opacity: '1 !important', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="caption" color="text.secondary">
                Conectado como
              </Typography>
              <Typography variant="body2">{user?.email}</Typography>
              <Typography variant="caption" color="text.secondary">
                Roles: {user?.roles.map((r) => r.codigo).join(', ') || '—'}
              </Typography>
            </MenuItem>
            <MenuItem component={RouterLink} to="/perfil" onClick={() => setUserMenuAnchor(null)}>
              Mi perfil
            </MenuItem>
            <Divider />
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
          <Toolbar />
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
          <Toolbar />
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minWidth: 0,
          pb: 4,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Toolbar />
        <LayoutBreadcrumbs />
        <Outlet />
      </Box>
    </Box>
    </BreadcrumbDetailProvider>
  );
}
