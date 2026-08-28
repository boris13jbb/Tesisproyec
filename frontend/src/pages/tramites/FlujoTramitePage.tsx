import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { DocumentoListCard } from '../../components/DocumentoListCard';
import { EmptyState } from '../../components/EmptyState';
import { listSurfaceSx } from '../../components/listSurfaces';
import { PageHeader } from '../../components/PageHeader';
import {
  documentoEstadoChipColor,
  documentoEstadoTone,
  labelDocumentoEstado,
  type DocumentoEstadoCodigo,
} from '../../constants/documento-estado';

type TipoOption = { id: string; codigo: string; nombre: string };

type DocumentoRow = {
  id: string;
  codigo: string;
  asunto: string;
  estado: string;
  tipoDocumental: TipoOption;
  dependencia: { id: string; codigo: string; nombre: string } | null;
};

type DocumentosPaged = {
  page: number;
  pageSize: number;
  total: number;
  items: DocumentoRow[];
};

type TablonTramitesResponse = {
  kanban: {
    REGISTRADO: DocumentosPaged;
    EN_REVISION: DocumentosPaged;
    APROBADO: DocumentosPaged;
    ARCHIVADO: DocumentosPaged;
  };
  otrosTotales: { BORRADOR: number; RECHAZADO: number };
};

/** Estados del Kanban principal (alineado con modelo de trabajo documental real). */
const KANBAN_COLUMNAS: DocumentoEstadoCodigo[] = [
  'REGISTRADO',
  'EN_REVISION',
  'APROBADO',
  'ARCHIVADO',
];

const paperWrapSx = {
  ...listSurfaceSx,
  p: { xs: 2, sm: 2.5 },
  overflow: 'hidden',
} as const;

function formatHoraActualizacion(iso: Date): string {
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(iso);
}

