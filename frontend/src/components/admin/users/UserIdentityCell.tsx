import { Avatar, Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { displayUsuario, usuarioInitials, type UsuarioListRow } from './user-display';

type Props = {
  usuario: UsuarioListRow;
};

export function UserIdentityCell({ usuario }: Props) {
  const name = displayUsuario(usuario);
  const initials = usuarioInitials(usuario);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Avatar
        aria-hidden
        sx={{
          width: 36,
          height: 36,
          fontSize: '0.8rem',
          fontWeight: 800,
          bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.28 : 0.12),
          color: 'primary.main',
          flexShrink: 0,
        }}
      >
        {initials}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={name}>
          {name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap title={usuario.email} sx={{ display: 'block' }}>
          {usuario.email}
        </Typography>
      </Box>
    </Box>
  );
}
