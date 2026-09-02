import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import {
  Box,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import type { MouseEvent } from 'react';
import { EmptyState } from '../../EmptyState';
import { listTableContainerSx } from '../../listSurfaces';
import { formatUltimoIngreso } from '../../../utils/formatUltimoIngreso';
import { displayUsuario, type UsuarioListRow } from './user-display';
import { UserIdentityCell } from './UserIdentityCell';
import { UserRoleChips } from './UserRoleChips';
import { UserStatusChip } from './UserStatusChip';

type Props = {
  items: UsuarioListRow[];
  totalFiltered: number;
  departamentoPorId: Map<string, string>;
  cargoPorId: Map<string, string>;
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

export function UsersTable({
  items,
  totalFiltered,
  departamentoPorId,
  cargoPorId,
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
      <Box>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
        ))}
      </Box>
    );
  }

  return (
    <>
      <TableContainer sx={{ ...listTableContainerSx, overflowX: 'auto' }}>
        <Table size="medium" stickyHeader sx={{ minWidth: 900 }} aria-label="Usuarios institucionales">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, minWidth: 220, bgcolor: 'action.hover' }}>Usuario</TableCell>
              <TableCell sx={{ fontWeight: 800, minWidth: 160, bgcolor: 'action.hover' }}>Rol</TableCell>
              <TableCell sx={{ fontWeight: 800, minWidth: 180, bgcolor: 'action.hover' }}>Área / Dependencia</TableCell>
              <TableCell sx={{ fontWeight: 800, bgcolor: 'action.hover' }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 800, minWidth: 140, bgcolor: 'action.hover' }}>Último acceso</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 72, bgcolor: 'action.hover' }} align="right">
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ border: 0 }}>
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
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => {
                const fmt = formatUltimoIngreso(u.ultimoLoginAt ?? null);
                const dn = u.dependenciaId ? departamentoPorId.get(u.dependenciaId) : null;
                const cn = u.cargoId ? cargoPorId.get(u.cargoId) : null;
                return (
                  <TableRow
                    key={u.id}
                    hover
                    sx={{
                      '&:last-child td': { borderBottom: 0 },
                      transition: 'background-color 120ms ease',
                    }}
                  >
                    <TableCell sx={{ py: 1.5 }}>
                      <UserIdentityCell usuario={u} />
                    </TableCell>
                    <TableCell sx={{ py: 1.5, verticalAlign: 'top' }}>
                      <UserRoleChips usuario={u} />
                    </TableCell>
                    <TableCell sx={{ py: 1.5, maxWidth: 220 }}>
                      <Tooltip title={dn ?? 'Sin dependencia asignada'}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: dn ? 'text.primary' : 'text.secondary',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {dn ?? 'Sin asignar'}
                        </Typography>
                      </Tooltip>
                      {cn ? (
                        <Typography variant="caption" color="text.secondary" noWrap title={cn} sx={{ display: 'block' }}>
                          {cn}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <UserStatusChip activo={u.activo} />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Tooltip title={fmt.absoluto}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {fmt.relativo}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Tooltip title="Acciones del usuario">
                        <IconButton
                          size="small"
                          aria-label={`Acciones para ${displayUsuario(u)}`}
                          onClick={(e) => onOpenActions(e, u)}
                        >
                          <MoreHorizRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
          labelDisplayedRows={({ from, to, count }) => `Mostrando ${from}–${to} de ${count}`}
          sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 0 }}
        />
      ) : null}
    </>
  );
}