export function FlujoTramitePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [byEstado, setByEstado] = useState<
    Partial<Record<DocumentoEstadoCodigo, DocumentosPaged>>
  >({});
  const [otrosTotales, setOtrosTotales] = useState<{
    BORRADOR: number;
    RECHAZADO: number;
  }>({ BORRADOR: 0, RECHAZADO: 0 });
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.get<TablonTramitesResponse>(
        '/documentos/tablon-tramites',
      );
      setByEstado(data.kanban);
      setOtrosTotales(data.otrosTotales);
      setActualizadoEn(new Date());
    } catch {
      setError('No se pudo cargar el flujo de trámite.');
      setByEstado({});
      setOtrosTotales({ BORRADOR: 0, RECHAZADO: 0 });
      setActualizadoEn(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sincroniza tablero con la API
    void load();
  }, [load]);

  const hayOtros = useMemo(
    () => otrosTotales.BORRADOR > 0 || otrosTotales.RECHAZADO > 0,
    [otrosTotales],
  );

  return (
    <Box sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
      <PageHeader
        title="Flujo de trámite"
        description={
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Trámite documental · GADPR-LM · Sistema de Gestión Documental
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Seguimiento del documento desde el registro hasta el archivo final.
            </Typography>
          </Stack>
        }
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {actualizadoEn ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Actualizado · {formatHoraActualizacion(actualizadoEn)}
              </Typography>
            ) : null}
            <Tooltip title="Actualizar tablero">
              <IconButton
                aria-label="Actualizar tablero de trámites"
                onClick={() => void load()}
                disabled={loading}
                color="primary"
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label="Cargando tablero de trámites" />
        </Box>
      )}

      {!loading && (
        <>
          {hayOtros && (
            <Alert severity="info" sx={{ mb: 2 }} variant="outlined">
              <Typography variant="body2" component="span">
                Estados fuera del tablero principal:{' '}
                {otrosTotales.BORRADOR > 0 && (
                  <>
                    <strong>Borrador</strong> ({otrosTotales.BORRADOR}) ·{' '}
                  </>
                )}
                {otrosTotales.RECHAZADO > 0 && (
                  <>
                    <strong>Rechazado</strong> ({otrosTotales.RECHAZADO})
                  </>
                )}
                . Consulte y filtre por estado en la{' '}
                <Link component={RouterLink} to="/documentos" underline="hover">
                  bandeja de documentos
                </Link>
                .
              </Typography>
            </Alert>
          )}

          {actualizadoEn ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, mb: 1 }}>
              Actualizado · {formatHoraActualizacion(actualizadoEn)}
            </Typography>
          ) : null}

          <Box sx={paperWrapSx}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Datos según tu sesión y reglas de visibilidad institucional; cada expediente aparece solo en una
              columna (su estado vigente).
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 1,
                alignItems: 'stretch',
              }}
            >
              {KANBAN_COLUMNAS.map((estadoCol) => {
                const data = byEstado[estadoCol];
                const items = data?.items ?? [];
                const total = data?.total ?? 0;
                const truncado = total > items.length;
                const toneKey = documentoEstadoTone(estadoCol);
                const accent = theme.palette[toneKey].main;

                return (
                  <Box
                    key={estadoCol}
                    sx={{
                      flex: '1 1 260px',
                      minWidth: 260,
                      maxWidth: { md: 320 },
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.25,
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: alpha(accent, theme.palette.mode === 'dark' ? 0.1 : 0.06),
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}
                    >
                      <Box
                        aria-hidden
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1.5,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: alpha(accent, 0.18),
                          color: accent,
                        }}
                      >
                        <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />
                      </Box>
                      <Chip
                        label={labelDocumentoEstado(estadoCol)}
                        size="small"
                        color={documentoEstadoChipColor(estadoCol)}
                        sx={{ fontWeight: 800 }}
                      />
                      <Chip
                        label={total}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, height: 22 }}
                        aria-label={`${total} documentos en ${labelDocumentoEstado(estadoCol)}`}
                      />
                    </Stack>

                    <Stack
                      spacing={1.25}
                      sx={{ flex: 1 }}
                      role={items.length > 0 ? 'list' : undefined}
                      aria-label={
                        items.length > 0
                          ? `Documentos en ${labelDocumentoEstado(estadoCol)}`
                          : undefined
                      }
                    >
                      {items.length === 0 ? (
                        <EmptyState
                          dense
                          title="Sin documentos"
                          description={`No hay ítems en «${labelDocumentoEstado(estadoCol)}».`}
                        />
                      ) : (
                        items.map((doc) => {
                          const tituloTipo = `${doc.tipoDocumental.codigo} — ${doc.tipoDocumental.nombre}`;
                          const lugar =
                            doc.dependencia?.nombre ?? 'Sin dependencia asignada';
                          const tipTarjeta = [
                            `${doc.codigo}: ${tituloTipo}`,
                            `Asunto: ${doc.asunto}`,
                            lugar,
                          ].join('\n');
                          return (
                            <Tooltip key={doc.id} title={tipTarjeta} arrow enterDelay={400}>
                              <DocumentoListCard
                                compact
                                codigo={doc.codigo}
                                asunto={doc.asunto}
                                estado={doc.estado}
                                tipoNombre={doc.tipoDocumental.nombre}
                                clasificacionTitle={tituloTipo}
                                responsablePrimary={lugar}
                                onOpen={() => void navigate(`/documentos/${doc.id}`)}
                              />
                            </Tooltip>
                          );
                        })
                      )}
                    </Stack>

                    {truncado && (
                      <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                        Mostrando {items.length} de {total}. Use la bandeja con filtro «
                        {labelDocumentoEstado(estadoCol)}» para el listado completo.
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>

            <Box
              sx={{
                mt: 2.5,
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'secondary.main',
                  fontWeight: 600,
                  textAlign: { xs: 'left', sm: 'center' },
                }}
              >
                Regla de negocio: cada cambio genera evidencia de usuario, fecha, IP y acción
                realizada.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                Tablero alimentado con expedientes reales por estado (una solicitud agrupada al servidor por
                actualización). Las transiciones de estado se hacen desde el detalle del documento según permisos; no hay
                arrastrar tarjetas.
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
