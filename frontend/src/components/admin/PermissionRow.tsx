import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import {
  isCriticalPermission,
  permissionDescription,
  permissionLabel,
} from '../../constants/permission-display';

type PermissionRowProps = {
  codigo: string;
  serverDescription?: string | null;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  showStatusHint?: boolean;
};

export function PermissionRow({
  codigo,
  serverDescription,
  checked,
  disabled,
  onToggle,
  showStatusHint = true,
}: PermissionRowProps) {
  const critical = isCriticalPermission(codigo);
  const desc = permissionDescription(codigo, serverDescription);

  return (
    <FormControlLabel
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        ml: 0,
        mb: 0.75,
        py: 0.5,
        px: 0.5,
        borderRadius: 1,
        bgcolor: checked ? 'action.selected' : 'transparent',
      }}
      disabled={disabled}
      control={
        <Checkbox size="small" checked={checked} onChange={onToggle} sx={{ mt: 0.25 }} />
      }
      label={
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {permissionLabel(codigo)}
            </Typography>
            {critical ? (
              <Chip
                size="small"
                icon={<AdminPanelSettingsOutlinedIcon />}
                label="Administrativo"
                color="warning"
                variant="outlined"
                sx={{ height: 22, fontWeight: 700 }}
              />
            ) : null}
            {showStatusHint ? (
              <Typography variant="caption" color={checked ? 'success.main' : 'text.secondary'}>
                {checked ? 'Permitido' : 'No permitido'}
              </Typography>
            ) : null}
          </Stack>
          {desc ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
              {desc}
            </Typography>
          ) : null}
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: '0.68rem' }}
          >
            {codigo}
          </Typography>
        </Box>
      }
    />
  );
}
