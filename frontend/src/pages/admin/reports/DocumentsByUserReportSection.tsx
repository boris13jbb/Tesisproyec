import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { apiClient } from '../../../api/client';
import { listSurfaceSx, listTableContainerSx } from '../../../components/listSurfaces';
import { SectionHeader } from '../../../components/SectionHeader';
import {
  DOCUMENTO_ESTADOS,
  DOCUMENTO_ESTADO_LABELS,
  documentoEstadoChipColor,
  labelDocumentoEstado,
  type DocumentoEstadoCodigo,
} from '../../../constants/documento-estado';

type TipoOption = { id: string; codigo: string; nombre: string; activo?: boolean };
type DepOption = { id: string; codigo: string; nombre: string; activo: boolean };
type UsuarioOption = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  activo: boolean;
};

type MonthChoice = {
  key: string;
  label: string;
  fechaDesde: string;
  fechaHasta: string;
};

type PersonaRef = {
  id: string | null;
  nombres: string | null;
  apellidos: string | null;
  email: string;
};

type ReportItem = {
  id: string;
  codigo: string;
  asunto: string;
  tipoDocumental: { id: string; codigo: string; nombre: string };
  dependencia: { id: string; codigo: string; nombre: string } | null;
  creadoPor: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
    email: string;
  };
  fechaDocumento: string;
  estado: string;
  revision: {
    revisadoPor: PersonaRef | null;
    fecha: string;
    decision: string;
    motivoRechazo: string | null;
  } | null;
};

type ReportResponse = {
  items: ReportItem[];
  summary: {
    total: number;
    aprobados: number;
    rechazados: number;
    enRevision: number;
    registrados: number;
    borradores: number;
    archivados: number;
  };
  porUsuario: {
    userId: string;
    nombres: string | null;
    apellidos: string | null;
    email: string;
    total: number;
    aprobados: number;
    rechazados: number;
    enRevision: number;
    registrados: number;
    borradores: number;
    archivados: number;
  }[];
};

type FormatoPreferido = 'todos' | 'pdf' | 'excel';

