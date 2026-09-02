import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from './SectionHeader';
import {
  dashboardCardPadding,
  dashboardSectionSubtitleSx,
  dashboardSectionTitleSx,
  dashboardSurfaceSx,
} from './dashboard/dashboard-surface';
import { listSurfaceSx } from './listSurfaces';
import { documentosPathForLikert } from '../nav/documentos-likert-navigation';
import type { LikertNivelCodigoUi } from '../nav/documentos-likert-navigation';
import LinearProgress from '@mui/material/LinearProgress';

export type EvaluacionLikertNivel = {
  codigo: 'OPTIMO' | 'MODERADO' | 'CRITICO';
  nivel: 5 | 3 | 1;
  etiqueta: string;
  colorTone: 'success' | 'warning' | 'error';
  descripcion: string;
  count: number;
  percent: number;
};

export type EvaluacionLikertData = {
  diasUmbral: number;
  total: number;
  optimo: number;
  moderado: number;
  critico: number;
  niveles: EvaluacionLikertNivel[];
};

export type ComplianceMetricUi = {
  key: string;
  title: string;
  standard: string;
  percent: number;
};

type Props = {
  data: EvaluacionLikertData | null | undefined;
  loading?: boolean;
  variant?: 'full' | 'compact';
  compliance?: ComplianceMetricUi[];
};

function toneColor(
  theme: Theme,
  tone: EvaluacionLikertNivel['colorTone'],
): string {
  return theme.palette[tone].main;
}

/** Donut CSS con conic-gradient (sin librería de charts). */
function LikertDonut({
  niveles,
  total,
}: {
  niveles: EvaluacionLikertNivel[];
  total: number;
}) {
  const theme = useTheme();
  if (total <= 0) {
    return (
      <Box
        sx={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          mx: 'auto',
        }}
      />
    );
  }
  let cursor = 0;
  const stops: string[] = [];
  for (const n of niveles) {
    const share = (n.count / total) * 100;
    const color = toneColor(theme, n.colorTone);
    const from = cursor;
    const to = cursor + share;
    stops.push(`${color} ${from}% ${to}%`);
    cursor = to;
  }
  return (
    <Box sx={{ position: 'relative', width: 160, height: 160, mx: 'auto' }}>
      <Box
        role="img"
        aria-label="Distribución Likert de salud documental"
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `conic-gradient(${stops.join(', ')})`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: '28%',
          borderRadius: '50%',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
          {total}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          Total
        </Typography>
      </Box>
    </Box>
  );
}

function complianceColorForPercent(p: number): 'success' | 'warning' | 'primary' {
  if (p >= 85) return 'success';
  if (p >= 70) return 'primary';
  return 'warning';
}

function likertShortLabel(codigo: EvaluacionLikertNivel['codigo']): string {
  if (codigo === 'OPTIMO') return 'Óptimo';
  if (codigo === 'MODERADO') return 'Moderado';
  return 'Crítico';
}

