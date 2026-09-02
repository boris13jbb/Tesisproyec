import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import {
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { FILTER_ROLE_OPTIONS } from '../../../constants/role-display';

export type UsersFilterEstado = 'all' | 'active' | 'inactive';

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  estado: UsersFilterEstado;
  onEstadoChange: (value: UsersFilterEstado) => void;
  rol: string;
  onRolChange: (value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function UsersFiltersBar({
  search,
  onSearchChange,
  estado,
  onEstadoChange,
  rol,
  onRolChange,
  onClear,
  hasActiveFilters,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      sx={{ mb: 2, alignItems: { md: 'flex-end' } }}
    >
      <TextField
        size="small"
        label="Buscar"
        placeholder="Buscar por nombre o correo"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        fullWidth
        sx={{ maxWidth: { md: 360 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
      />
      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
        <InputLabel id="filter-estado">Estado</InputLabel>
        <Select
          labelId="filter-estado"
          label="Estado"
          value={estado}
          onChange={(e) => onEstadoChange(e.target.value as UsersFilterEstado)}
        >
          <MenuItem value="all">Todos</MenuItem>
          <MenuItem value="active">Activos</MenuItem>
          <MenuItem value="inactive">Inactivos</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
        <InputLabel id="filter-rol">Rol</InputLabel>
        <Select labelId="filter-rol" label="Rol" value={rol} onChange={(e) => onRolChange(String(e.target.value))}>
          {FILTER_ROLE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {hasActiveFilters ? (
        <Button
          size="small"
          variant="text"
          startIcon={<ClearOutlinedIcon />}
          onClick={onClear}
          sx={{ fontWeight: 700, whiteSpace: 'nowrap', alignSelf: { xs: 'flex-start', md: 'center' } }}
        >
          Limpiar filtros
        </Button>
      ) : null}
    </Stack>
  );
}
