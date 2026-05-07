import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import TopicOutlinedIcon from '@mui/icons-material/TopicOutlined';
import {
  Alert,
  Box,
  CircularProgress,
  Collapse,
  Container,
  Grid,
  IconButton,
  Link,
  List,
  ListItemButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { labelNivelConfidencialidad } from '../../constants/confidencialidad';

type SerieRow = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

type SubserieRow = {
  id: string;
  serieId: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

type ClasificacionAgg = {
  expedientes: number;
  dependenciaId: string | null;
  dependenciaNombre: string | null;
  nivelConfidencialidad: string | null;
};

type ClasificacionAgregadosResponse = {
  series: Record<string, ClasificacionAgg>;
  subseries: Record<string, ClasificacionAgg>;
};

const INSTITUTIONAL_TEAL = '#2D8A99';
const INSTITUTIONAL_TEAL_SOFT = 'rgba(45, 138, 153, 0.14)';
const INSTITUTIONAL_NAVY = '#1A2B3C';

const paperCardSx = {
  borderRadius: 3,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
} as const;

const CONSERVACION_SIN_MODELO_DATOS =
  'Plazos / disposición final no están almacenados en el sistema (pending ISO 15489 en datos del catálogo).';

const RETENCION_TABLA_NA = '— (no modelado en datos)';

const DESTINO_TABLA_NA = '—';

type Selection =
  | { kind: 'serie'; serie: SerieRow }
  | { kind: 'subserie'; serie: SerieRow; subserie: SubserieRow };

function SectionHeaderLetter({
  letter,
  accent = 'teal',
  title,
  subtitle,
}: {
  letter: string;
  accent?: 'teal' | 'blue';
  title: string;
  subtitle: string;
}) {
  const badgeBg =
    accent === 'blue' ? 'rgba(37, 99, 235, 0.14)' : INSTITUTIONAL_TEAL_SOFT;
  const badgeFg = accent === 'blue' ? '#1d4ed8' : INSTITUTIONAL_TEAL;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 34,
          borderRadius: 2,
          bgcolor: badgeBg,
          color: badgeFg,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 900,
          flexShrink: 0,
        }}
      >
        {letter}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
    </Stack>
  );
}

function ReadonlyFieldRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        sx={{
          p: 1.25,
          borderRadius: 2,
          bgcolor: 'rgba(15,23,42,0.03)',
          border: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/** Código compuesto institucional: SERIE-SUB cuando aplica subserie (catálogo real). */
function buildDisplayCodigo(serie: SerieRow, sub?: SubserieRow) {
  if (sub) return `${serie.codigo}-${sub.codigo}`;
  return serie.codigo;
}

export function ClasificacionDocumentalPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;
  const [series, setSeries] = useState<SerieRow[]>([]);
  const [subseries, setSubseries] = useState<SubserieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rootOpen, setRootOpen] = useState(true);
  const [expandedSerieIds, setExpandedSerieIds] = useState<Set<string>>(() => new Set());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [agregados, setAgregados] = useState<ClasificacionAgregadosResponse | null>(
    null,
  );

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [sr, ss, ag] = await Promise.all([
        apiClient.get<SerieRow[]>('/series', { params: { incluirInactivos: 'false' } }),
        apiClient.get<SubserieRow[]>('/subseries', { params: { incluirInactivos: 'false' } }),
        apiClient.get<ClasificacionAgregadosResponse>('/documentos/clasificacion-agregados'),
      ]);
      const sSorted = [...sr.data].sort((a, b) => a.codigo.localeCompare(b.codigo));
      const subSorted = [...ss.data].sort((a, b) => {
        const sa = sSorted.find((x) => x.id === a.serieId);
        const sb = sSorted.find((x) => x.id === b.serieId);
        const ac = sa?.codigo ?? '';
        const bc = sb?.codigo ?? '';
        if (ac !== bc) return ac.localeCompare(bc);
        return a.codigo.localeCompare(b.codigo);
      });
      setSeries(sSorted);
      setSubseries(subSorted);
      setAgregados(ag.data);
      setExpandedSerieIds(new Set(sSorted.map((x) => x.id)));
      let firstSel: Selection | null = null;
      for (const s of sSorted) {
        const subs = subSorted.filter((u) => u.serieId === s.id);
        if (subs.length > 0) {
          firstSel = { kind: 'subserie', serie: s, subserie: subs[0] };
          break;
        }
      }
      if (!firstSel && sSorted[0]) {
        firstSel = { kind: 'serie', serie: sSorted[0] };
      }
      setSelection(firstSel);
    } catch {
      setError('No se pudo cargar la clasificación documental.');
      setSeries([]);
      setSubseries([]);
      setSelection(null);
      setAgregados(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sincroniza vista con catálogo
    void load();
  }, [load]);

  const subsBySerieId = useMemo(() => {
    const m = new Map<string, SubserieRow[]>();
    for (const u of subseries) {
      const arr = m.get(u.serieId) ?? [];
      arr.push(u);
      m.set(u.serieId, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.codigo.localeCompare(b.codigo));
    }
    return m;
  }, [subseries]);

  const retentionRows = useMemo(
    () =>
      series.map((s) => {
        const agg = agregados?.series[s.id];
        const expedientes = agg?.expedientes ?? 0;
        return {
          id: s.id,
          nombre: s.nombre,
          codigo: s.codigo,
          expedientes,
          retencion: RETENCION_TABLA_NA,
          destino: DESTINO_TABLA_NA,
        };
      }),
    [series, agregados],
  );

  const fichaAgregacion = useMemo(() => {
    if (!selection || !agregados) return null;
    if (selection.kind === 'subserie') return agregados.subseries[selection.subserie.id] ?? null;
    return agregados.series[selection.serie.id] ?? null;
  }, [selection, agregados]);

  const toggleSerieExpand = (id: string) => {
    setExpandedSerieIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Container maxWidth="lg">
      <PageHeader
        title="Cuadro de clasificación documental"
        description={
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Clasificación documental · GADPR-LM · Sistema de Gestión Documental
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Árbol y fichas desde el catálogo activo; conteos de expedientes y niveles predominantes desde documentos que
              usted puede ver (mismas reglas que la bandeja).
            </Typography>
          </Stack>
        }
        actions={
          <Tooltip title="Recargar catálogo y cifras">
            <IconButton
              aria-label="Actualizar clasificación documental"
              onClick={() => void load()}
              disabled={loading}
              color="primary"
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Cargando clasificación documental" />
        </Box>
      ) : series.length === 0 ? (
        <EmptyState
          title="Sin series en catálogo"
          description="Cuando existan series y subseries activas aparecerán en el árbol. Quien sea ADMIN puede darlas de alta en Catálogos."
        />
      ) : (
        <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                ...paperCardSx,
                p: 2,
                height: '100%',
                minHeight: 420,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <SectionHeaderLetter
                letter="C"
                title="Estructura documental"
                subtitle="Basado en ISO 15489"
              />
              <Box
                sx={{
                  mt: 2,
                  flex: 1,
                  overflow: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <List disablePadding dense>
                  <Box
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: 'rgba(45,138,153,0.04)',
                    }}
                  >
                    <Stack
                      direction="row"
                      sx={{ alignItems: 'center', pl: 0.5, pr: 0.5 }}
                    >
                      <IconButton
                        aria-label={rootOpen ? 'Contraer fondo' : 'Expandir fondo'}
                        size="small"
                        onClick={() => setRootOpen((o) => !o)}
                      >
                        {rootOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <Typography sx={{ fontWeight: 900, flex: 1, color: INSTITUTIONAL_NAVY }}>
                        Fondo documental GADPR-LM
                      </Typography>
                    </Stack>
                  </Box>
                  <Collapse in={rootOpen}>
                    <Box sx={{ pl: 2, pr: 0.5, py: 0.5 }}>
                      {series.map((s) => {
                        const subs = subsBySerieId.get(s.id) ?? [];
                        const expanded = expandedSerieIds.has(s.id);
                        const serieSelected =
                          selection?.kind === 'serie' && selection.serie.id === s.id;

                        return (
                          <Box key={s.id}>
                            <Stack
                              direction="row"
                              sx={{
                                alignItems: 'center',
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: serieSelected ? 'rgba(45,138,153,0.08)' : 'transparent',
                              }}
                            >
                              {subs.length > 0 ? (
                                <IconButton
                                  size="small"
                                  aria-label={expanded ? `Contraer ${s.codigo}` : `Expandir ${s.codigo}`}
                                  onClick={() => toggleSerieExpand(s.id)}
                                >
                                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              ) : (
                                <Box sx={{ width: 40 }} />
                              )}
                              <Box
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelection({ kind: 'serie', serie: s });
                                  }
                                }}
                                onClick={() => setSelection({ kind: 'serie', serie: s })}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  flex: 1,
                                  py: 0.75,
                                  cursor: 'pointer',
                                  outline: 'none',
                                  '&:focus-visible': { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}` },
                                }}
                              >
                                <FolderOpenOutlinedIcon
                                  sx={{ fontSize: 18, color: 'text.secondary' }}
                                  aria-hidden
                                />
                                <Typography sx={{ fontWeight: 800 }}>{s.nombre}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ({s.codigo})
                                </Typography>
                              </Box>
                            </Stack>

                            <Collapse in={subs.length === 0 || expanded}>
                              {subs.length > 0 && (
                                <Box
                                  sx={{
                                    ml: 2.25,
                                    pl: 2,
                                    borderLeft: '2px solid rgba(45,138,153,0.25)',
                                  }}
                                >
                                  {subs.map((u) => {
                                    const sel =
                                      selection?.kind === 'subserie' &&
                                      selection.subserie.id === u.id;
                                    return (
                                      <ListItemButton
                                        key={u.id}
                                        selected={Boolean(sel)}
                                        onClick={() =>
                                          setSelection({ kind: 'subserie', serie: s, subserie: u })
                                        }
                                        sx={{
                                          alignItems: 'center',
                                          gap: 0.5,
                                          py: 0.75,
                                          pl: 0.75,
                                          borderRadius: 1,
                                        }}
                                      >
                                        <ChevronRightIcon sx={{ fontSize: 18, opacity: 0.6 }} aria-hidden />
                                        <TopicOutlinedIcon
                                          sx={{ fontSize: 18, color: 'text.secondary' }}
                                          aria-hidden
                                        />
                                        <Typography sx={{ fontWeight: 700 }}>{u.nombre}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          ({u.codigo})
                                        </Typography>
                                      </ListItemButton>
                                    );
                                  })}
                                </Box>
                              )}
                            </Collapse>
                          </Box>
                        );
                      })}
                    </Box>
                  </Collapse>
                </List>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Catálogo de solo lectura.
                {isAdmin ? (
                  <>
                    {' '}
                    Para altas y ediciones:{' '}
                    <Link component={RouterLink} to="/catalogos/series" underline="hover">
                      Series
                    </Link>
                    {' · '}
                    <Link component={RouterLink} to="/catalogos/subseries" underline="hover">
                      Subseries
                    </Link>
                  </>
                ) : (
                  <> Quien tenga rol ADMIN puede actualizar el catálogo desde el menú de administración.</>
                )}
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2} sx={{ height: '100%' }}>
              <Paper elevation={0} sx={{ ...paperCardSx, p: 2.25 }}>
                <SectionHeaderLetter
                  letter="D"
                  accent="blue"
                  title="Ficha de clasificación"
                  subtitle={
                    selection?.kind === 'subserie' ? 'Subserie seleccionada' : 'Serie seleccionada'
                  }
                />
                {selection ? (
                  <Box sx={{ mt: 2 }}>
                    <ReadonlyFieldRow
                      label="Código"
                      value={buildDisplayCodigo(
                        selection.serie,
                        selection.kind === 'subserie' ? selection.subserie : undefined,
                      )}
                    />
                    <ReadonlyFieldRow
                      label="Nombre"
                      value={
                        selection.kind === 'subserie'
                          ? selection.subserie.nombre
                          : selection.serie.nombre
                      }
                    />
                    <ReadonlyFieldRow
                      label="Expedientes visibles"
                      value={
                        fichaAgregacion === null
                          ? '—'
                          : String(fichaAgregacion.expedientes)
                      }
                    />
                    <ReadonlyFieldRow
                      label="Área responsable (predominante en expedientes)"
                      value={
                        fichaAgregacion === null || fichaAgregacion.expedientes === 0
                          ? 'Sin expedientes que coincidan con su visibilidad en esta clasificación.'
                          : fichaAgregacion.dependenciaNombre ??
                            'Sin dependencia asignada en la mayoría de expedientes visibles.'
                      }
                    />
                    <ReadonlyFieldRow
                      label="Nivel de acceso predominante"
                      value={
                        fichaAgregacion === null || fichaAgregacion.expedientes === 0
                          ? 'Sin expedientes que coincidan con su visibilidad en esta clasificación.'
                          : labelNivelConfidencialidad(fichaAgregacion.nivelConfidencialidad)
                      }
                    />
                    <ReadonlyFieldRow label="Conservación (plazo / destino)" value={CONSERVACION_SIN_MODELO_DATOS} />
                    {(selection.kind === 'subserie'
                      ? selection.subserie.descripcion
                      : selection.serie.descripcion) && (
                      <ReadonlyFieldRow
                        label="Descripción (catálogo)"
                        value={
                          (selection.kind === 'subserie'
                            ? selection.subserie.descripcion
                            : selection.serie.descripcion) ?? ''
                        }
                      />
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Seleccione una serie o subserie en el árbol.
                  </Typography>
                )}
              </Paper>

              <Paper elevation={0} sx={{ ...paperCardSx, p: 2.25, flex: 1 }}>
                <SectionHeaderLetter
                  letter="R"
                  title="Tabla de retención"
                  subtitle="Política de conservación documental"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                  Una fila por <strong>serie activa</strong> del catálogo. «Expedientes visibles» es el recuento de
                  registros vigentes (<code>activo</code>) que usted puede ver bajo esa serie (todas las subseries
                  relacionadas). Retención y destino final <strong>no</strong> existen como campos en base de datos: se muestran
                  como pendientes sin inventar plazos.
                </Typography>
                <TableContainer sx={{ mt: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Table size="small" aria-label="Tabla de retención por serie">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 800 }}>Serie</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">
                          Expedientes visibles
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Retención</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Destino final</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {retentionRows.map((r) => {
                        const highlight =
                          selection?.serie.id === r.id ||
                          (selection?.kind === 'subserie' && selection.serie.id === r.id);
                        return (
                          <TableRow
                            key={r.id}
                            sx={{
                              bgcolor: highlight ? 'rgba(45,138,153,0.06)' : 'inherit',
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {r.nombre}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {r.codigo}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {r.expedientes}
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{r.retencion}</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{r.destino}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