export function EvaluacionLikertCharts({
  data,
  loading,
  variant = 'full',
  compliance = [],
}: Props) {
  const theme = useTheme();
  const navigate = useNavigate();
  const niveles = data?.niveles ?? [];
  const total = data?.total ?? 0;
  const maxBar = Math.max(1, ...niveles.map((n) => n.count));

  function openNivel(codigo: EvaluacionLikertNivel['codigo']) {
    navigate(documentosPathForLikert(codigo as LikertNivelCodigoUi));
  }

  if (variant === 'compact') {
    return (
      <Box sx={{ ...dashboardSurfaceSx, p: dashboardCardPadding, height: '100%' }}>
        <Typography component="h2" sx={dashboardSectionTitleSx}>
          Auditoría y evaluación
        </Typography>
        <Typography sx={dashboardSectionSubtitleSx}>
          Semáforo documental y cumplimiento operativo (últimos 30 días).
        </Typography>

        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Cargando evaluación…
          </Typography>
        ) : null}

        {!loading && total === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No hay documentos en el ámbito visible para evaluar.
          </Typography>
        ) : null}

        {!loading && total > 0 ? (
          <Grid container spacing={1.25} sx={{ mt: 1.5 }}>
            {niveles.map((n) => {
              const color = toneColor(theme, n.colorTone);
              return (
                <Grid key={n.codigo} size={{ xs: 4 }}>
                  <ButtonBase
                    onClick={() => openNivel(n.codigo)}
                    focusRipple
                    aria-label={`Ver documentos ${likertShortLabel(n.codigo)}`}
                    sx={{
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 1.25,
                      display: 'block',
                      transition: 'border-color 120ms ease, box-shadow 120ms ease',
                      '&:hover': {
                        borderColor: color,
                        boxShadow: `0 0 0 1px ${alpha(color, 0.35)}`,
                      },
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      {likertShortLabel(n.codigo)}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color, lineHeight: 1.1, mt: 0.25 }}>
                      {n.count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {n.percent}%
                    </Typography>
                  </ButtonBase>
                </Grid>
              );
            })}
          </Grid>
        ) : null}

        {!loading && compliance.length > 0 ? (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1.25 }}>
              Indicadores operativos principales
            </Typography>
            {compliance.map((m) => (
              <Box key={m.key} sx={{ mb: 1.5 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.35 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {m.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {m.percent}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={m.percent}
                  color={complianceColorForPercent(m.percent)}
                  aria-label={`${m.title}: ${m.percent} por ciento`}
                  sx={{ height: 6, borderRadius: 999, bgcolor: 'action.hover' }}
                />
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ ...listSurfaceSx, mb: 2.5, p: { xs: 2, md: 2.5 } }}>
      <SectionHeader
        icon={<SpeedOutlinedIcon fontSize="small" />}
        title="Dashboard de Auditoría y Evaluación (Escala de Likert)"
        subtitle="Clasificación del estado y salud documental bajo criterios de control institucional tipo semáforo. Pulse un nivel para ver el listado filtrado."
      />

      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, py: 3, textAlign: 'center' }}>
          Cargando evaluación Likert…
        </Typography>
      ) : null}

      {!loading && total === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No hay documentos en el ámbito visible para evaluar.
        </Typography>
      ) : null}

      {!loading && total > 0 ? (
        <>
          <Grid container spacing={2} sx={{ mt: 1.5 }}>
            {niveles.map((n) => {
              const color = toneColor(theme, n.colorTone);
              return (
                <Grid key={n.codigo} size={{ xs: 12, sm: 4 }}>
                  <ButtonBase
                    onClick={() => openNivel(n.codigo)}
                    focusRipple
                    aria-label={`Ver documentos ${n.etiqueta}`}
                    sx={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      height: '100%',
                      transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                      '&:hover': {
                        borderColor: color,
                        boxShadow: `0 0 0 1px ${alpha(color, 0.4)}`,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        px: 1.5,
                        py: 1,
                        bgcolor: alpha(color, 0.16),
                        borderBottom: '1px solid',
                        borderColor: alpha(color, 0.35),
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 800, color, display: 'block' }}
                      >
                        {n.etiqueta}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography
                        variant="h3"
                        sx={{ fontWeight: 800, color, lineHeight: 1.1 }}
                      >
                        {n.count}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {n.descripcion}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, mt: 1 }}>
                        {n.percent}% del total
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', mt: 1.25, fontWeight: 700, color }}
                      >
                        Ver listado →
                      </Typography>
                    </Box>
                  </ButtonBase>
                </Grid>
              );
            })}
          </Grid>

          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                Distribución global (Likert)
              </Typography>
              <LikertDonut niveles={niveles} total={total} />
              <Stack spacing={0.75} sx={{ mt: 2 }}>
                {niveles.map((n) => (
                  <Stack
                    key={`leg-${n.codigo}`}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: 0.5,
                        bgcolor: toneColor(theme, n.colorTone),
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {n.etiqueta.replace(/^Nivel \d+:\s*/, '')} — {n.count} ({n.percent}%)
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                Volumen por nivel Likert
              </Typography>
              <Box
                role="img"
                aria-label="Gráfico de barras evaluación Likert"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 2,
                  minHeight: 180,
                  px: 1,
                  pt: 1,
                }}
              >
                {niveles.map((n) => {
                  const color = toneColor(theme, n.colorTone);
                  const pct = Math.round((n.count / maxBar) * 100);
                  return (
                    <Tooltip
                      key={`bar-${n.codigo}`}
                      title={`${n.etiqueta}: ${n.count} documento(s)`}
                      arrow
                    >
                    <ButtonBase
                    onClick={() => openNivel(n.codigo)}
                    focusRipple
                    aria-label={`Ver documentos ${n.etiqueta}`}
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.75,
                      borderRadius: 1,
                      py: 0.5,
                    }}
                  >
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>
                          {n.count}
                        </Typography>
                        <Box
                          sx={{
                            width: '100%',
                            maxWidth: 72,
                            height: `${Math.max(pct, n.count > 0 ? 10 : 2)}%`,
                            minHeight: n.count > 0 ? 28 : 4,
                            maxHeight: 130,
                            bgcolor: alpha(color, 0.9),
                            borderRadius: 1,
                          }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}
                        >
                          {n.codigo === 'OPTIMO'
                            ? 'Óptimo'
                            : n.codigo === 'MODERADO'
                              ? 'Moderado'
                              : 'Crítico'}
                        </Typography>
                  </ButtonBase>
                    </Tooltip>
                  );
                })}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 3, mb: 1 }}>
                Proporción acumulada
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  height: 28,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {niveles.map((n) =>
                  n.count > 0 ? (
                    <Tooltip
                      key={`stack-${n.codigo}`}
                      title={`${n.etiqueta}: ${n.percent}%`}
                    >
                      <Box
                        sx={{
                          width: `${(n.count / total) * 100}%`,
                          bgcolor: toneColor(theme, n.colorTone),
                          minWidth: n.count > 0 ? 8 : 0,
                        }}
                      />
                    </Tooltip>
                  ) : null,
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
                Umbral de antigüedad: {data?.diasUmbral ?? 60} días sin actualización → Moderado.
                Crítico incluye inactivos, rechazados y revisiones con SLA vencido. Datos reales del
                ámbito visible del usuario.
              </Typography>
            </Grid>
          </Grid>

          <Box
            sx={{
              mt: 2.5,
              p: 1.75,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Resumen general de evaluación — registros analizados
            </Typography>
            <Box
              sx={{
                minWidth: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'text.primary',
                color: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              {total}
            </Box>
          </Box>
        </>
      ) : null}
    </Paper>
  );
}
