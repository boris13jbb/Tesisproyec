import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import RemoveCircleOutlinedIcon from '@mui/icons-material/RemoveCircleOutlined';
import { Chip } from '@mui/material';

type Props = {
  activo: boolean;
};

export function UserStatusChip({ activo }: Props) {
  return (
    <Chip
      size="small"
      icon={activo ? <CheckCircleOutlinedIcon /> : <RemoveCircleOutlinedIcon />}
      label={activo ? 'Activo' : 'Inactivo'}
      color={activo ? 'success' : 'default'}
      variant={activo ? 'filled' : 'outlined'}
      sx={{ fontWeight: 700, '& .MuiChip-icon': { fontSize: 16 } }}
    />
  );
}
