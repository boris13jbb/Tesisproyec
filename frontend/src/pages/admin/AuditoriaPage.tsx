import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  result: string;
  actorEmail: string | null;
  actorUserId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  ip: string | null;
  metaJson: string | null;
};

type Paged = { page: number; pageSize: number; total: number; items: AuditRow[] };

export function AuditoriaPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const buildFilterParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (action.trim()) p.action = action.trim();
    if (actorEmail.trim()) p.actorEmail = actorEmail.trim();
    if (from) p.from = new Date(`${from}T00:00:00.000Z`).toISOString();
    if (to) p.to = new Date(`${to}T23:59:59.999Z`).toISOString();
    return p;
  }, [action, actorEmail, from, to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const { data } = await apiClient.get<Paged>('/auditoria', {
          params: {
            page,
            pageSize,
            ...buildFilterParams,
          },
        });
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          if (isAxiosError(err)) {
            setError('No se pudo cargar la auditoría. Verifique sesión ADMIN.');
          } else {
            setError('No se pudo cargar la auditoría.');
          }
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, buildFilterParams]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onExportXlsx = async () => {
    setError(null);
    try {
      const res = await apiClient.get('/reportes/auditoria.xlsx', {
        params: buildFilterParams,
        responseType: 'blob',
      });
      downloadBlob(
        new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch {
      setError('No se pudo exportar Excel.');
    }
  };

  const onExportPdf = async () => {
    setError(null);
    try {
      const res = await apiClient.get('/reportes/auditoria.pdf', {
        params: buildFilterParams,
        responseType: 'blob',
      });
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), `auditoria_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      setError('No se pudo exportar PDF.');
    }
  };

  return (
    <Container maxWidth="lg">
      <PageHeader
        title="Auditoría del sistema"
        description={
          <>
            Bitácora transversal (<code>audit_logs</code>). Solo rol <strong>ADMIN</strong>. Las exportaciones
            quedan registradas (<code>REPORT_EXPORTED</code>).
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          Filtros y exportación
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            label="Acción contiene"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 200 }}
          />
          <TextField
            size="small"
            label="Email actor contiene"
            value={actorEmail}
            onChange={(e) => {
              setActorEmail(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 220 }}
          />
          <TextField
            size="small"
            type="date"
            label="Desde"
            slotProps={{ inputLabel: { shrink: true } }}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <TextField
            size="small"
            type="date"
            label="Hasta"
            slotProps={{ inputLabel: { shrink: true } }}
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
          <Button variant="outlined" onClick={() => void onExportXlsx()}>
            Exportar Excel
          </Button>
          <Button variant="outlined" onClick={() => void onExportPdf()}>
            Exportar PDF
          </Button>
        </Box>
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Total: <strong>{total}</strong> — Página <strong>{page}</strong>
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha (UTC)</TableCell>
              <TableCell>Acción</TableCell>
              <TableCell>Res.</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>IP</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Recurso</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6}>Cargando…</TableCell>
              </TableRow>
            )}
            {!loading &&
              items.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{new Date(r.createdAt).toISOString().replace('T', ' ').slice(0, 19)}</TableCell>
                  <TableCell>{r.action}</TableCell>
                  <TableCell>{r.result}</TableCell>
                  <TableCell>{r.actorEmail ?? '—'}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{r.ip ?? '—'}</TableCell>
                  <TableCell
                    sx={{
                      display: { xs: 'none', sm: 'table-cell' },
                      maxWidth: 280,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={`${r.resourceType ?? ''} ${r.resourceId ?? ''}`}
                  >
                    {(r.resourceType ?? '—') + ' / ' + (r.resourceId ?? '—')}
                  </TableCell>
                </TableRow>
              ))}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>Sin registros con los filtros actuales.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Anterior
        </Button>
        <Button
          variant="outlined"
          disabled={page * pageSize >= total || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </Box>
    </Container>
  );
}