function personaLabel(p: {
  nombres?: string | null;
  apellidos?: string | null;
  email: string;
}): string {
  const name = [p.nombres, p.apellidos]
    .map((x) => (x ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return name || p.email;
}

function usuarioMenuLabel(u: UsuarioOption): string {
  const name = [u.nombres, u.apellidos]
    .map((x) => (x ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return name ? `${name} — ${u.email}` : u.email;
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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

type Props = {
  monthChoices: MonthChoice[];
  dependencias: DepOption[];
  tipos: TipoOption[];
};

export function DocumentsByUserReportSection({
  monthChoices,
  dependencias,
  tipos,
}: Props) {
  const navigate = useNavigate();
  const theme = useTheme();

  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const [draftMonthKey, setDraftMonthKey] = useState(monthChoices[0]?.key ?? '');
  const [draftUserId, setDraftUserId] = useState('');
  const [draftDepId, setDraftDepId] = useState('');
  const [draftTipoId, setDraftTipoId] = useState('');
  const [draftEstado, setDraftEstado] = useState('');
  const [draftFormato, setDraftFormato] = useState<FormatoPreferido>('todos');

  const [appliedMonthKey, setAppliedMonthKey] = useState(monthChoices[0]?.key ?? '');
  const [appliedUserId, setAppliedUserId] = useState('');
  const [appliedDepId, setAppliedDepId] = useState('');
  const [appliedTipoId, setAppliedTipoId] = useState('');
  const [appliedEstado, setAppliedEstado] = useState('');

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [exportMsg, setExportMsg] = useState<string | undefined>();
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    void apiClient
      .get<UsuarioOption[]>('/usuarios')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setUsuarios(list.filter((u) => u.activo));
      })
      .catch(() => setUsuarios([]));
  }, []);

  const buildParams = useCallback(
    (opts: {
      monthKey: string;
      userId: string;
      depId: string;
      tipoId: string;
      estado: string;
    }) => {
      const bounds =
        monthChoices.find((c) => c.key === opts.monthKey) ?? monthChoices[0];
      const p: Record<string, string> = {};
      if (bounds?.fechaDesde) p.fechaDesde = bounds.fechaDesde;
      if (bounds?.fechaHasta) p.fechaHasta = bounds.fechaHasta;
      if (opts.userId.trim()) p.createdByUserId = opts.userId.trim();
      if (opts.depId.trim()) p.dependenciaId = opts.depId.trim();
      if (opts.tipoId.trim()) p.tipoDocumentalId = opts.tipoId.trim();
      if (opts.estado.trim()) p.estado = opts.estado.trim();
      return p;
    },
    [monthChoices],
  );

  const queryParams = useMemo(
    () =>
      buildParams({
        monthKey: appliedMonthKey,
        userId: appliedUserId,
        depId: appliedDepId,
        tipoId: appliedTipoId,
        estado: appliedEstado,
      }),
    [
      buildParams,
      appliedMonthKey,
      appliedUserId,
      appliedDepId,
      appliedTipoId,
      appliedEstado,
    ],
  );

  const pdfLabelParams = useMemo(() => {
    const bounds =
      monthChoices.find((c) => c.key === appliedMonthKey) ?? monthChoices[0];
    const periodo = bounds?.label
      ? bounds.label.charAt(0).toUpperCase() + bounds.label.slice(1)
      : '—';
    const user = appliedUserId
      ? usuarios.find((u) => u.id === appliedUserId)
      : undefined;
    const dep = appliedDepId
      ? dependencias.find((d) => d.id === appliedDepId)
      : undefined;
    const tipo = appliedTipoId ? tipos.find((t) => t.id === appliedTipoId) : undefined;
    return {
      periodoLabel: periodo,
      usuarioLabel: user ? usuarioMenuLabel(user) : 'Todos',
      dependenciaLabel: dep ? `${dep.codigo} — ${dep.nombre}` : 'Todas',
      tipoLabel: tipo ? `${tipo.codigo} — ${tipo.nombre}` : 'Todos',
      estadoLabel: appliedEstado
        ? labelDocumentoEstado(appliedEstado)
        : 'Todos',
    };
  }, [
    appliedMonthKey,
    appliedUserId,
    appliedDepId,
    appliedTipoId,
    appliedEstado,
    monthChoices,
    usuarios,
    dependencias,
    tipos,
  ]);

  async function handleGenerar() {
    const nextMonth = draftMonthKey;
    const nextUser = draftUserId.trim();
    const nextDep = draftDepId.trim();
    const nextTipo = draftTipoId.trim();
    const nextEstado = draftEstado.trim();

    setAppliedMonthKey(nextMonth);
    setAppliedUserId(nextUser);
    setAppliedDepId(nextDep);
    setAppliedTipoId(nextTipo);
    setAppliedEstado(nextEstado);
    setExportMsg(undefined);
    setHasGenerated(true);
    setLoading(true);
    setError(undefined);

    const params = buildParams({
      monthKey: nextMonth,
      userId: nextUser,
      depId: nextDep,
      tipoId: nextTipo,
      estado: nextEstado,
    });

    try {
      const { data } = await apiClient.get<ReportResponse>(
        '/reportes/documentos-por-usuario',
        { params },
      );
      setReport(data);
    } catch {
      setReport(null);
      setError('No se pudo cargar el reporte.');
    } finally {
      setLoading(false);
    }
  }

  const permitePdf = draftFormato === 'todos' || draftFormato === 'pdf';
  const permiteExcel = draftFormato === 'todos' || draftFormato === 'excel';
  const showPorUsuario = hasGenerated && !appliedUserId && (report?.porUsuario.length ?? 0) > 0;

  const execExport = async (path: string, ext: string) => {
    setExportMsg(undefined);
    const mime =
      ext === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const params =
      ext === 'pdf' ? { ...queryParams, ...pdfLabelParams } : { ...queryParams };
    try {
      const res = await apiClient.get(path, { params, responseType: 'blob' });
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(
        new Blob([res.data], { type: mime }),
        `documentos_por_usuario_${stamp}.${ext}`,
      );
    } catch {
      setExportMsg('No se pudo generar la exportación. Verifique sesión y permisos.');
    }
  };

  const kpiCards = useMemo(() => {
    const s = report?.summary;
    if (!s) return [];
    return [
      {
        key: 'total',
        label: 'Total documentos',
        value: s.total,
        color: theme.palette.text.primary,
        bgcolor: theme.palette.action.hover,
      },
      {
        key: 'aprobados',
        label: 'Aprobados',
        value: s.aprobados,
        color: theme.palette.success.main,
        bgcolor: theme.palette.success.main + '14',
      },
      {
        key: 'rechazados',
        label: 'Rechazados',
        value: s.rechazados,
        color: theme.palette.error.main,
        bgcolor: theme.palette.error.main + '14',
      },
      {
        key: 'enRevision',
        label: 'En revisión',
        value: s.enRevision,
        color: theme.palette.warning.main,
        bgcolor: theme.palette.warning.main + '14',
      },
      {
        key: 'registrados',
        label: 'Registrados',
        value: s.registrados,
        color: theme.palette.info.main,
        bgcolor: theme.palette.info.main + '14',
      },
    ];
  }, [report, theme]);

  return (
    <Paper elevation={1} sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.75 }, mb: { xs: 2, md: 2.25 } }}>
      <SectionHeader
        icon={<GroupOutlinedIcon fontSize="small" />}
        title="Reporte de documentos por usuario"
        subtitle="Quién registró cada documento, estado, revisor, fecha de decisión y motivo de rechazo (datos reales)"
      />

      {exportMsg ? (
        <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setExportMsg(undefined)}>
          {exportMsg}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
            xl: 'repeat(6, 1fr)',
          },
          gap: 2,
          alignItems: 'flex-end',
          mt: 2,
        }}
      >
        <FormControl size="small" fullWidth>
          <InputLabel id="dpu-periodo">Periodo</InputLabel>
          <Select
            labelId="dpu-periodo"
            label="Periodo"
            value={draftMonthKey}
            onChange={(e: SelectChangeEvent) => setDraftMonthKey(e.target.value)}
          >
            {monthChoices.map((c) => (
              <MenuItem key={c.key} value={c.key}>
                {c.label.charAt(0).toUpperCase() + c.label.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel id="dpu-usuario">Usuario</InputLabel>
          <Select
            labelId="dpu-usuario"
            label="Usuario"
            value={draftUserId}
            onChange={(e: SelectChangeEvent) => setDraftUserId(e.target.value)}
          >
            <MenuItem value="">
              <Typography variant="body2">Todos los usuarios</Typography>
            </MenuItem>
            {usuarios.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {usuarioMenuLabel(u)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel id="dpu-area">Área / Dependencia</InputLabel>
          <Select
            labelId="dpu-area"
            label="Área / Dependencia"
            value={draftDepId}
            onChange={(e: SelectChangeEvent) => setDraftDepId(e.target.value)}
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
          <InputLabel id="dpu-tipo">Tipo documental</InputLabel>
          <Select
            labelId="dpu-tipo"
            label="Tipo documental"
            value={draftTipoId}
            onChange={(e: SelectChangeEvent) => setDraftTipoId(e.target.value)}
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
          <InputLabel id="dpu-estado">Estado</InputLabel>
          <Select
            labelId="dpu-estado"
            label="Estado"
            value={draftEstado}
            onChange={(e: SelectChangeEvent) => setDraftEstado(e.target.value)}
          >
            <MenuItem value="">
              <Typography variant="body2">Todos</Typography>
            </MenuItem>
            {DOCUMENTO_ESTADOS.map((code) => (
              <MenuItem key={code} value={code}>
                {DOCUMENTO_ESTADO_LABELS[code as DocumentoEstadoCodigo]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel id="dpu-formato">Formato</InputLabel>
          <Select
            labelId="dpu-formato"
            label="Formato"
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
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ mt: 2, flexWrap: 'wrap' }}
      >
        <Button
          variant="contained"
          color="secondary"
            onClick={() => void handleGenerar()}
          sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
        >
          Generar reporte
        </Button>
        {hasGenerated && permitePdf ? (
          <Button
            variant="outlined"
            disabled={loading}
            onClick={() => void execExport('/reportes/documentos-por-usuario.pdf', 'pdf')}
            sx={{ textTransform: 'none' }}
          >
            Exportar PDF
          </Button>
        ) : null}
        {hasGenerated && permiteExcel ? (
          <Button
            variant="outlined"
            disabled={loading}
            onClick={() => void execExport('/reportes/documentos-por-usuario.xlsx', 'xlsx')}
            sx={{ textTransform: 'none' }}
          >
            Exportar Excel
          </Button>
        ) : null}
      </Stack>

      {!hasGenerated ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Configure los filtros y pulse <strong>Generar reporte</strong> para ver el resumen y el detalle.
        </Typography>
      ) : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Cargando reporte" />
        </Box>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      {!loading && !error && hasGenerated && report ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr 1fr',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(5, 1fr)',
              },
              gap: 1.5,
              mt: 2.5,
            }}
          >
            {kpiCards.map((card) => (
              <Paper
                key={card.key}
                variant="outlined"
                sx={{
                  p: 1.75,
                  bgcolor: card.bgcolor,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {card.label}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: card.color, lineHeight: 1.2, mt: 0.5 }}
                >
                  {card.value}
                </Typography>
              </Paper>
            ))}
          </Box>

          {showPorUsuario ? (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Resumen por usuario
              </Typography>
              <TableContainer sx={listTableContainerSx}>
                <Table size="small" aria-label="Resumen por usuario">
                  <TableHead>
                    <TableRow>
                      <TableCell>Usuario</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Aprobados</TableCell>
                      <TableCell align="right">Rechazados</TableCell>
                      <TableCell align="right">En revisión</TableCell>
                      <TableCell align="right">Registrados</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.porUsuario.map((u) => (
                      <TableRow key={u.userId} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {personaLabel(u)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {u.email}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{u.total}</TableCell>
                        <TableCell align="right">{u.aprobados}</TableCell>
                        <TableCell align="right">{u.rechazados}</TableCell>
                        <TableCell align="right">{u.enRevision}</TableCell>
                        <TableCell align="right">{u.registrados}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Detalle de documentos
            </Typography>
            {report.items.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No existen documentos para los filtros seleccionados.
              </Typography>
            ) : (
              <TableContainer sx={{ ...listTableContainerSx, overflowX: 'auto' }}>
                <Table size="small" aria-label="Detalle documentos por usuario">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Documento / Asunto</TableCell>
                      <TableCell>Tipo documental</TableCell>
                      <TableCell>Área / Dependencia</TableCell>
                      <TableCell>Usuario creador</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Revisado por</TableCell>
                      <TableCell>Fecha revisión</TableCell>
                      <TableCell>Observación / Motivo</TableCell>
                      <TableCell align="right">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.items.map((row) => {
                      const motivo =
                        row.estado === 'RECHAZADO' && row.revision?.motivoRechazo
                          ? row.revision.motivoRechazo
                          : '—';
                      return (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                            {row.codigo}
                          </TableCell>
                          <TableCell sx={{ minWidth: 160 }}>{row.asunto}</TableCell>
                          <TableCell>{row.tipoDocumental.nombre}</TableCell>
                          <TableCell>
                            {row.dependencia?.nombre ?? '—'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {personaLabel(row.creadoPor)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.creadoPor.email}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {formatDate(row.fechaDocumento)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={labelDocumentoEstado(row.estado)}
                              color={documentoEstadoChipColor(row.estado)}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>
                            {row.revision?.revisadoPor ? (
                              <>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {personaLabel(row.revision.revisadoPor)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {row.revision.revisadoPor.email}
                                </Typography>
                              </>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {row.revision ? formatDate(row.revision.fecha) : '—'}
                          </TableCell>
                          <TableCell sx={{ minWidth: 140, maxWidth: 240 }}>
                            {motivo}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              onClick={() => navigate(`/documentos/${row.id}`)}
                              sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </>
      ) : null}
    </Paper>
  );
}
