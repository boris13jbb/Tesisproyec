import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import {
  groupPermissionsByModule,
  permissionLabel,
  PERMISSION_MODULE_ORDER,
} from '../../constants/permission-display';
import {
  buildEffectivePermissions,
  formatPermissionOrigin,
  type EffectivePermissionEntry,
} from '../../utils/effective-permissions';

type EffectivePermissionsPanelProps = {
  rolePermissionMap: Map<string, string[]>;
  directPermissionCodes: string[];
  defaultExpanded?: boolean;
};

function PermissionStatusRow({ entry }: { entry: EffectivePermissionEntry }) {
  return (
    <Box sx={{ py: 0.75 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {entry.allowed ? (
          <CheckCircleRoundedIcon color="success" sx={{ fontSize: 18 }} />
        ) : (
          <RemoveIcon color="disabled" sx={{ fontSize: 18 }} />
        )}
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {permissionLabel(entry.codigo)}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3.5 }}>
        {formatPermissionOrigin(entry.origins)}
      </Typography>
    </Box>
  );
}

export function EffectivePermissionsPanel({
  rolePermissionMap,
  directPermissionCodes,
  defaultExpanded = false,
}: EffectivePermissionsPanelProps) {
  const effective = useMemo(
    () =>
      buildEffectivePermissions({
        rolePermissionMap,
        directPermissionCodes,
      }),
    [rolePermissionMap, directPermissionCodes],
  );

  const grouped = useMemo(
    () => groupPermissionsByModule(effective.map((e) => e.codigo)),
    [effective],
  );

  const effectiveSet = useMemo(() => new Set(effective.map((e) => e.codigo)), [effective]);
  const additionalCount = directPermissionCodes.filter((c) => effectiveSet.has(c)).length;
  const activeRoles = rolePermissionMap.size;

  return (
    <Box>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.5 }}>
        <Chip size="small" label={`Roles activos: ${activeRoles}`} sx={{ fontWeight: 700 }} />
        <Chip
          size="small"
          label={`Permisos efectivos: ${effective.length}`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
        <Chip
          size="small"
          label={`Permisos adicionales: ${additionalCount}`}
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      <Accordion
        defaultExpanded={defaultExpanded}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Ver permisos efectivos
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {PERMISSION_MODULE_ORDER.map((mod) => {
            const codes = grouped.get(mod) ?? [];
            const entries = codes
              .map((c) => effective.find((e) => e.codigo === c))
              .filter((e): e is EffectivePermissionEntry => Boolean(e));
            return (
              <Box key={mod} sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>
                  {mod.toUpperCase()}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                {entries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    —
                  </Typography>
                ) : (
                  entries.map((entry) => <PermissionStatusRow key={entry.codigo} entry={entry} />)
                )}
              </Box>
            );
          })}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
