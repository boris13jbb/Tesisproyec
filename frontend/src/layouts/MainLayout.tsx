import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const drawerWidth = 260;

const navItems: { to: string; label: string }[] = [
  { to: '/', label: 'Inicio' },
];

const catalogNav: { to: string; label: string }[] = [
  { to: '/catalogos/dependencias', label: 'Dependencias' },
  { to: '/catalogos/cargos', label: 'Cargos' },
];

export function MainLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleNav = (to: string) => {
    setOpen(false);
    void navigate(to);
  };

  const drawer = (
    <Box sx={{ width: drawerWidth, pt: 1 }} role="navigation">
      <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
        Menú
      </Typography>
      <Divider />
      <List dense>
        {navItems.map((item) => (
          <ListItemButton key={item.to} onClick={() => handleNav(item.to)}>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <ListSubheader sx={{ bgcolor: 'transparent', lineHeight: 2 }}>
          Catálogos
        </ListSubheader>
        {catalogNav.map((item) => (
          <ListItemButton key={item.to} onClick={() => handleNav(item.to)}>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="fixed" elevation={1} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="abrir menú"
            onClick={() => setOpen(true)}
            sx={{ mr: 2 }}
          >
            <Box component="span" sx={{ fontSize: '1.35rem', lineHeight: 1 }}>
              ☰
            </Box>
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            SGD-GADPR-LM
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            {user?.email}
          </Typography>
          <Typography
            component="button"
            type="button"
            onClick={() => void logout()}
            sx={{
              color: 'inherit',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              font: 'inherit',
            }}
          >
            Salir
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
      >
        <Toolbar />
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          pt: 10,
          pb: 4,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
