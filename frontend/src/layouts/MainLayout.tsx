import type { ReactNode } from 'react';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
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
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { InAppNotificationsMenu } from '../components/InAppNotificationsMenu';
import { useAuth } from '../auth/useAuth';
import { userHasAdminAccess } from '../auth/role-utils';
import { getBreadcrumbsForPath } from '../nav/breadcrumbs';
import { ColorModeProvider } from '../theme/ColorModeProvider';
import { useColorMode } from '../theme/useColorMode';
import { BreadcrumbDetailProvider } from './BreadcrumbDetailProvider';
import { useBreadcrumbDetail } from './useBreadcrumbDetail';

const DRAWER_WIDTH = 272;
const DRAWER_WIDTH_COLLAPSED = 72;
const SIDEBAR_STORAGE_KEY = 'sgd.ui.sidebarOpen';

type NavItem = { to: string; label: string; icon: ReactNode };

const navItems: NavItem[] = [
  { to: '/', label: 'Inicio', icon: <HomeOutlinedIcon fontSize="small" /> },
  {
    to: '/documentos',
    label: 'Documentos',
    icon: <DescriptionOutlinedIcon fontSize="small" />,
  },
  {
    to: '/bandeja-tramites',
    label: 'Bandeja trámites',
    icon: <InboxOutlinedIcon fontSize="small" />,
  },
  {
    to: '/tramites',
    label: 'Trámites',
    icon: <AssignmentOutlinedIcon fontSize="small" />,
  },
];

const catalogNav: NavItem[] = [
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
    to: '/catalogos/contrapartes',
    label: 'Contrapartes',
    icon: <BadgeOutlinedIcon fontSize="small" />,
  },
  {
    to: '/catalogos/beneficiarios',
    label: 'Beneficiarios',
    icon: <PersonOutlineOutlinedIcon fontSize="small" />,
  },
];

const reportesNav: NavItem[] = [
  {
    to: '/reportes',
    label: 'Reportes institucionales',
    icon: <AssessmentOutlinedIcon fontSize="small" />,
  },
];

const adminNav: NavItem[] = [
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
    to: '/admin/configuracion',
    label: 'Configuración',
    icon: <SettingsOutlinedIcon fontSize="small" />,
  },
];

