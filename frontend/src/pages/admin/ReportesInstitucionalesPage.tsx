import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { apiClient } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';

const INSTITUTIONAL_TEAL = '#2D8A99';

const paperCardSx = {
  bgcolor: '#fff',
  borderRadius: 3,
  p: { xs: 2, md: 2.75 },
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
};

const BAR_PALETTE = ['#0f766e', '#16a34a', '#ea580c', '#0891b2', '#dc2626', '#7c3aed'];

type TipoOption = { id: string; codigo: string; nombre: string; activo?: boolean };
type DepOption = { id: string; codigo: string; nombre: string; activo: boolean };

type PorTipoResp = {
  items: { nombre: string; codigo: string; count: number }[];
};

/** Últimos 18 meses (incluye mes actual) para selector “Periodo”. */
function buildMonthChoices(): {
  key: string;
  label: string;
  fechaDesde: string;
  fechaHasta: string;
}[] {
  const out: {
    key: string;
    label: string;
    fechaDesde: string;
    fechaHasta: string;
  }[] = [];
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmtEs = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' });
  for (let i = 0; i < 18; i += 1) {
    const d = new Date(y, m - i, 1);
    const y1 = d.getFullYear();
    const m1 = d.getMonth();
    const desde = new Date(y1, m1, 1, 0, 0, 0, 0);
    const hasta = new Date(y1, m1 + 1, 0, 23, 59, 59, 999);
    out.push({
      key: `${y1}-${String(m1 + 1).padStart(2, '0')}`,
      label: fmtEs.format(desde),
      fechaDesde: desde.toISOString(),
      fechaHasta: hasta.toISOString(),
    });
  }
  return out;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function shortAxisLabel(name: string, codigo: string): string {
  const src = codigo.trim() || name;
  const t = src.trim();
  if (t.length <= 6) return t;
  return `${t.slice(0, 5)}…`;
}

type FormatoPreferido = 'todos' | 'pdf' | 'excel';

export function ReportesInstitucionalesPage() {
  const navigate = useNavigate();
  const monthChoices = useMemo(() => buildMonthChoices(), []);

  const [dependencias, setDependencias] = useState<DepOption[]>([]);
  const [tipos, setTipos] = useState<TipoOption[]>([]);

  const [draftMonthKey, setDraftMonthKey] = useState(monthChoices[0]?.key ?? '');
  const [draftDepId, setDraftDepId] = useState('');
  const [draftTipoId, setDraftTipoId] = useState('');
  const [draftFormato, setDraftFormato] = useState<FormatoPreferido>('todos');

  const [appliedMonthKey, setAppliedMonthKey] = useState(monthChoices[0]?.key ?? '');
  const [appliedDepId, setAppliedDepId] = useState('');
  const [appliedTipoId, setAppliedTipoId] = useState('');

  const [chartRows, setChartRows] = useState<PorTipoResp['items']>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | undefined>();

  const [exportMsg, setExportMsg] = useState<string | undefined>();
  const [traceDialogOpen, setTraceDialogOpen] = useState(false);

  const appliedBounds = useMemo(() => {
    const m = monthChoices.find((c) => c.key === appliedMonthKey) ?? monthChoices[0];
    return m ?? { fechaDesde: '', fechaHasta: '', key: '', label: '' };
  }, [appliedMonthKey, monthChoices]);

  const exportReportParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (appliedBounds?.fechaDesde) p.fechaDesde = appliedBounds.fechaDesde;
    if (appliedBounds?.fechaHasta) p.fechaHasta = appliedBounds.fechaHasta;
    const dep = appliedDepId.trim();
    if (dep) p.dependenciaId = dep;
    const tipo = appliedTipoId.trim();
    if (tipo) p.tipoDocumentalId = tipo;
    return p;
  }, [appliedBounds, appliedDepId, appliedTipoId]);

  const permitePdf = draftFormato === 'todos' || draftFormato === 'pdf';
  const permiteExcel = draftFormato === 'todos' || draftFormato === 'excel';

  useEffect(() => {
    Promise.all([
      apiClient.get<DepOption[]>('/dependencias').then((r) => r.data),
      apiClient.get<TipoOption[]>('/tipos-documentales').then((r) => r.data),
    ])
      .then(([deps, tp]) => {
        setDependencias(deps.filter((d) => d.activo));
        setTipos(tp.filter((t) => (t.activo !== undefined ? t.activo : true)));
      })
      .catch(() => {
        setDependencias([]);
        setTipos([]);
      });
  }, []);

  useEffect(() => {
    const m = monthChoices.find((x) => x.key === appliedMonthKey) ?? monthChoices[0];
    if (!m) return;

    let cancelled = false;

    void (async () => {
      setChartLoading(true);
      setChartError(undefined);
      try {
        const params: Record<string, string> = {
          fechaDesde: m.fechaDesde,
          fechaHasta: m.fechaHasta,
        };
        const dep = appliedDepId.trim();
        if (dep) params.dependenciaId = dep;
        const tipo = appliedTipoId.trim();
        if (tipo) params.tipoDocumentalId = tipo;

        const { data } = await apiClient.get<PorTipoResp>('/dashboard/admin/documentos-por-tipo', {
          params,
        });
        if (!cancelled) setChartRows(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) {
          setChartError('No se pudo cargar el indicador “documentos por tipo”.');
          setChartRows([]);
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appliedDepId, appliedMonthKey, appliedTipoId, monthChoices]);

  function handleGenerar() {
    setAppliedMonthKey(draftMonthKey);
    setAppliedDepId(draftDepId.trim());
    setAppliedTipoId(draftTipoId.trim());
    setExportMsg(undefined);
  }

  const maxCount = chartRows.length > 0 ? Math.max(...chartRows.map((r) => r.count), 1) : 1;
  const bars = chartRows.slice(0, 6);

  const execExport = async (
    path: '/reportes/documentos.pdf' | '/reportes/documentos.xlsx' | '/reportes/auditoria.pdf',
    ext: string,
  ) => {
    setExportMsg(undefined);
    const mime =
      path.endsWith('.pdf') ? 'application/pdf' :
      path.endsWith('.xlsx') ?
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : '';

    /** Auditoría no comparte filtros de documentos: solo rango temporal. */
    const params =
      path === '/reportes/auditoria.pdf' ?
        (() => {
          const audit: Record<string, string> = {};
          if (appliedBounds?.fechaDesde) audit.from = appliedBounds.fechaDesde;
          if (appliedBounds?.fechaHasta) audit.to = appliedBounds.fechaHasta;
          return audit;
        })()
      : exportReportParams;

    try {
      const res = await apiClient.get(path, {
        params,
        responseType: 'blob',
      });
      const stamp = new Date().toISOString().slice(0, 10);
      const slug = path.split('/').pop()?.replace('.', '_') ?? 'reporte';
      downloadBlob(new Blob([res.data], { type: mime || undefined }), `${slug}_${stamp}.${ext}`);
    } catch {
      setExportMsg('No se pudo generar la exportación. ¿Sesión válida y permiso ADMIN?');
    }
  };

  return (
    <>
      <PageHeader
        title="Reportes institucionales"
        description={
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Reportes
              </Box>{' '}
              · GADPR-LM · Sistema de Gestión Documental
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              Indicadores de gestión documental, seguridad y actividad por área.
            </Typography>
          </Stack>
        }
      />

      {exportMsg ? (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setExportMsg(undefined)}>
          {exportMsg}
        </Alert>
      ) : null}

      {/* Barra filtros */}
      <Paper elevation={1} sx={{ ...paperCardSx, mb: { xs: 2, md: 2.25 } }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
          Parámetros
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 2,
            alignItems: 'flex-end',
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel id="rep-periodo">Periodo</InputLabel>
            <Select<string>
              labelId="rep-periodo"
              label="Periodo"
              value={draftMonthKey}
              onChange={(e: SelectChangeEvent<string>) => setDraftMonthKey(e.target.value)}
            >
              {monthChoices.map((c) => (
                <MenuItem key={c.key} value={c.key}>
                  {c.label.charAt(0).toUpperCase() + c.label.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="rep-area">Área</InputLabel>
            <Select<string>
              labelId="rep-area"
              label="Área"
              value={draftDepId}
              onChange={(e: SelectChangeEvent<string>) => setDraftDepId(e.target.value)}
            >
              <MenuItem value="">
                <Typography variant="body2">Todas</Typography>
              </MenuItem>
              {dependencias.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.codigo} — {d.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="rep-tipo">Tipo</InputLabel>
            <Select<string>
              labelId="rep-tipo"
              label="Tipo"
              value={draftTipoId}
              onChange={(e: SelectChangeEvent<string>) => setDraftTipoId(e.target.value)}
            >
              <MenuItem value="">
                <Typography variant="body2">Todos</Typography>
              </MenuItem>
              {tipos.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.codigo} — {t.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="rep-formato">Formato preferido</InputLabel>
            <Select
              labelId="rep-formato"
              label="Formato preferido"
              value={draftFormato}
              onChange={(e: SelectChangeEvent) =>
                setDraftFormato(e.target.value as FormatoPreferido)
              }
            >
              <MenuItem value="todos">PDF / Excel</MenuItem>
              <MenuItem value="pdf">Solo PDF</MenuItem>
              <MenuItem value="excel">Solo Excel</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', lg: 'flex-end' } }}>
            <Button
              variant="contained"
              onClick={handleGenerar}
              sx={{
                width: '100%',
                bgcolor: INSTITUTIONAL_TEAL,
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2,
                py: 1.1,
                boxShadow: 'none',
                '&:hover': { bgcolor: INSTITUTIONAL_TEAL, filter: 'brightness(0.96)' },
              }}
            >
              Generar
            </Button>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Las exportaciones de documentos aplican período ({appliedBounds.label}), área y tipo seleccionados al pulsar{' '}
          <strong>Generar</strong>.
        </Typography>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 3fr) minmax(260px, 2fr)' },
          gap: { xs: 2, md: 2.25 },
          alignItems: 'stretch',
        }}
      >
        {/* Gráfico */}
        <Paper elevation={1} sx={{ ...paperCardSx, mb: 0 }}>
          <Stack direction="row" spacing={1.25} sx={{ mb: 2, alignItems: 'flex-start' }}>
            <Box
              aria-hidden
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                bgcolor: `${INSTITUTIONAL_TEAL}29`,
                color: INSTITUTIONAL_TEAL,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              P
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Documentos por tipo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Distribución en el período aplicado · hasta 6 tipos con mayor volumen
              </Typography>
            </Box>
            {chartLoading ? <CircularProgress size={22} /> : null}
          </Stack>

          {chartError ? (
            <Alert severity="warning">{chartError}</Alert>
          ) : (
            <>
              {!chartLoading && bars.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Sin documentos clasificados en este criterio.
                </Typography>
              ) : null}
              {bars.length > 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: { xs: 1, sm: 1.5 },
                    height: 220,
                    pt: 1,
                    pb: 0.5,
                    px: 0.5,
                  }}
                  role="img"
                  aria-label="Gráfico de barras documentos por tipo"
                >
                  {bars.map((row, idx) => {
                    const chartH = 160;
                    const barH = Math.max(28, Math.round((row.count / maxCount) * chartH));
                    const color = BAR_PALETTE[idx % BAR_PALETTE.length];
                    const label = shortAxisLabel(row.nombre, row.codigo);
                    return (
                      <Stack
                        key={`${row.codigo}-${idx}`}
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          height: '100%',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: 0.75,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {row.count}
                        </Typography>
                        <Box
                          sx={{
                            width: '100%',
                            maxWidth: 56,
                            height: barH,
                            bgcolor: color,
                            borderRadius: 1,
                            transition: 'height 0.25s ease',
                          }}
                          title={`${row.nombre} (${row.codigo})`}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.2 }}
                        >
                          {label}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Box>
              ) : null}
            </>
          )}
        </Paper>

        {/* Lista */}
        <Paper elevation={1} sx={{ ...paperCardSx, mb: 0 }}>
          <Stack direction="row" spacing={1.25} sx={{ mb: 2, alignItems: 'flex-start' }}>
            <Box
              aria-hidden
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                bgcolor: `${INSTITUTIONAL_TEAL}29`,
                color: INSTITUTIONAL_TEAL,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              D
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Reportes disponibles
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Exportación con filtros aplicados (documentos); auditoría solo por período temporal
              </Typography>
            </Box>
          </Stack>

          <Stack divider={<Divider flexItem />} spacing={0}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                py: 1.5,
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Inventario documental
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Todos los documentos clasificados según filtros
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {permitePdf ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void execExport('/reportes/documentos.pdf', 'pdf')}
                    sx={{ textTransform: 'none' }}
                  >
                    PDF
                  </Button>
                ) : null}
                {permiteExcel ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void execExport('/reportes/documentos.xlsx', 'xlsx')}
                    sx={{ textTransform: 'none' }}
                  >
                    XLSX
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                py: 1.5,
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Actividad por usuario
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Aproximación vía eventos de auditoría (período seleccionado)
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0, justifyContent: 'flex-end' }}>
                {permitePdf ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void execExport('/reportes/auditoria.pdf', 'pdf')}
                    sx={{ textTransform: 'none' }}
                  >
                    PDF
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                py: 1.5,
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Trazabilidad por documento
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Historial completo de un expediente (desde el detalle)
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setTraceDialogOpen(true)}
                sx={{ textTransform: 'none', alignSelf: { xs: 'stretch', sm: 'center' } }}
              >
                Cómo consultar
              </Button>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                py: 1.5,
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Cumplimiento de respaldos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Estado e integridad de copias (procedimiento institucional)
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate('/admin/respaldos')}
                sx={{ textTransform: 'none', alignSelf: { xs: 'stretch', sm: 'center' } }}
              >
                Abrir
              </Button>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                py: 1.5,
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Documentos por área
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Producción documental con columna de dependencia
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0, justifyContent: 'flex-end' }}>
                {permiteExcel ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void execExport('/reportes/documentos.xlsx', 'xlsx')}
                    sx={{ textTransform: 'none' }}
                  >
                    XLSX
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      <Dialog open={traceDialogOpen} onClose={() => setTraceDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Trazabilidad por documento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No existe una exportación PDF global de “historial por expediente” en el servidor actual. Para ver el historial:
          </Typography>
          <Typography component="ol" variant="body2" sx={{ pl: 2, m: 0 }}>
            <li>Menú Documentos → abra el expediente por código o listado.</li>
            <li>En detalle revise la tarjeta de historial/eventos registrados por el sistema.</li>
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Para evidencia técnica de acciones puede usar también la exportación PDF de Auditoría desde esta misma página.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTraceDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
