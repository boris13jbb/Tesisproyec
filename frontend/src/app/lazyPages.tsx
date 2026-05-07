import { lazy } from 'react';

/** Páginas cargadas bajo demanda para reducir el bundle inicial y silenciar el warning de tamaño Vite (~500 KB). */

export const SplashInicioPage = lazy(() =>
  import('../pages/SplashInicioPage').then((m) => ({ default: m.SplashInicioPage })),
);

export const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);

export const ForgotPasswordPage = lazy(() =>
  import('../pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);

export const ResetPasswordPage = lazy(() =>
  import('../pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);

export const ForbiddenPage = lazy(() =>
  import('../pages/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage })),
);

export const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

export const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);

export const PerfilUsuarioPage = lazy(() =>
  import('../pages/PerfilUsuarioPage').then((m) => ({ default: m.PerfilUsuarioPage })),
);

export const DocumentosPage = lazy(() =>
  import('../pages/documentos/DocumentosPage').then((m) => ({ default: m.DocumentosPage })),
);

export const DocumentoDetallePage = lazy(() =>
  import('../pages/documentos/DocumentoDetallePage').then((m) => ({
    default: m.DocumentoDetallePage,
  })),
);

export const FlujoTramitePage = lazy(() =>
  import('../pages/tramites/FlujoTramitePage').then((m) => ({ default: m.FlujoTramitePage })),
);

export const ClasificacionDocumentalPage = lazy(() =>
  import('../pages/clasificacion/ClasificacionDocumentalPage').then((m) => ({
    default: m.ClasificacionDocumentalPage,
  })),
);

export const NuevoDocumentoPage = lazy(() =>
  import('../pages/documentos/NuevoDocumentoPage').then((m) => ({ default: m.NuevoDocumentoPage })),
);

export const AuditoriaPage = lazy(() =>
  import('../pages/admin/AuditoriaPage').then((m) => ({ default: m.AuditoriaPage })),
);

export const RespaldosSeguridadPage = lazy(() =>
  import('../pages/admin/RespaldosSeguridadPage').then((m) => ({
    default: m.RespaldosSeguridadPage,
  })),
);

export const ReportesInstitucionalesPage = lazy(() =>
  import('../pages/admin/ReportesInstitucionalesPage').then((m) => ({
    default: m.ReportesInstitucionalesPage,
  })),
);

export const ConfiguracionSeguridadPage = lazy(() =>
  import('../pages/admin/ConfiguracionSeguridadPage').then((m) => ({
    default: m.ConfiguracionSeguridadPage,
  })),
);

export const UsuariosPage = lazy(() =>
  import('../pages/admin/UsuariosPage').then((m) => ({ default: m.UsuariosPage })),
);

export const DependenciasPage = lazy(() =>
  import('../pages/catalogos/DependenciasPage').then((m) => ({ default: m.DependenciasPage })),
);

export const CargosPage = lazy(() =>
  import('../pages/catalogos/CargosPage').then((m) => ({ default: m.CargosPage })),
);

export const TiposDocumentalesPage = lazy(() =>
  import('../pages/catalogos/TiposDocumentalesPage').then((m) => ({
    default: m.TiposDocumentalesPage,
  })),
);

export const SeriesPage = lazy(() =>
  import('../pages/catalogos/SeriesPage').then((m) => ({ default: m.SeriesPage })),
);

export const SubseriesPage = lazy(() =>
  import('../pages/catalogos/SubseriesPage').then((m) => ({ default: m.SubseriesPage })),
);
