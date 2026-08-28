import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { apiClient } from '../../api/client';
import { userHasAdminAccess } from '../../auth/role-utils';
import { useAuth } from '../../auth/useAuth';
import { ActivoChip } from '../../components/ActivoChip';
import { EmptyState } from '../../components/EmptyState';
import { ListPanel } from '../../components/ListPanel';
import { listTableContainerSx } from '../../components/listSurfaces';
import { PageHeader } from '../../components/PageHeader';
import { cedulaErrorMessage, rucErrorMessage } from '../../utils/ecuador-id';
import {
  type PartyCatalogRow,
  partyDisplayLabel,
  partyIdentificacion,
} from '../../utils/party-label';

type ContraparteRow = PartyCatalogRow;

export function ContrapartesPage() {
  const { user } = useAuth();
  const isAdmin = userHasAdminAccess(user?.roles);
  const [rows, setRows] = useState<ContraparteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<'NATURAL' | 'JURIDICA'>('NATURAL');
  const [cedula, setCedula] = useState('');
  const [ruc, setRuc] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<ContraparteRow[]>('/contrapartes');
      setRows(data);
    } catch {
      setError('No se pudieron cargar las contrapartes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sincroniza catálogo al montar
    void load();
  }, [load]);

  const resetForm = () => {
    setTipo('NATURAL');
    setCedula('');
    setRuc('');
    setNombres('');
    setApellidos('');
    setRazonSocial('');
    setFieldError(null);
  };

  const onCreate = async () => {
    setFieldError(null);
    if (tipo === 'NATURAL') {
      const cedErr = cedulaErrorMessage(cedula);
      if (cedErr) {
        setFieldError(cedErr);
        return;
      }
      if (!nombres.trim() || !apellidos.trim()) {
        setFieldError('Nombres y apellidos son obligatorios');
        return;
      }
    } else {
      const rucErr = rucErrorMessage(ruc);
      if (rucErr) {
        setFieldError(rucErr);
        return;
      }
      if (!razonSocial.trim()) {
        setFieldError('Razón social obligatoria');
        return;
      }
    }
    try {
      await apiClient.post('/contrapartes', {
        tipo,
        cedula: tipo === 'NATURAL' ? cedula : undefined,
        ruc: tipo === 'JURIDICA' ? ruc : undefined,
        nombres: tipo === 'NATURAL' ? nombres : undefined,
        apellidos: tipo === 'NATURAL' ? apellidos : undefined,
        razonSocial: tipo === 'JURIDICA' ? razonSocial : undefined,
      });
      setOpen(false);
      resetForm();
      await load();
    } catch {
      setFieldError('No se pudo crear la contraparte (revise cédula/RUC duplicados).');
    }
  };

  return (
    <Box>
      <PageHeader
        title="Contrapartes"
        description="Personas naturales o jurídicas relacionadas con documentos (razón social / contraparte)."
        actions={
          isAdmin ? (
            <Button variant="contained" onClick={() => setOpen(true)}>
              Nueva contraparte
            </Button>
          ) : undefined
        }
      />
      {error ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      <ListPanel
        badge={<BadgeOutlinedIcon fontSize="small" />}
        title="Catálogo de contrapartes"
        subtitle="Validación de cédula/RUC ecuatoriano en backend."
        loading={loading}
      >
        <TableContainer sx={listTableContainerSx}>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Identificación</TableCell>
                <TableCell>Nombre / razón social</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EmptyState dense title="Sin contrapartes" description="Cree registros desde el botón superior." />
                  </TableCell>
                </TableRow>
              ) : null}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.tipo === 'JURIDICA' ? 'Jurídica' : 'Natural'}</TableCell>
                  <TableCell>{partyIdentificacion(r)}</TableCell>
                  <TableCell>{partyDisplayLabel(r)}</TableCell>
                  <TableCell>
                    <ActivoChip activo={r.activo !== false} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ListPanel>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nueva contraparte</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="tipo-contraparte">Tipo</InputLabel>
              <Select
                labelId="tipo-contraparte"
                label="Tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'NATURAL' | 'JURIDICA')}
              >
                <MenuItem value="NATURAL">Persona natural</MenuItem>
                <MenuItem value="JURIDICA">Persona jurídica</MenuItem>
              </Select>
            </FormControl>
            {tipo === 'NATURAL' ? (
              <>
                <TextField label="Cédula" value={cedula} onChange={(e) => setCedula(e.target.value)} />
                <TextField label="Nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} />
                <TextField label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
              </>
            ) : (
              <>
                <TextField label="RUC" value={ruc} onChange={(e) => setRuc(e.target.value)} />
                <TextField
                  label="Razón social"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                />
              </>
            )}
            {fieldError ? (
              <Typography variant="body2" color="error">
                {fieldError}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void onCreate()}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
