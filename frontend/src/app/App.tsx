import { Suspense, type ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import {
  AuditoriaPage,
  CargosPage,
  ClasificacionDocumentalPage,
  ConfiguracionSeguridadPage,
  DashboardPage,
  DependenciasPage,
  DocumentoDetallePage,
  DocumentosPage,
  FlujoTramitePage,
  ForbiddenPage,
  ForgotPasswordPage,
  LoginPage,
  NotFoundPage,
  NuevoDocumentoPage,
  PerfilUsuarioPage,
  ReportesInstitucionalesPage,
  ResetPasswordPage,
  RespaldosSeguridadPage,
  SeriesPage,
  SplashInicioPage,
  SubseriesPage,
  TiposDocumentalesPage,
  UsuariosPage,
} from './lazyPages';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { RoleRoute } from '../routes/RoleRoute';
import { PostLoginPerfScheduler } from './PostLoginPerfScheduler';

function RouteLoadingFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '48vh',
        py: 4,
      }}
    >
      <CircularProgress aria-label="Cargando pantalla" />
    </Box>
  );
}

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
      <PostLoginPerfScheduler />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/inicio" element={<SplashInicioPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar" element={<ForgotPasswordPage />} />
          <Route path="/restablecer" element={<ResetPasswordPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/perfil" element={<PerfilUsuarioPage />} />
              <Route path="/documentos" element={<DocumentosPage />} />
              <Route path="/tramites" element={<FlujoTramitePage />} />
              <Route path="/clasificacion" element={<ClasificacionDocumentalPage />} />
              <Route path="/documentos/:id" element={<DocumentoDetallePage />} />
              <Route element={<RoleRoute roles={['ADMIN']} />}>
                <Route path="/documentos/nuevo" element={<NuevoDocumentoPage />} />
                <Route path="/admin/auditoria" element={<AuditoriaPage />} />
                <Route path="/admin/respaldos" element={<RespaldosSeguridadPage />} />
                <Route path="/admin/reportes" element={<ReportesInstitucionalesPage />} />
                <Route path="/admin/configuracion" element={<ConfiguracionSeguridadPage />} />
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
      </Suspense>
    </SessionGate>
  );
}
