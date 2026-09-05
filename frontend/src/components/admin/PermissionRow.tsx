import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
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
  useSwitch?: boolean;
  originHint?: string;
};

export function PermissionRow({
  codigo,
  serverDescription,
  checked,
  disabled,
  onToggle,
  showStatusHint = true,
  useSwitch = false,
  originHint,
}: PermissionRowProps) {
  const critical = isCriticalPermission(codigo);
  const desc = permissionDescription(codigo, serverDescription);

  const control = useSwitch ? (
    <Switch size="small" checked={checked} onChange={() => onToggle()} disabled={disabled} sx={{ flexShrink: 0 }} />
  ) : (
    <Checkbox size="small" checked={checked} onChange={onToggle} sx={{ mt: 0.25, flexShrink: 0 }} disabled={disabled} />
  );

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
        minWidth: 0,
        bgcolor: checked ? 'action.selected' : 'transparent',
        ...(useSwitch ? { justifyContent: 'space-between', width: '100%', gap: 1 } : {}),
      }}
      disabled={disabled}
      control={control}
      labelPlacement={useSwitch ? 'start' : 'end'}
      label={
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
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
            {showStatusHint && !originHint ? (
              <Typography variant="caption" color={checked ? 'success.main' : 'text.secondary'}>
                {checked ? 'Permitido' : 'No permitido'}
              </Typography>
            ) : null}
          </Stack>
          {desc ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.35, whiteSpace: 'normal', overflowWrap: 'anywhere' }}
            >
              {desc}
            </Typography>
          ) : null}
          {originHint ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.25, whiteSpace: 'normal', overflowWrap: 'anywhere' }}
            >
              {originHint}
            </Typography>
          ) : null}
          {!useSwitch ? (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: '0.68rem' }}
            >
              {codigo}
            </Typography>
          ) : null}
        </Box>
      }
    />
  );
}
