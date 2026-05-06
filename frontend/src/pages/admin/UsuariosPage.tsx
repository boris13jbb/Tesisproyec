import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';

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

export function UsuariosPage() {
  const [items, setItems] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const load = async () => {
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
    } catch {
      setError('No se pudo cargar el listado de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const [usersRes, depsRes, cargosRes] = await Promise.all([
          apiClient.get<Usuario[]>('/usuarios'),
          apiClient.get<Dependencia[]>('/dependencias'),
          apiClient.get<Cargo[]>('/cargos'),
        ]);
        if (cancelled) return;
        setItems(usersRes.data);
        setDependencias(depsRes.data.filter((d) => d.activo));
        setCargos(cargosRes.data.filter((c) => c.activo));
      } catch {
        if (!cancelled) {
          setError('No se pudo cargar el listado de usuarios.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleRolesChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value as string[];
    const next = value.filter((v): v is (typeof ROLE_OPTIONS)[number] =>
      (ROLE_OPTIONS as readonly string[]).includes(v),
    );
    setRoles(next.length ? next : ['USUARIO']);
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" component="h1">
            Usuarios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administración de cuentas (solo ADMIN).
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            setInviteNotice(null);
            setOpen(true);
          }}
        >
          Crear usuario
        </Button>
      </Box>

      {inviteNotice && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setInviteNotice(null)}>
          {inviteNotice}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Cargando…
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {items.map((u) => (
            <Box
              key={u.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                px: 2,
                py: 1.5,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ wordBreak: 'break-word' }}>
                  {u.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {`${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim() || '—'} · Roles:{' '}
                  {u.roles.map((r) => r.codigo).join(', ') || '—'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color={u.activo ? 'success.main' : 'text.secondary'}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </Typography>
                <Button size="small" variant="text" onClick={() => openEdit(u)}>
                  Editar
                </Button>
                <Button size="small" variant="text" onClick={() => openReset(u)}>
                  Reset pass
                </Button>
                <Button size="small" variant="outlined" onClick={() => void onToggleActivo(u)}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

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
          <Button onClick={onCreate} variant="contained" disabled={!canSubmit}>
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