function readSidebarOpen(): boolean {
  try {
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

function persistSidebarOpen(open: boolean) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
}

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
        bgcolor: 'action.hover',
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

function BrandBlock({ open }: { open: boolean }) {
  return (
    <Box
      sx={{
        px: open ? 2 : 1,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: open ? 'flex-start' : 'center',
        gap: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        minHeight: 72,
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
          boxShadow: (t) => `0 4px 12px ${alpha(t.palette.secondary.main, 0.28)}`,
        }}
      >
        SGD
      </Box>
      {open ? (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.15, color: 'primary.main' }}>
            SGD-GADPR-LM
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
            Gestión documental
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

function NavSectionLabel({ open, children }: { open: boolean; children: ReactNode }) {
  if (!open) return null;
  return (
    <ListSubheader
      component="div"
      sx={{
        bgcolor: 'transparent',
        lineHeight: 2.4,
        color: 'text.secondary',
        fontWeight: 700,
        fontSize: '0.68rem',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        px: 2.5,
        mt: 1.25,
        mb: 0.25,
      }}
    >
      {children}
    </ListSubheader>
  );
}

function NavButton({
  item,
  selected,
  open,
  onNavigate,
}: {
  item: NavItem;
  selected: boolean;
  open: boolean;
  onNavigate: (to: string) => void;
}) {
  return (
    <Tooltip title={item.label} placement="right" disableHoverListener={open}>
      <ListItemButton
        selected={selected}
        onClick={() => onNavigate(item.to)}
        aria-label={item.label}
        aria-current={selected ? 'page' : undefined}
        sx={{
          justifyContent: open ? 'flex-start' : 'center',
          px: open ? 1.5 : 1,
          mx: open ? 1 : 0.75,
          my: 0.25,
          borderRadius: 2,
          minHeight: 42,
          transition: 'background-color 120ms ease, border-color 120ms ease',
          '&.Mui-selected': {
            bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.18 : 0.1),
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            pl: open ? 1.125 : 1,
            '&:hover': {
              bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.22 : 0.14),
            },
            '& .MuiListItemIcon-root': {
              color: 'primary.main',
            },
            '& .MuiListItemText-primary': {
              fontWeight: 700,
              color: 'text.primary',
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: open ? 36 : 0,
            justifyContent: 'center',
            mr: open ? 0 : 0,
          }}
        >
          {item.icon}
        </ListItemIcon>
        {open ? (
          <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2' } }} />
        ) : null}
      </ListItemButton>
    </Tooltip>
  );
}

function MainLayoutShell() {
  const theme = useTheme();
  const { mode, toggleColorMode } = useColorMode();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = userHasAdminAccess(user?.roles);
  const [myPermissionCodes, setMyPermissionCodes] = useState<string[] | null>(null);
  const canCreateDocumento = useMemo(() => {
    if (isAdmin) return true;
    const codes = myPermissionCodes ?? [];
    return codes.includes('DOC_CREATE') && codes.includes('DOC_FILES_UPLOAD');
  }, [isAdmin, myPermissionCodes]);

  const desktopDrawerWidth = sidebarOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED;

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

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      persistSidebarOpen(next);
      return next;
    });
  };

  const renderDrawer = (open: boolean) => (
    <Box
      sx={{
        width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: theme.transitions.create('width', {
          duration: theme.transitions.duration.standard,
          easing: theme.transitions.easing.easeInOut,
        }),
      }}
      role="navigation"
      aria-label="Menú principal"
    >
      <BrandBlock open={open} />
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        <List dense disablePadding>
          <NavSectionLabel open={open}>Principal</NavSectionLabel>
          {navItems.map((item) => (
            <NavButton
              key={item.to}
              item={item}
              selected={isSelected(item.to, item.to === '/')}
              open={open}
              onNavigate={handleNav}
            />
          ))}
          {canCreateDocumento && (
            <NavButton
              item={{
                to: '/documentos/nuevo',
                label: 'Nuevo documento',
                icon: <AddOutlinedIcon fontSize="small" />,
              }}
              selected={location.pathname === '/documentos/nuevo'}
              open={open}
              onNavigate={handleNav}
            />
          )}
          {isAdmin && (
            <>
              <NavSectionLabel open={open}>Reportes</NavSectionLabel>
              {reportesNav.map((item) => (
                <NavButton
                  key={item.to}
                  item={item}
                  selected={isSelected(item.to)}
                  open={open}
                  onNavigate={handleNav}
                />
              ))}
              <NavSectionLabel open={open}>Administración</NavSectionLabel>
              {adminNav.map((item) => (
                <NavButton
                  key={item.to}
                  item={item}
                  selected={isSelected(item.to)}
                  open={open}
                  onNavigate={handleNav}
                />
              ))}
              <NavSectionLabel open={open}>Catálogos</NavSectionLabel>
              {catalogNav.map((item) => (
                <NavButton
                  key={item.to}
                  item={item}
                  selected={location.pathname === item.to}
                  open={open}
                  onNavigate={handleNav}
                />
              ))}
            </>
          )}
        </List>

        {open ? (
          <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 2, pt: 1 }}>
            <NavSectionLabel open>Cuenta</NavSectionLabel>
            <NavButton
              item={{
                to: '/perfil',
                label: 'Mi perfil',
                icon: <PersonOutlineOutlinedIcon fontSize="small" />,
              }}
              selected={location.pathname === '/perfil'}
              open={open}
              onNavigate={handleNav}
            />
          </Box>
        ) : null}
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        {isMdUp ? (
          <Tooltip title={open ? 'Contraer menú' : 'Expandir menú'} placement="right" disableHoverListener={open}>
            <ListItemButton
              onClick={toggleSidebar}
              aria-label={open ? 'Contraer menú de navegación' : 'Expandir menú de navegación'}
              aria-expanded={open}
              sx={{
                justifyContent: open ? 'flex-start' : 'center',
                mx: 0,
                borderRadius: 0,
                minHeight: 52,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: open ? 36 : 0, justifyContent: 'center' }}>
                <KeyboardDoubleArrowRightIcon
                  fontSize="small"
                  sx={{
                    transition: 'transform 240ms ease',
                    transform: open ? 'rotate(180deg)' : 'none',
                    color: 'text.secondary',
                  }}
                />
              </ListItemIcon>
              {open ? (
                <ListItemText
                  primary="Ocultar menú"
                  slotProps={{ primary: { variant: 'body2', sx: { color: 'text.secondary' } } }}
                />
              ) : null}
            </ListItemButton>
          </Tooltip>
        ) : open ? (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Intranet institucional · Acceso controlado
            </Typography>
          </Box>
        ) : null}
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
            width: { md: `calc(100% - ${desktopDrawerWidth}px)` },
            ml: { md: `${desktopDrawerWidth}px` },
            borderBottom: '1px solid',
            borderColor: 'primary.dark',
            boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset',
            transition: theme.transitions.create(['width', 'margin'], {
              duration: theme.transitions.duration.standard,
              easing: theme.transitions.easing.easeInOut,
            }),
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
            <InAppNotificationsMenu />
            <Tooltip title={mode === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
              <IconButton
                color="inherit"
                onClick={toggleColorMode}
                aria-label={mode === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}
                sx={{
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
                }}
              >
                {mode === 'dark' ? (
                  <LightModeOutlinedIcon fontSize="small" />
                ) : (
                  <DarkModeOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
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

        <Box component="nav" sx={{ width: { md: desktopDrawerWidth }, flexShrink: { md: 0 } }}>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
            }}
          >
            {renderDrawer(true)}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: desktopDrawerWidth,
                borderRight: 1,
                borderColor: 'divider',
                overflowX: 'hidden',
                transition: theme.transitions.create('width', {
                  duration: theme.transitions.duration.standard,
                  easing: theme.transitions.easing.easeInOut,
                }),
              },
            }}
            open
          >
            {renderDrawer(sidebarOpen)}
          </Drawer>
        </Box>

        <Box
          component="main"
          className="page-fade-enter"
          key={location.pathname}
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${desktopDrawerWidth}px)` },
            minWidth: 0,
            pb: { xs: 6, md: 5 },
            px: { xs: 1.5, sm: 2.5, md: 3 },
            pt: 0,
            transition: theme.transitions.create('width', {
              duration: theme.transitions.duration.standard,
              easing: theme.transitions.easing.easeInOut,
            }),
          }}
        >
          <Toolbar />
          <Box
            sx={{
              maxWidth: { xs: '100%', xl: 1560 },
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

export function MainLayout() {
  return (
    <ColorModeProvider>
      <MainLayoutShell />
    </ColorModeProvider>
  );
}
