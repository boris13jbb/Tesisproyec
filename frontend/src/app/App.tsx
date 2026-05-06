import type { ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { MainLayout } from '../layouts/MainLayout';
import { CargosPage } from '../pages/catalogos/CargosPage';
import { DependenciasPage } from '../pages/catalogos/DependenciasPage';
import { SeriesPage } from '../pages/catalogos/SeriesPage';
import { SubseriesPage } from '../pages/catalogos/SubseriesPage';
import { TiposDocumentalesPage } from '../pages/catalogos/TiposDocumentalesPage';
import { DocumentoDetallePage } from '../pages/documentos/DocumentoDetallePage';
import { DocumentosPage } from '../pages/documentos/DocumentosPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AuditoriaPage } from '../pages/admin/AuditoriaPage';
import { UsuariosPage } from '../pages/admin/UsuariosPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { RoleRoute } from '../routes/RoleRoute';

function SessionGate({ children }: { children: ReactNode }) {
  const { ready } = useAuth();

  if (!ready) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '40vh',
        }}
      >
        <CircularProgress aria-label="Cargando sesión" />
      </Box>
    );
  }

  return children;
}

export function App() {
  return (
    <SessionGate>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar" element={<ForgotPasswordPage />} />
        <Route path="/restablecer" element={<ResetPasswordPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/documentos" element={<DocumentosPage />} />
            <Route path="/documentos/:id" element={<DocumentoDetallePage />} />
            <Route element={<RoleRoute roles={['ADMIN']} />}>
              <Route path="/admin/auditoria" element={<AuditoriaPage />} />
              <Route path="/admin/usuarios" element={<UsuariosPage />} />
              <Route
                path="/catalogos/dependencias"
                element={<DependenciasPage />}
              />
              <Route path="/catalogos/cargos" element={<CargosPage />} />
              <Route
                path="/catalogos/tipos-documentales"
                element={<TiposDocumentalesPage />}
              />
              <Route path="/catalogos/series" element={<SeriesPage />} />
              <Route path="/catalogos/subseries" element={<SubseriesPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SessionGate>
  );
}
