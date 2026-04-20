# Riesgos pendientes — SGD-GADPR-LM

## Objetivo

Registrar **riesgos técnicos y operativos** con mitigación y seguimiento.

## Alcance

Desarrollo local, demo con ngrok, datos de prueba y extensión futura.

## Estado actual

Baseline **2026-04-19**.

---

## Registro

| ID | Descripción | Impacto | Probabilidad | Prioridad | Mitigación | Estado | Decisión / notas |
|----|-------------|---------|--------------|-----------|------------|--------|------------------|
| R-001 | Retraso por mezclar UI y backend sin orden de fases | Alto | Media | Alta | Seguir `00-roadmap-general.md`; no crear pantallas antes de ETAPA 1–2 acordadas | Abierto | — |
| R-002 | Documentación desincronizada del código | Medio | Media | Media | Actualizar docs tocados en cada PR/iteración | Abierto | — |
| R-003 | Secretos filtrados por error en Git | Alto | Baja | Alta | `.gitignore`; no commitear `.env`; revisar historial si hubo commit accidental | Abierto | — |
| R-004 | Exposición ngrok de API sin controles | Alto | Media | Media | Documentar sesión; CORS estricto; cerrar túnel; no usar en datos reales | Abierto | Ver `23-entorno-local-xampp-ngrok.md` |
| R-005 | Root MySQL sin contraseña solo en dev | Medio | Alta (en XAMPP default) | Media | Contraseña en MySQL para equipos compartidos; documentar en entorno | Abierto | Solo laboratorio aislado |

## Relación con problemas

Los problemas operativos concretos se enlazan desde `20-problemas-detectados.md`.
