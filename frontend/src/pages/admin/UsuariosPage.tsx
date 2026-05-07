import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  IconButton,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import {
  buildLocalAccessMatrixFallback,
  type AccessMatrixReferencia,
} from '../../constants/roles-access-matrix';
import { formatUltimoIngreso } from '../../utils/formatUltimoIngreso';

const INSTITUTIONAL_TEAL = '#2D8A99';
const INSTITUTIONAL_TEAL_SOFT = 'rgba(45, 138, 153, 0.14)';
const INSTITUTIONAL_NAVY = '#1A2B3C';

const paperCardSx = {
  borderRadius: 3,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
} as const;

type Dependencia = { id: string; codigo: string; nombre: string; activo: boolean };
type Cargo = { id: string; codigo: string; nombre: string; activo: boolean; dependenciaId: string | null };

type Usuario = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  dependenciaId: string | null;
  cargoId: string | null;
  activo: boolean;
  ultimoLoginAt?: string | null;
  roles: { codigo: string; nombre: string }[];
};

type InvitacionCorreoInfo = {
  solicitada: boolean;
  enviada: boolean;
  motivoOmitido?: string;
};

type UsuarioCreateResponse = Usuario & {
  createdAt?: string;
  updatedAt?: string;
  invitacionCorreo: InvitacionCorreoInfo;
};

const ROLE_OPTIONS = [
  'ADMIN',
  'USUARIO',
  'REVISOR',
  'AUDITOR',
  'CONSULTA',
] as const;

/** Encabezado corto matriz — códigos reales igual que en JWT/RBAC. */
const ROL_COLUMNA_ETIQUETA: Record<string, string> = {
  ADMIN: 'Administración',
  REVISOR: 'Revisor',
  USUARIO: 'Usuario',
  AUDITOR: 'Auditor',
  CONSULTA: 'Consulta',
};

function SectionLetterHeader({
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
        <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15, color: INSTITUTIONAL_NAVY }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
    </Stack>
  );
}

function displayUsuario(u: Usuario) {
  const n = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim();
  return n || u.email;
}

function formatRoles(u: Usuario) {
  if (!u.roles.length) return '—';
  return u.roles.map((r) => r.nombre || r.codigo).join(', ');
}

function MatrixCell({ allowed }: { allowed: boolean }) {
  return (
    <TableCell align="center" sx={{ px: 0.5 }}>
      {allowed ? (
        <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 22 }} aria-label="Permitido" />
      ) : (
        <CancelRoundedIcon sx={{ color: 'error.main', fontSize: 22 }} aria-label="No permitido" />
      )}
    </TableCell>
  );
}

