import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import {
  Box,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TablePagination,
  Tooltip,
  Typography,
} from '@mui/material';
import type { MouseEvent } from 'react';
import { EmptyState } from '../../EmptyState';
import { formatUltimoIngreso } from '../../../utils/formatUltimoIngreso';
import { displayUsuario, type UsuarioListRow } from './user-display';
import { UserIdentityCell } from './UserIdentityCell';
import { UserRoleChips } from './UserRoleChips';
import { UserStatusChip } from './UserStatusChip';

type Props = {
  items: UsuarioListRow[];
  totalFiltered: number;
  departamentoPorId: Map<string, string>;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  onOpenActions: (e: MouseEvent<HTMLElement>, usuario: UsuarioListRow) => void;
  loading?: boolean;
  emptyTotal: number;
  onClearFilters?: () => void;
  onCreateFirst?: () => void;
  canCreate?: boolean;
};

export function UsersMobileList({
  items,
  totalFiltered,
  departamentoPorId,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onOpenActions,
  loading,
  emptyTotal,
  onClearFilters,
  onCreateFirst,
  canCreate,
}: Props) {
  if (loading) {
    return (
      <Stack spacing={1.25}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
        ))}
      </Stack>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        dense
        title={emptyTotal === 0 ? 'No hay usuarios registrados.' : 'No encontramos usuarios con esos filtros.'}
        description={
          emptyTotal === 0
            ? 'Cree la primera cuenta institucional para comenzar.'
            : 'Ajuste la búsqueda o limpie los filtros aplicados.'
        }
        action={
          emptyTotal === 0 && canCreate && onCreateFirst ? (
            <Typography
              component="button"
              type="button"
              onClick={onCreateFirst}
              sx={{
                border: 0,
                bgcolor: 'transparent',
                color: 'primary.main',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Crear primer usuario
            </Typography>
          ) : onClearFilters && emptyTotal > 0 ? (
            <Typography
              component="button"
              type="button"
              onClick={onClearFilters}
              sx={{
                border: 0,
                bgcolor: 'transparent',
                color: 'primary.main',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Limpiar filtros
            </Typography>
          ) : undefined
        }
      />
    );
  }

  return (
    <Stack spacing={1.25}>
      {items.map((u) => {
        const fmt = formatUltimoIngreso(u.ultimoLoginAt ?? null);
        const dn = u.dependenciaId ? departamentoPorId.get(u.dependenciaId) : null;
        return (
          <Paper
            key={u.id}
            elevation={0}
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <UserIdentityCell usuario={u} />
                <Box sx={{ mt: 1 }}>
                  <UserRoleChips usuario={u} />
                </Box>
                <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                  <UserStatusChip activo={u.activo} />
                  <Typography variant="caption" color="text.secondary">
                    {dn ?? 'Sin asignar'}
                  </Typography>
                </Stack>
                <Tooltip title={fmt.absoluto}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    Último acceso: {fmt.relativo}
                  </Typography>
                </Tooltip>
              </Box>
              <IconButton
                size="small"
                aria-label={`Acciones para ${displayUsuario(u)}`}
                onClick={(e) => onOpenActions(e, u)}
              >
                <MoreHorizRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>
        );
      })}

      {totalFiltered > 0 ? (
        <TablePagination
          component="div"
          count={totalFiltered}
          page={page}
          onPageChange={(_, p) => onPageChange(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            onRowsPerPageChange(parseInt(e.target.value, 10));
            onPageChange(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Filas"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      ) : null}
    </Stack>
  );
}
