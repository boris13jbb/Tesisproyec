import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import type { AccessMatrixReferencia } from '../../constants/roles-access-matrix';
import { ROL_COLUMNA_ETIQUETA } from '../../constants/role-display';
import { SectionHeader } from '../SectionHeader';
import { listSurfaceSx } from '../listSurfaces';

const paperCardSx = { ...listSurfaceSx } as const;

const matrixStickyModuleSx = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  bgcolor: 'background.paper',
  boxShadow: (t: Theme) =>
    t.palette.mode === 'dark' ? t.shadows[4] : '4px 0 12px rgba(15, 23, 42, 0.06)',
  minWidth: { xs: 200, md: 240 },
  maxWidth: { xs: 280, md: 320 },
};

const matrixStickyModuleHeadSx = {
  ...matrixStickyModuleSx,
  zIndex: 3,
  bgcolor: 'action.hover',
};

function MatrixCellIcon({ allowed }: { allowed: boolean }) {
  return (
    <Tooltip title={allowed ? 'Este rol tiene acceso' : 'No disponible para este rol'}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', py: 1 }}>
        {allowed ? (
          <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 22 }} aria-label="Permitido" />
        ) : (
          <CancelRoundedIcon sx={{ color: 'text.disabled', fontSize: 22 }} aria-label="No permitido" />
        )}
      </Box>
    </Tooltip>
  );
}

type AccessMatrixProps = {
  matrizReferencia: AccessMatrixReferencia;
};

export function AccessMatrix({ matrizReferencia }: AccessMatrixProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [highlightRole, setHighlightRole] = useState(
    matrizReferencia.columnas[0] ?? 'ADMIN',
  );

  const columnas = matrizReferencia.columnas;

  const mobileRows = useMemo(() => {
    return matrizReferencia.filas.map((row) => ({
      modulo: row.modulo,
      ayuda: row.ayuda,
      allowed: Boolean(row.porRol[highlightRole]),
    }));
  }, [matrizReferencia.filas, highlightRole]);

  return (
    <Paper elevation={0} sx={{ ...paperCardSx, p: { xs: 2, sm: 2.5, md: 3 } }}>
      <SectionHeader
        icon={<TableChartOutlinedIcon fontSize="small" />}
        title="Matriz de acceso por rol"
        subtitle="Comparación general de las capacidades disponibles para cada rol."
      />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 2, lineHeight: 1.6 }}>
        Use esta vista para comparar qué puede hacer cada perfil. Para otorgar acceso a una persona concreta,
        edítela en la pestaña <strong>Usuarios</strong>. Para ajustar permisos del rol, use{' '}
        <strong>Roles y permisos</strong>.
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 2, maxWidth: 320 }}>
        <InputLabel id="matrix-highlight-role">Ver rol</InputLabel>
        <Select
          labelId="matrix-highlight-role"
          label="Ver rol"
          value={highlightRole}
          onChange={(e) => setHighlightRole(String(e.target.value))}
        >
          {columnas.map((c) => (
            <MenuItem key={c} value={c}>
              {ROL_COLUMNA_ETIQUETA[c] ?? c}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {isMobile ? (
        <Stack spacing={1}>
          {mobileRows.map((row) => (
            <Paper
              key={row.modulo}
              elevation={0}
              sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {row.modulo}
              </Typography>
              {row.ayuda ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {row.ayuda}
                </Typography>
              ) : null}
              <Chip
                size="small"
                label={row.allowed ? 'Permitido' : 'No permitido'}
                color={row.allowed ? 'success' : 'default'}
                sx={{ fontWeight: 700 }}
              />
            </Paper>
          ))}
        </Stack>
      ) : (
        <TableContainer
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflowX: 'auto',
            bgcolor: 'action.hover',
            maxWidth: '100%',
          }}
        >
          <Table size="small" sx={{ minWidth: 720 }} aria-label="Matriz de acceso por rol">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ ...matrixStickyModuleHeadSx, fontWeight: 800 }}>Módulo</TableCell>
                {columnas.map((c) => (
                  <TableCell
                    key={c}
                    align="center"
                    sx={{
                      fontWeight: 700,
                      px: 0.5,
                      bgcolor: c === highlightRole ? 'primary.main' : undefined,
                      color: c === highlightRole ? 'primary.contrastText' : undefined,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>
                      {ROL_COLUMNA_ETIQUETA[c] ?? c}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {matrizReferencia.filas.map((row) => (
                <TableRow key={row.modulo} hover>
                  <TableCell sx={matrixStickyModuleSx}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {row.modulo}
                    </Typography>
                    {row.ayuda ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {row.ayuda}
                      </Typography>
                    ) : null}
                  </TableCell>
                  {columnas.map((c) => (
                    <TableCell
                      key={c}
                      align="center"
                      sx={{
                        px: 0.5,
                        bgcolor: c === highlightRole ? 'action.selected' : undefined,
                      }}
                    >
                      <MatrixCellIcon allowed={Boolean(row.porRol[c])} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, lineHeight: 1.5 }}>
        {matrizReferencia.nota}
      </Typography>

      <Accordion
        defaultExpanded={false}
        elevation={0}
        sx={{ mt: 2, '&:before': { display: 'none' }, border: 1, borderColor: 'divider', borderRadius: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <InfoOutlinedIcon fontSize="small" color="primary" />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Información técnica
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            Referencia desde <strong>GET /usuarios/matriz-acceso-referencia</strong>. Permisos efectivos en
            operaciones desde <strong>role_permissions</strong> y <strong>PermissionsGuard</strong>. Generado:{' '}
            <time dateTime={matrizReferencia.generadoEn}>
              {new Date(matrizReferencia.generadoEn).toLocaleString('es-EC')}
            </time>
            .
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}
