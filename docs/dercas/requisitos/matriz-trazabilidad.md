# Matriz de trazabilidad

Una fila por requisito: `CA` enlaza la condición verificable; `Código` identifica la implementación o fuente de la brecha; `Prueba existente` indica artefacto versionado, **no ejecución en esta etapa**. `—` significa que no se identificó prueba directa o diagrama específico. Los alias de diagramas se resuelven al final.

| Requisito | CA | Código o documento | Prueba existente | Diagrama |
| --- | --- | --- | --- | --- |
| RF-001 | CA-001 | `src/modules/auth/session.ts` | `src/modules/auth/authorization.test.ts`, `tests/e2e/core-registry.spec.ts` | ARQ-L, CU-G |
| RF-002 | CA-002 | `docs/requirements.md` §3; sin ruta propia | — | — |
| RF-003 | CA-003 | `docs/requirements.md` §4; modelo `User` sin CRUD | — | ER-O |
| RF-004 | CA-004 | `src/modules/health-centers/services/health-center-service.ts` | `tests/integration/critical-audit-mutations.test.ts` | ER-O, CU-G |
| RF-005 | CA-005 | `src/modules/communities/services/community-service.ts` | `src/modules/communities/services/community-service.test.ts` | ER-O, CU-G |
| RF-006 | CA-006 | `src/modules/guardians/services/guardian-service.ts` | `tests/e2e/core-registry.spec.ts` | ER-O, CU-N |
| RF-007 | CA-007 | `src/modules/children/services/child-service.ts` | `tests/e2e/core-registry.spec.ts` | ER-O, CU-N, ACT-N |
| RF-008 | CA-008 | `src/modules/children/services/child-service.ts` | `src/modules/children/services/child-guardian-rules.test.ts` | ER-O, CU-N, ACT-N |
| RF-009 | CA-009 | `src/modules/growth/services/growth-record-service.ts` | `tests/e2e/growth.spec.ts`, `tests/integration/critical-persistence.test.ts` | ER-C, CU-C, SEQ-C |
| RF-010 | CA-010 | `src/modules/growth/services/growth-assessment-service.ts` | `src/modules/growth/services/growth-assessment-engine.test.ts`, `src/modules/growth/who/who-standard.test.ts` | ER-C, ACT-C |
| RF-011 | CA-011 | `src/modules/growth/services/follow-up-suggestion.ts` | `src/modules/growth/services/follow-up-suggestion.test.ts` | ER-C, ACT-C |
| RF-012 | CA-012 | `src/modules/vaccination/services/vaccine-service.ts` | `src/modules/vaccination/schemas/vaccine-schema.test.ts` | ER-V, CU-V |
| RF-013 | CA-013 | `src/modules/vaccination/schedule/`, `prisma/data/vaccination/gt-mspas-2026-01.json` | `src/modules/vaccination/schedule/guatemala-schedule.test.ts` | ER-V, CU-V |
| RF-014 | CA-014 | `src/modules/vaccination/services/vaccination-service.ts` | `src/modules/vaccination/services/vaccination-registration.test.ts`, `tests/e2e/vaccination.spec.ts` | ER-V, ACT-V, SEQ-V |
| RF-015 | CA-015 | `src/modules/vaccination/services/vaccination-status.ts` | `src/modules/vaccination/services/vaccination-status.test.ts` | CU-V, SEQ-V |
| RF-016 | CA-016 | `src/modules/alerts/services/overdue-alert-job.ts` | `tests/integration/scheduled-overdue-alerts.test.ts`, `src/modules/alerts/services/growth-alert-service.test.ts` | ER-A, ACT-A |
| RF-017 | CA-017 | `src/modules/alerts/services/alert-service.ts` | `src/modules/alerts/services/alert-lifecycle.test.ts` | CU-A, EST-A |
| RF-018 | CA-018 | `src/modules/notifications/services/notification-service.ts` | `src/modules/notifications/services/notification-dispatcher.test.ts`, `tests/integration/telegram-linking.test.ts` | ER-A, SEQ-N, EST-N |
| RF-019 | CA-019 | `src/modules/campaigns/services/campaign-service.ts` | `tests/integration/campaign-delivery.test.ts`, `tests/e2e/campaign.spec.ts` | CU-R, ACT-P, EST-P |
| RF-020 | CA-020 | `src/modules/qr/services/qr-service.ts` | `src/modules/qr/services/qr-security.test.ts`, `tests/e2e/qr-security.spec.ts` | ER-Q, CU-Q, SEQ-Q |
| RF-021 | CA-021 | `src/modules/dashboard/services/dashboard-service.ts` | `src/modules/dashboard/services/dashboard-service.test.ts` | CU-G, ARQ-L |
| RF-022 | CA-022 | `src/modules/analytics/services/analytics-service.ts` | `tests/integration/analytics-read-model.test.ts`, `tests/e2e/analytics.spec.ts` | CU-R, ARQ-L |
| RF-023 | CA-023 | `src/modules/reports/services/report-service.ts` | `src/modules/reports/services/report-export.test.ts`, `tests/e2e/reports.spec.ts` | CU-R, ARQ-L |
| RF-024 | CA-024 | `src/modules/audit/services/audit-service.ts` | `tests/integration/critical-audit-mutations.test.ts` | ER-Q, ARQ-L |
| RF-025 | CA-025 | `src/app/api/v1/reports/`, `docs/api/openapi.yaml` | `src/modules/reports/services/report-authorization.test.ts` | ARQ-L, CU-R |
| RF-026 | CA-026 | `src/app/manifest.ts`, `public/sw.js` | `src/lib/pwa/service-worker.test.ts`, `tests/e2e/pwa.spec.ts` | ARQ-D |
| RNF-001 | CA-027 | `src/modules/auth/authorization.ts` | `src/modules/auth/authorization.test.ts`, `src/modules/children/services/child-access.test.ts` | ARQ-L, CU-G |
| RNF-002 | CA-028 | `src/lib/errors/application-error.ts`, `src/modules/children/schemas/child-schema.ts` | `src/lib/errors/application-error.test.ts`, `src/modules/children/schemas/child-schema.test.ts` | ARQ-L |
| RNF-003 | CA-029 | `src/lib/env/server-env.ts`, `.gitignore` | — (requiere revisión del diff/entorno) | ARQ-D |
| RNF-004 | CA-030 | `docs/requirements.md` §28, `.github/workflows/staging.yml` | — (requiere comprobación TLS autorizada) | ARQ-D |
| RNF-005 | CA-031 | `src/modules/vaccination/services/vaccination-service.ts`; brecha en `src/modules/campaigns/services/campaign-service.ts` | `src/modules/vaccination/services/bulk-vaccination-status.test.ts` | ARQ-L, CU-R |
| RNF-006 | CA-032 | `src/components/layout/app-shell.tsx` | `tests/e2e/core-registry.spec.ts`, `tests/e2e/vaccination.spec.ts` | CU-G |
| RNF-007 | CA-033 | `src/app/manifest.ts`, `src/app/apple-icon.png` | `tests/e2e/pwa.spec.ts` (no prueba instalación física) | ARQ-D |
| RNF-008 | CA-034 | `public/sw.js`, `public/offline.html` | `src/lib/pwa/service-worker.test.ts` | ARQ-D |
| RNF-009 | CA-035 | `tsconfig.json`, `src/modules/` | `npm run typecheck` (gate, no ejecutado aquí) | ARQ-L |
| RNF-010 | CA-036 | `.github/workflows/ci.yml`, `tests/support/test-environment.ts` | `src/lib/testing/test-database-identity.test.ts` | ARQ-D |
| RNF-011 | CA-037 | `src/modules/qr/services/digital-card.ts`; privilegios DB por verificar | `src/modules/qr/services/digital-card.test.ts` (solo proyección) | ER-Q, SEQ-Q |
| RN-001 | CA-038 | `src/modules/auth/authorization.ts`, `src/modules/children/services/child-service.ts` | `src/modules/children/services/child-access.test.ts` | CU-N, ER-O |
| RN-002 | CA-039 | `prisma/schema.prisma`, `src/modules/children/services/child-service.ts` | `src/modules/children/services/child-guardian-rules.test.ts` | ER-O, ACT-N |
| RN-003 | CA-040 | `src/lib/date/business-date.ts`, `src/modules/growth/utils/exact-age.ts` | `src/lib/date/business-date.test.ts`, `src/modules/growth/utils/exact-age.test.ts` | ACT-C |
| RN-004 | CA-041 | `src/modules/growth/services/growth-assessment-service.ts` | `src/modules/growth/services/growth-assessment-engine.test.ts` | ER-C, SEQ-C |
| RN-005 | CA-042 | `src/modules/growth/services/follow-up-suggestion.ts`, `src/modules/alerts/services/missed-follow-up-service.ts` | `src/modules/growth/services/follow-up-suggestion.test.ts`, `src/modules/alerts/services/missed-follow-up-service.test.ts` | ER-C, ACT-C |
| RN-006 | CA-043 | `src/modules/vaccination/services/vaccination-status.ts` | `src/modules/vaccination/services/vaccination-status.test.ts`, `src/modules/alerts/services/vaccination-alert-service.test.ts` | ER-V, SEQ-V |
| RN-007 | CA-044 | `src/modules/vaccination/services/vaccination-registration.ts` | `src/modules/vaccination/services/vaccination-registration.test.ts` | ER-V, ACT-V |
| RN-008 | CA-045 | `src/modules/growth/services/growth-alert-rule.ts`, `src/modules/alerts/services/vaccination-alert-rule.ts` | `src/modules/growth/services/growth-alert-rule.test.ts`, `src/modules/alerts/services/vaccination-alert-rule.test.ts` | ACT-A, CU-A |
| RN-009 | CA-046 | `src/modules/alerts/services/alert-lifecycle.ts` | `src/modules/alerts/services/alert-lifecycle.test.ts` | EST-A |
| RN-010 | CA-047 | `src/modules/notifications/services/notification-service.ts` | `src/modules/notifications/services/notification-recipient-policy.test.ts`, `src/modules/notifications/services/notification-dispatcher.test.ts` | SEQ-N, EST-N |
| RN-011 | CA-048 | `src/modules/qr/services/qr-service.ts` | `src/modules/qr/services/qr-security.test.ts` | ER-Q, SEQ-Q |
| RN-012 | CA-049 | `src/modules/reports/services/report-service.ts` | `tests/integration/vaccination-coverage.test.ts` | ER-V, CU-R |

