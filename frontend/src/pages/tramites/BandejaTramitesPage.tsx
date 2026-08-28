import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { listSurfaceSx, listTableContainerSx } from '../../components/listSurfaces';
import { PageHeader } from '../../components/PageHeader';
import { labelDocumentoEstado } from '../../constants/documento-estado';
import { getApiErrorMessage } from '../../utils/api-error-message';

type DepOption = { id: string; codigo: string; nombre: string };
type TipoOption = { id: string; codigo: string; nombre: string };

type BandejaItem = {
  id: string;
  codigo: string;
  asunto: string;
  estado: string;
  fechaIngresoRevision: string | null;
  fechaLimiteSla: string | null;
  slaEstado: string;
  diasEnRevision: number | null;
  dependencia: DepOption | null;
  tipoDocumental: TipoOption;
};

type BandejaResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: BandejaItem[];
  slaResumen: {
    total: number;
    vencidos: number;
    porVencer: number;
    enPlazo: number;
  };
  slaDiasInstitucional: number;
};

const SLA_OPTIONS = [
  { value: '', label: 'Todos los SLA' },
  { value: 'VENCIDO', label: 'SLA vencido' },
  { value: 'POR_VENCER', label: 'Por vencer (24h)' },
  { value: 'EN_PLAZO', label: 'En plazo' },
  { value: 'SIN_SLA', label: 'Sin SLA registrado' },
] as const;

function slaChipColor(
  estado: string,
): 'error' | 'warning' | 'success' | 'default' {
  if (estado === 'VENCIDO') return 'error';
  if (estado === 'POR_VENCER') return 'warning';
  if (estado === 'EN_PLAZO') return 'success';
  return 'default';
}

function slaLabel(estado: string): string {
  if (estado === 'VENCIDO') return 'SLA vencido';
  if (estado === 'POR_VENCER') return 'Por vencer';
  if (estado === 'EN_PLAZO') return 'En plazo';
  return 'Sin SLA';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function BandejaTramitesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BandejaResponse | null>(null);
  const [q, setQ] = useState('');
  const [dependenciaId, setDependenciaId] = useState('');
  const [tipoDocumentalId, setTipoDocumentalId] = useState('');
  const [slaEstado, setSlaEstado] = useState('');
  const [dependencias, setDependencias] = useState<DepOption[]>([]);
  const [tipos, setTipos] = useState<TipoOption[]>([]);

  const loadCatalogs = useCallback(async () => {
    const [deps, tiposRes] = await Promise.all([
      apiClient.get<DepOption[]>('/dependencias', { params: { activo: true } }),
      apiClient.get<TipoOption[]>('/tipos-documentales', { params: { activo: true } }),
    ]);
    setDependencias(deps.data);
    setTipos(tiposRes.data);
  }, []);

  const loadBandeja = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<BandejaResponse>('/documentos/bandeja-tramites', {
        params: {
          q: q.trim() || undefined,
          dependenciaId: dependenciaId || undefined,
          tipoDocumentalId: tipoDocumentalId || undefined,
          slaEstado: slaEstado || undefined,
          page: 1,
          pageSize: 50,
          sortBy: 'fechaIngresoRevision',
          sortDir: 'asc',
        },
      });
      setData(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo cargar la bandeja de trámites'));
    } finally {
      setLoading(false);
    }
  }, [q, dependenciaId, tipoDocumentalId, slaEstado]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    void loadBandeja();
  }, [loadBandeja]);

  const resumen = data?.slaResumen;

  return (
    <>
      <PageHeader
        title="Bandeja de trámites"
        description="Cola operativa de documentos en revisión con seguimiento de SLA institucional"
        actions={
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={() => void loadBandeja()}
            sx={{ textTransform: 'none' }}
          >
            Actualizar
          </Button>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {resumen ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 2, flexWrap: 'wrap' }}
        >
          <Chip label={`En revisión: ${resumen.total}`} color="info" variant="outlined" />
          <Chip label={`SLA vencido: ${resumen.vencidos}`} color="error" variant="outlined" />
          <Chip label={`Por vencer: ${resumen.porVencer}`} color="warning" variant="outlined" />
          <Chip label={`En plazo: ${resumen.enPlazo}`} color="success" variant="outlined" />
          <Chip
            label={`Plazo institucional: ${data?.slaDiasInstitucional ?? 5} días`}
            variant="outlined"
          />
        </Stack>
      ) : null}

      <Box sx={{ ...listSurfaceSx, p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { md: 'flex-end' } }}
        >
          <TextField
            label="Buscar"
            size="small"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código, asunto…"
            sx={{ flex: 1, minWidth: 180 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Dependencia</InputLabel>
            <Select
              label="Dependencia"
              value={dependenciaId}
              onChange={(e) => setDependenciaId(String(e.target.value))}
            >
              <MenuItem value="">Todas</MenuItem>
              {dependencias.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.codigo} — {d.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Tipo documental</InputLabel>
            <Select
              label="Tipo documental"
              value={tipoDocumentalId}
              onChange={(e) => setTipoDocumentalId(String(e.target.value))}
            >
              <MenuItem value="">Todos</MenuItem>
              {tipos.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.codigo} — {t.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Estado SLA</InputLabel>
            <Select
              label="Estado SLA"
              value={slaEstado}
              onChange={(e) => setSlaEstado(String(e.target.value))}
            >
              {SLA_OPTIONS.map((o) => (
                <MenuItem key={o.value || 'all'} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => void loadBandeja()} sx={{ textTransform: 'none' }}>
            Filtrar
          </Button>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Cargando bandeja" />
        </Box>
      ) : !data?.items.length ? (
        <EmptyState
          title="Sin trámites en revisión"
          description="No hay documentos en estado «En revisión» con los filtros aplicados."
        />
      ) : (
        <TableContainer sx={listTableContainerSx}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Asunto</TableCell>
                <TableCell>Dependencia</TableCell>
                <TableCell>Ingreso revisión</TableCell>
                <TableCell>Límite SLA</TableCell>
                <TableCell>SLA</TableCell>
                <TableCell align="right">Días</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{row.codigo}</TableCell>
                  <TableCell>{row.asunto}</TableCell>
                  <TableCell>{row.dependencia?.codigo ?? '—'}</TableCell>
                  <TableCell>{fmtDate(row.fechaIngresoRevision)}</TableCell>
                  <TableCell>{fmtDate(row.fechaLimiteSla)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={slaLabel(row.slaEstado)}
                      color={slaChipColor(row.slaEstado)}
                    />
                  </TableCell>
                  <TableCell align="right">{row.diasEnRevision ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={() => navigate(`/documentos/${row.id}`)}
                      sx={{ textTransform: 'none' }}
                    >
                      Abrir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Estado documental: {labelDocumentoEstado('EN_REVISION')}. Para el tablero Kanban use menú
        Trámites.
      </Typography>
    </>
  );
}
