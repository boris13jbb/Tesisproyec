import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import {
  ROLE_DISPLAY_NAME,
  isRoleCode,
  userIsSuperAdminAccount,
  type RoleCode,
} from '../../../constants/role-display';
import type { UsuarioListRow } from './user-display';

type RoleChipTone = 'superadmin' | 'admin' | 'revisor' | 'auditor' | 'usuario' | 'editor' | 'consulta' | 'neutral';

function toneForRole(codigo: string): RoleChipTone {
  switch (codigo) {
    case 'SUPERADMIN':
      return 'superadmin';
    case 'ADMIN':
      return 'admin';
    case 'REVISOR':
      return 'revisor';
    case 'AUDITOR':
      return 'auditor';
    case 'EDITOR_DOC':
      return 'editor';
    case 'CONSULTA':
      return 'consulta';
    case 'USUARIO':
      return 'usuario';
    default:
      return 'neutral';
  }
}

const TONE_STYLES: Record<
  RoleChipTone,
  { color?: 'primary' | 'info' | 'default' | 'secondary'; variant: 'filled' | 'outlined'; icon?: React.ReactNode }
> = {
  superadmin: { color: 'primary', variant: 'filled', icon: <ShieldOutlinedIcon /> },
  admin: { color: 'primary', variant: 'outlined', icon: <AdminPanelSettingsOutlinedIcon /> },
  revisor: { color: 'info', variant: 'outlined', icon: <GavelOutlinedIcon /> },
  auditor: { color: 'secondary', variant: 'outlined', icon: <FactCheckOutlinedIcon /> },
  usuario: { color: 'default', variant: 'outlined', icon: <PersonOutlineOutlinedIcon /> },
  editor: { color: 'info', variant: 'outlined' },
  consulta: { color: 'default', variant: 'outlined', icon: <VisibilityOutlinedIcon /> },
  neutral: { color: 'default', variant: 'outlined' },
};

function roleLabel(r: { codigo: string; nombre: string }): string {
  if (r.codigo === 'SUPERADMIN') return 'Super Administrador';
  if (r.nombre?.trim()) return r.nombre;
  return isRoleCode(r.codigo) ? ROLE_DISPLAY_NAME[r.codigo as RoleCode] : r.codigo;
}

type Props = {
  usuario: UsuarioListRow;
  /** Chip compacto de permisos adicionales. */
  extraPermissionsCount?: number;
};

export function UserRoleChips({ usuario, extraPermissionsCount }: Props) {
  if (!usuario.roles.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin rol asignado
      </Typography>
    );
  }

  const isSuper = userIsSuperAdminAccount(usuario.roles);
  const roles = isSuper
    ? usuario.roles.filter((r) => r.codigo === 'SUPERADMIN')
    : usuario.roles.filter((r) => r.codigo !== 'SUPERADMIN');
  const extra = extraPermissionsCount ?? usuario.directPermissionCodes?.length ?? 0;

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {roles.map((r) => {
          const tone = toneForRole(r.codigo);
          const style = TONE_STYLES[tone];
          const chip = (
            <Chip
              key={r.codigo}
              size="small"
              icon={style.icon ? <>{style.icon}</> : undefined}
              label={roleLabel(r)}
              color={style.color}
              variant={style.variant}
              sx={{ fontWeight: 700, '& .MuiChip-icon': { fontSize: 16 } }}
            />
          );
          if (r.codigo === 'SUPERADMIN') {
            return (
              <Tooltip key={r.codigo} title="Cuenta protegida del sistema.">
                {chip}
              </Tooltip>
            );
          }
          return chip;
        })}
      </Stack>
      {extra > 0 ? (
        <Tooltip title={`Este usuario posee ${extra} permiso${extra === 1 ? '' : 's'} adicional${extra === 1 ? '' : 'es'} a su rol principal.`}>
          <Chip
            size="small"
            variant="outlined"
            label={`+${extra} permiso${extra === 1 ? '' : 's'}`}
            sx={{ alignSelf: 'flex-start', fontWeight: 600, maxWidth: '100%' }}
          />
        </Tooltip>
      ) : null}
    </Stack>
  );
}