## Alias de diagramas

| Alias | Archivo existente |
| --- | --- |
| ARQ-L / ARQ-D | `docs/dercas/diagramas/arquitectura/arquitectura-logica.puml` / `docs/dercas/diagramas/arquitectura/arquitectura-despliegue.puml` |
| ER-O / ER-C / ER-V / ER-A / ER-Q | `docs/dercas/diagramas/entidad-relacion/organizacion-y-personas.mmd` / `crecimiento-y-seguimiento.mmd` / `vacunacion.mmd` / `alertas-comunicaciones.mmd` / `qr-y-auditoria.mmd` (misma carpeta) |
| CU-G / CU-N / CU-C / CU-V | `docs/dercas/diagramas/casos-de-uso/general.puml` / `ninos-y-tutores.puml` / `crecimiento.puml` / `vacunacion.puml` (misma carpeta) |
| CU-A / CU-R / CU-Q | `docs/dercas/diagramas/casos-de-uso/alertas-y-notificaciones.puml` / `campanas-y-reportes.puml` / `carne-digital-qr.puml` (misma carpeta) |
| ACT-N / ACT-C / ACT-V / ACT-A / ACT-P | `docs/dercas/diagramas/comportamiento/actividades/registro-nino-tutor.puml` / `crecimiento-oms.puml` / `registro-vacunacion.puml` / `alertas-notificaciones.puml` / `campanas.puml` (misma carpeta) |
| SEQ-C / SEQ-V / SEQ-Q / SEQ-N | `docs/dercas/diagramas/comportamiento/secuencia/registro-medicion.puml` / `registro-vacunacion.puml` / `carne-qr.puml` / `entrega-notificaciones.puml` (misma carpeta) |
| EST-A / EST-P / EST-N | `docs/dercas/diagramas/comportamiento/estados/alerta.puml` / `campana.puml` / `notificacion.puml` (misma carpeta) |

## Brechas rastreables

- `RF-002` y `RF-003`: documentados sin implementación ni prueba directa. No se dibujan como casos de uso implementados.
- `RF-024`: las mutaciones auditadas existen, pero no se identifica cobertura completa de eventos de usuarios/auth del requisito original.
- `RNF-003`, `RNF-004`, `RNF-007` y parte de `RNF-011` requieren evidencia de entorno/revisión específica; un test de código no prueba TLS, instalación iOS ni privilegios reales de BD.
- `RNF-005`: carga masiva/paginada existe para evaluaciones poblacionales; la segmentación vacunal de campaña aún tiene bucle por niño, por lo que no se declara cierre general de N+1.
- Clasificación clínica OMS y campañas `SCHEDULED` aparecen en esquema/documentación pero no como flujos aprobados e implementados. No se convirtieron en criterios de aceptación cumplidos.
