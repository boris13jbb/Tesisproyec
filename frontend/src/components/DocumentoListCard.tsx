import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { forwardRef } from 'react';
import {
  documentoEstadoChipColor,
  documentoEstadoTone,
  labelDocumentoEstado,
} from '../constants/documento-estado';

export type DocumentoListCardProps = {
  codigo: string;
  asunto: string;
  estado: string;
  fechaLabel?: string;
  tipoNombre: string;
  responsablePrimary: string;
  responsableTitle?: string;
  activo?: boolean;
  /** Kanban: columna estrecha, sin botón Ver (el clic abre el detalle). */
  compact?: boolean;
  onOpen: () => void;
};

/**
 * Tarjeta de expediente alineada al panel (actividad reciente):
 * icono por estado, metadatos reales y apertura al detalle.
 */
export const DocumentoListCard = forwardRef<HTMLDivElement, DocumentoListCardProps>(
  function DocumentoListCard(
    {
      codigo,
      asunto,
      estado,
      fechaLabel,
      tipoNombre,
      responsablePrimary,
      responsableTitle,
      activo = true,
      compact = false,
      onOpen,
    },
    ref,
  ) {
    const theme = useTheme();
    const toneKey = documentoEstadoTone(estado);
    const accent = theme.palette[toneKey].main;
    const metaTipo = tipoNombre;
    const metaResponsable = fechaLabel
      ? `${responsablePrimary} · ${fechaLabel}`
      : responsablePrimary;

    return (
      <Box
        ref={ref}
        role="listitem"
        tabIndex={0}
        aria-label={`Abrir documento ${codigo}`}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        sx={{
          display: 'flex',
          flexDirection: compact ? 'column' : { xs: 'column', sm: 'row' },
          alignItems: compact ? 'stretch' : { xs: 'stretch', sm: 'center' },
          gap: compact ? 1 : 1.5,
          px: 1.5,
          py: compact ? 1.25 : 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          cursor: 'pointer',
          transition: 'box-shadow 140ms ease, border-color 140ms ease, background-color 140ms ease',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'secondary.light',
            boxShadow: (t) =>
              t.palette.mode === 'dark'
                ? '0 8px 20px rgba(0, 0, 0, 0.35)'
                : '0 8px 20px rgba(15, 23, 42, 0.08)',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'secondary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: compact ? 36 : 40,
            height: compact ? 36 : 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(accent, 0.14),
            color: accent,
            flexShrink: 0,
          }}
        >
          <DescriptionOutlinedIcon sx={{ fontSize: compact ? 18 : 20 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.25 }}>
            <Typography
              variant="caption"
              sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, letterSpacing: 0.2 }}
            >
              {codigo}
            </Typography>
            {!compact ? (
              <Chip
                label={labelDocumentoEstado(estado)}
                size="small"
                color={documentoEstadoChipColor(estado)}
                sx={{ fontWeight: 800, height: 22 }}
              />
            ) : null}
            {!activo ? (
              <Chip label="Inactivo" size="small" variant="outlined" sx={{ height: 22 }} />
            ) : null}
          </Stack>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              ...(compact
                ? {
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }
                : undefined),
            }}
            noWrap={!compact}
            title={asunto}
          >
            {asunto}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            title={metaTipo}
          >
            {metaTipo}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            title={responsableTitle ?? responsablePrimary}
            sx={{ display: 'block' }}
          >
            {metaResponsable}
          </Typography>
        </Box>

        {!compact ? (
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'center' } }}
          >
            Ver
          </Button>
        ) : null}
      </Box>
    );
  },
);