export function UsuariosPage() {
  const [items, setItems] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matrizReferencia, setMatrizReferencia] = useState<AccessMatrixReferencia>(() =>
    buildLocalAccessMatrixFallback(),
  );

  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selected, setSelected] = useState<Usuario | null>(null);

  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [dependenciaId, setDependenciaId] = useState<string>('');
  const [cargoId, setCargoId] = useState<string>('');
  const [roles, setRoles] = useState<(typeof ROLE_OPTIONS)[number][]>(['USUARIO']);
  const [invitarPorCorreo, setInvitarPorCorreo] = useState(true);

  const [newPassword, setNewPassword] = useState('');

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 8;
  }, [email, password]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [usersRes, depsRes, cargosRes] = await Promise.all([
        apiClient.get<Usuario[]>('/usuarios'),
        apiClient.get<Dependencia[]>('/dependencias'),
        apiClient.get<Cargo[]>('/cargos'),
      ]);
      setItems(usersRes.data);
      setDependencias(depsRes.data.filter((d) => d.activo));
      setCargos(cargosRes.data.filter((c) => c.activo));

      try {
        const { data } = await apiClient.get<AccessMatrixReferencia>(
          '/usuarios/matriz-acceso-referencia',
        );
        setMatrizReferencia(data);
      } catch {
        setMatrizReferencia(buildLocalAccessMatrixFallback());
      }
    } catch {
      setError('No se pudo cargar el listado de usuarios.');
      setMatrizReferencia(buildLocalAccessMatrixFallback());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sincroniza tabla con API
    void load();
  }, [load]);

  const onCreate = async () => {
    setError(null);
    setInviteNotice(null);
    try {
      const res = await apiClient.post<UsuarioCreateResponse>('/usuarios', {
        email,
        password,
        nombres: nombres.trim() || undefined,
        apellidos: apellidos.trim() || undefined,
        dependenciaId: dependenciaId || undefined,
        cargoId: cargoId || undefined,
        roles,
        invitarPorCorreo,
      });

      const inv = res.data.invitacionCorreo;
      if (inv?.solicitada && inv.enviada) {
        setInviteNotice(
          'Usuario creado. Se envió un correo con el enlace para que defina su contraseña e inicie sesión.',
        );
      } else if (inv?.solicitada && !inv.enviada) {
        const m =
          inv.motivoOmitido === 'SMTP_NOT_CONFIGURED'
            ? 'Usuario creado, pero no hay SMTP configurado en el servidor: no se envió correo de invitación.'
            : 'Usuario creado, pero falló el envío del correo de invitación. Revise auditoría/SMTP.';
        setInviteNotice(m);
      }

      setOpen(false);
      setEmail('');
      setPassword('');
      setNombres('');
      setApellidos('');
      setDependenciaId('');
      setCargoId('');
      setRoles(['USUARIO']);
      setInvitarPorCorreo(true);
      await load();
    } catch {
      setError('No se pudo crear el usuario (correo duplicado o datos inválidos).');
    }
  };

  const openEdit = (u: Usuario) => {
    setSelected(u);
    setEmail(u.email);
    setNombres(u.nombres ?? '');
    setApellidos(u.apellidos ?? '');
    setDependenciaId(u.dependenciaId ?? '');
    setCargoId(u.cargoId ?? '');
    setRoles(
      (u.roles.map((r) => r.codigo).filter((c): c is (typeof ROLE_OPTIONS)[number] =>
        (ROLE_OPTIONS as readonly string[]).includes(c),
      ) as (typeof ROLE_OPTIONS)[number][]) || ['USUARIO'],
    );
    setEditOpen(true);
  };

  const onUpdate = async () => {
    if (!selected) return;
    setError(null);
    try {
      await apiClient.patch(`/usuarios/${selected.id}`, {
        email,
        nombres: nombres.trim() || null,
        apellidos: apellidos.trim() || null,
        dependenciaId: dependenciaId || null,
        cargoId: cargoId || null,
        roles,
      });
      setEditOpen(false);
      setSelected(null);
      await load();
    } catch {
      setError('No se pudo actualizar el usuario.');
    }
  };

  const onToggleActivo = async (u: Usuario) => {
    setError(null);
    try {
      await apiClient.patch(`/usuarios/${u.id}`, { activo: !u.activo });
      await load();
    } catch {
      setError('No se pudo actualizar el estado del usuario.');
    }
  };

  const openReset = (u: Usuario) => {
    setSelected(u);
    setNewPassword('');
    setResetOpen(true);
  };

  const onResetPassword = async () => {
    if (!selected) return;
    setError(null);
    try {
      await apiClient.post(`/usuarios/${selected.id}/reset-password`, {
        newPassword,
      });
      setResetOpen(false);
      setSelected(null);
    } catch {
      setError('No se pudo restablecer la contraseña (usuario inactivo o datos inválidos).');
    }
  };

  const cargosFiltrados = useMemo(() => {
    if (!dependenciaId) return cargos;
    return cargos.filter((c) => c.dependenciaId === dependenciaId || c.dependenciaId === null);
  }, [cargos, dependenciaId]);

  const departamentoPorId = useMemo(
    () => new Map(dependencias.map((d) => [d.id, d.nombre])),
    [dependencias],
  );
  const cargoPorId = useMemo(() => new Map(cargos.map((c) => [c.id, c.nombre])), [cargos]);

  const handleRolesChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value as string[];
    const next = value.filter((v): v is (typeof ROLE_OPTIONS)[number] =>
      (ROLE_OPTIONS as readonly string[]).includes(v),
    );
    setRoles(next.length ? next : ['USUARIO']);
  };

  return (
    <Container maxWidth="lg">
      <PageHeader
        title="Administración de identidades"
        description={
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Usuarios y roles · GADPR-LM · Sistema de Gestión Documental
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Usuarios, roles y permisos aplicados por principio de mínimo privilegio.
            </Typography>
          </Stack>
        }
        actions={
          <Tooltip title="Recargar usuarios y matriz de referencia">
            <IconButton
              aria-label="Actualizar administración de identidades"
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

      {inviteNotice && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setInviteNotice(null)}>
          {inviteNotice}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            id="tabla-usuarios-institucionales"
            elevation={0}
            sx={{
              ...paperCardSx,
              p: { xs: 2, sm: 2.25 },
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 420,
            }}
          >
            <SectionLetterHeader
              letter="U"
              title="Usuarios institucionales"
              subtitle="ISO 27001 A.5.16 · identidades y ciclo de vida de cuentas"
            />

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
              Listado desde <strong>GET /usuarios</strong>: nombres, correo, dependencia/cargo y roles del RBAC.
              «Último ingreso» refleja <strong>ultimoLoginAt</strong> (actualizado solo en cada login exitoso con
              credenciales, no solo por refresco silencioso de sesión).
            </Typography>

            {loading ? (
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                <CircularProgress aria-label="Cargando usuarios" />
              </Box>
            ) : (
              <TableContainer
                sx={{
                  mt: 2,
                  flex: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  maxHeight: 520,
                  overflow: 'auto',
                }}
              >
                <Table size="small" stickyHeader aria-label="Usuarios institucionales">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 800 }}>Usuario</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Rol</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Último ingreso</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState
                            dense
                            title="Sin usuarios"
                            description="Cree cuentas con el botón inferior."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((u) => (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{displayUsuario(u)}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {u.email}
                            </Typography>
                            {(() => {
                              const dn = u.dependenciaId
                                ? departamentoPorId.get(u.dependenciaId)
                                : null;
                              const cn = u.cargoId ? cargoPorId.get(u.cargoId) : null;
                              const org = [cn, dn].filter(Boolean).join(' · ');
                              return org ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {org}
                                </Typography>
                              ) : null;
                            })()}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 140 }}>
                            <Typography variant="body2">{formatRoles(u)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={u.activo ? 'Activo' : 'Suspendido'}
                              color={u.activo ? 'success' : 'error'}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 160 }}>
                            {(() => {
                              const fmt = formatUltimoIngreso(u.ultimoLoginAt ?? null);
                              return (
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {fmt.relativo}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                    {fmt.absoluto}
                                  </Typography>
                                </Stack>
                              );
                            })()}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="column" spacing={0.25} sx={{ alignItems: 'flex-end' }}>
                              <Button size="small" variant="text" onClick={() => openEdit(u)} sx={{ textTransform: 'none' }}>
                                Editar
                              </Button>
                              <Button size="small" variant="text" onClick={() => openReset(u)} sx={{ textTransform: 'none' }}>
                                Reset pass
                              </Button>
                              <Button size="small" variant="text" color="warning" onClick={() => void onToggleActivo(u)} sx={{ textTransform: 'none' }}>
                                {u.activo ? 'Desactivar' : 'Activar'}
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Button
              variant="contained"
              fullWidth
              sx={{
                mt: 2,
                textTransform: 'none',
                fontWeight: 800,
                bgcolor: INSTITUTIONAL_TEAL,
                '&:hover': { bgcolor: '#257a87' },
              }}
              onClick={() => {
                setInviteNotice(null);
                setOpen(true);
              }}
            >
              Crear usuario
            </Button>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ ...paperCardSx, p: { xs: 2, sm: 2.25 }, height: '100%' }}>
            <SectionLetterHeader
              letter="M"
              accent="blue"
              title="Matriz de permisos"
              subtitle="Control de acceso por rol · referencia servida por el servidor"
            />

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25, display: 'block', mb: 1 }}>
              Datos desde <strong>GET /usuarios/matriz-acceso-referencia</strong> (ADMIN). Solo lectura: las capacidades
              efectivas siguen definidas por el código NestJS (<code>@Roles</code>). Para cambiar el acceso de una persona
              use <strong>Editar</strong> en la tabla (asignación de roles RBAC).
            </Typography>

            <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 520 }} aria-label="Matriz de permisos por rol">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 800, minWidth: 200 }}>Módulo</TableCell>
                    {matrizReferencia.columnas.map((c) => (
                      <TableCell key={c} align="center" sx={{ fontWeight: 700, px: 0.5 }}>
                        <Tooltip title={`Código rol: ${c}`}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', lineHeight: 1.1 }}>
                              {ROL_COLUMNA_ETIQUETA[c] ?? c}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', fontSize: '0.65rem' }}
                            >
                              {c}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matrizReferencia.filas.map((row) => (
                    <TableRow key={row.modulo} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.modulo}
                        </Typography>
                        {row.ayuda ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {row.ayuda}
                          </Typography>
                        ) : null}
                      </TableCell>
                      {matrizReferencia.columnas.map((c) => (
                        <MatrixCell key={c} allowed={Boolean(row.porRol[c])} />
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
              {matrizReferencia.nota}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Generado:{' '}
              <time dateTime={matrizReferencia.generadoEn}>
                {new Date(matrizReferencia.generadoEn).toLocaleString('es-EC')}
              </time>
            </Typography>

            <Button
              fullWidth
              component="a"
              href="#tabla-usuarios-institucionales"
              variant="outlined"
              color="primary"
              sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Ir a usuarios para asignar roles
            </Button>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Crear usuario</DialogTitle>
        <DialogContent>
          <TextField
            label="Correo"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <TextField
            label="Contraseña temporal"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText={
              invitarPorCorreo
                ? 'Temporal hasta que el usuario defina contraseña con el enlace del correo. Mínimo 8 caracteres.'
                : 'Mínimo 8 caracteres; el usuario deberá usar esta contraseña para iniciar sesión.'
            }
            autoComplete="new-password"
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Checkbox
                checked={invitarPorCorreo}
                onChange={(_, checked) => setInvitarPorCorreo(checked)}
              />
            }
            label="Enviar al correo un enlace para que defina su contraseña (recomendado)"
          />
          <TextField
            label="Nombres"
            fullWidth
            margin="normal"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
          />
          <TextField
            label="Apellidos"
            fullWidth
            margin="normal"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="dep-label">Dependencia</InputLabel>
            <Select
              labelId="dep-label"
              value={dependenciaId}
              label="Dependencia"
              onChange={(e) => setDependenciaId(e.target.value)}
            >
              <MenuItem value="">
                <em>—</em>
              </MenuItem>
              {dependencias.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.codigo} — {d.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="cargo-label">Cargo</InputLabel>
            <Select
              labelId="cargo-label"
              value={cargoId}
              label="Cargo"
              onChange={(e) => setCargoId(e.target.value)}
            >
              <MenuItem value="">
                <em>—</em>
              </MenuItem>
              {cargosFiltrados.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="roles-label">Roles</InputLabel>
            <Select
              labelId="roles-label"
              multiple
              value={roles}
              label="Roles"
              onChange={handleRolesChange}
            >
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} variant="text">
            Cancelar
          </Button>
          <Button onClick={() => void onCreate()} variant="contained" disabled={!canSubmit}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Editar usuario</DialogTitle>
        <DialogContent>
          <TextField
            label="Correo"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <TextField
            label="Nombres"
            fullWidth
            margin="normal"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
          />
          <TextField
            label="Apellidos"
            fullWidth
            margin="normal"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="dep2-label">Dependencia</InputLabel>
            <Select
              labelId="dep2-label"
              value={dependenciaId}
              label="Dependencia"
              onChange={(e) => setDependenciaId(e.target.value)}
            >
              <MenuItem value="">
                <em>—</em>
              </MenuItem>
              {dependencias.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.codigo} — {d.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="cargo2-label">Cargo</InputLabel>
            <Select
              labelId="cargo2-label"
              value={cargoId}
              label="Cargo"
              onChange={(e) => setCargoId(e.target.value)}
            >
              <MenuItem value="">
                <em>—</em>
              </MenuItem>
              {cargosFiltrados.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="roles2-label">Roles</InputLabel>
            <Select
              labelId="roles2-label"
              multiple
              value={roles}
              label="Roles"
              onChange={handleRolesChange}
            >
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditOpen(false);
              setSelected(null);
            }}
            variant="text"
          >
            Cancelar
          </Button>
          <Button onClick={() => void onUpdate()} variant="contained" disabled={!selected}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Restablecer contraseña</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Se invalidarán las sesiones activas del usuario.
          </Typography>
          <TextField
            label="Nueva contraseña"
            type="password"
            fullWidth
            margin="normal"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Mínimo 8 caracteres."
            autoComplete="new-password"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setResetOpen(false);
              setSelected(null);
            }}
            variant="text"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void onResetPassword()}
            variant="contained"
            disabled={!selected || newPassword.length < 8}
          >
            Restablecer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
