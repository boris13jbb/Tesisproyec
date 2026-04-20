import type { ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { MainLayout } from '../layouts/MainLayout';
import { CargosPage } from '../pages/catalogos/CargosPage';
import { DependenciasPage } from '../pages/catalogos/DependenciasPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';

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
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/catalogos/dependencias"
              element={<DependenciasPage />}
            />
            <Route path="/catalogos/cargos" element={<CargosPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SessionGate>
  );
}
