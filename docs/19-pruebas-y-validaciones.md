# Pruebas y validaciones — SGD-GADPR-LM

## Objetivo

Establecer **criterios repetibles** de calidad para frontend y backend antes de considerar cerrada cada iteración.

## Alcance

Comandos locales, tipos de prueba previstos y evidencias mínimas para tesis.

## Estado actual

- **Backend:** Jest (`npm run test`), e2e Supertest (`npm run test:e2e`), ESLint, Prettier.
- **Frontend:** ESLint (`npm run lint`), build `tsc -b && vite build` (`npm run build`). Sin tests de UI aún (opcional añadir Vitest en iteración futura).

**Arranque para prueba manual integral:** iniciar **MySQL (XAMPP)** → **`npm run start:dev`** en `backend/` (puerto **3000**) → **`npm run dev`** en `frontend/` (**5173**). Si solo corre Vite, el proxy mostrará `ECONNREFUSED` contra `:3000`.

## Decisiones técnicas

| Paquete | Comando (cuando exista) | Notas |
|---------|-------------------------|--------|
| Backend | `npm run format`, `npm run lint`, `npm run build`, `npm run test`, `npx tsc --noEmit` | Ejecutar desde `backend/` |
| Frontend | `npm run format`, `npm run lint`, `npm run build`, `npm run test`, `npx tsc --noEmit` | Ejecutar desde `frontend/` cuando exista |

## Estructura

- Unitarias: servicios NestJS, utilidades, hooks (frontend).
- Integración: API + Prisma (con BD de prueba o contenedor local si se acordara; por defecto XAMPP).
- E2E: flujos críticos (login, crear documento, subir archivo) — planificar en ETAPA 3+.

## Problemas detectados

- Sin pipeline CI en el repositorio; validación manual por ahora.

## Riesgos pendientes

- Regresiones si no se ejecutan scripts antes de merge.

## Mejoras futuras

GitLab/GitHub Actions con los mismos comandos.
