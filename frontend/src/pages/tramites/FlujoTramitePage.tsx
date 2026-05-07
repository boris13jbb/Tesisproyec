import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import {
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
const KANBAN_COLUMNAS: {
  estado: DocumentoEstadoCodigo;
  chipLabel: string;
  chipSx: { bgcolor: string; color: string; border?: string };
}[] = [
  {
    estado: 'REGISTRADO',
    chipLabel: 'Registrado',
    chipSx: { bgcolor: 'rgba(59, 130, 246, 0.14)', color: '#1d4ed8' },
  },
  {
    estado: 'EN_REVISION',
    chipLabel: 'En revisión',
    chipSx: { bgcolor: 'rgba(245, 158, 11, 0.16)', color: '#b45309' },
  },
  {
    estado: 'APROBADO',
    chipLabel: 'Aprobado',
    chipSx: { bgcolor: 'rgba(34, 197, 94, 0.14)', color: '#15803d' },
  },
  {
    estado: 'ARCHIVADO',
    chipLabel: 'Archivado',
    chipSx: {
      bgcolor: 'rgba(100, 116, 139, 0.12)',
      color: '#334155',
      border: '1px solid rgba(100, 116, 139, 0.25)',
    },
  },
];

const REGLA_NEGOCIO_TEAL = '#2D8A99';

const paperWrapSx = {
  borderRadius: 3,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
  bgcolor: 'background.paper',
} as const;

function formatHoraActualizacion(iso: Date): string {
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(iso);
}

export function FlujoTramitePage() {
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
    <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto' }}>
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

          <Box sx={{ ...paperWrapSx, p: { xs: 2, sm: 2.5 }, overflow: 'hidden' }}>
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
              {KANBAN_COLUMNAS.map((col) => {
                const data = byEstado[col.estado];
                const items = data?.items ?? [];
                const total = data?.total ?? 0;
                const truncado = total > items.length;

                return (
                  <Box
                    key={col.estado}
                    sx={{
                      flex: '1 1 260px',
                      minWidth: 260,
                      maxWidth: { md: 320 },
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Chip
                        label={col.chipLabel}
                        sx={{
                          fontWeight: 800,
                          ...col.chipSx,
                        }}
                      />
                    </Box>

                    <Stack spacing={1.25} sx={{ flex: 1 }}>
                      {items.length === 0 ? (
                        <EmptyState
                          dense
                          title="Sin documentos"
                          description={`No hay ítems en «${labelDocumentoEstado(col.estado)}».`}
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
                              <Card
                                variant="outlined"
                                sx={{
                                  borderRadius: 2,
                                  borderColor: 'rgba(15,23,42,0.08)',
                                  boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
                                }}
                              >
                                <CardActionArea
                                  onClick={() => void navigate(`/documentos/${doc.id}`)}
                                  sx={{ p: 1.5, alignItems: 'stretch', textAlign: 'left' }}
                                  aria-label={`Abrir documento ${doc.codigo}`}
                                >
                                  <Typography sx={{ fontWeight: 800, lineHeight: 1.3 }}>
                                    {doc.codigo}
                                  </Typography>
                                  <Typography variant="body2" sx={{ mt: 0.5 }} color="text.primary">
                                    {doc.tipoDocumental.nombre}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      mt: 0.25,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {doc.asunto}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: 0.75, display: 'block', fontWeight: 600 }}
                                  >
                                    {lugar}
                                  </Typography>
                                </CardActionArea>
                              </Card>
                            </Tooltip>
                          );
                        })
                      )}
                    </Stack>

                    {truncado && (
                      <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                        Mostrando {items.length} de {total}. Use la bandeja con filtro «
                        {labelDocumentoEstado(col.estado)}» para el listado completo.
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
                  color: REGLA_NEGOCIO_TEAL,
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
    </Container>
  );
}
