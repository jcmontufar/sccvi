# SCCVI — inventario técnico para DERCAS

**Corte:** `main` en `b9df02a`, 3 de octubre de 2026. **Método:** lectura del código, esquema, configuraciones y documentación versionados. **Hecho comprobado** significa presente en esos archivos; no implica que se haya ejecutado ni verificado en un entorno remoto. **Pendiente de verificar** identifica aquello que requiere evidencia adicional o reconciliación.

## 1. Sistema, arquitectura y tecnologías

**Hechos comprobados.** SCCVI es una aplicación web para seguimiento de crecimiento y vacunación infantil en centros de salud municipales. El repositorio implementa un monolito modular Next.js App Router: páginas/componentes → Server Actions o Route Handlers → servicios y reglas de dominio → Prisma → PostgreSQL. La sesión proviene de Supabase Auth; el perfil y el rol de aplicación viven en `User`. El acceso a tablas de aplicación se realiza desde el servidor con Prisma. El frontend usa React, TypeScript estricto, Tailwind CSS, componentes shadcn/ui y Recharts; los formularios actuales emplean `useActionState` y Zod. Los informes PDF/Excel usan `pdf-lib` y `exceljs`. npm administra dependencias; Vitest y Playwright cubren pruebas. Fuentes: `AGENTS.md`, `docs/architecture.md`, `package.json`, `tsconfig.json`, `src/app/layout.tsx`, `src/modules/auth/session.ts`, `src/lib/prisma.ts`, `src/app/api/v1/reports/pdf/route.ts`, `src/app/api/v1/reports/excel/route.ts`.

La separación física es `src/app/` (rutas), `src/components/` (componentes compartidos), `src/modules/` (acciones, esquemas, servicios y componentes por dominio), `src/lib/` (infraestructura transversal), `prisma/` (esquema/migraciones) y `tests/`. La clasificación presentación/aplicación/dominio/persistencia es conceptual; no hay cuatro paquetes independientes. Fuentes: `docs/architecture.md`, `src/app/`, `src/modules/`, `src/lib/`, `prisma/schema.prisma`.

## 2. Actores y autorización

**Hechos comprobados.** El enum `UserRole` contiene `ADMIN`, `HEALTH_STAFF`, `CENTER_MANAGER` y `GUARDIAN`. `resolveAuthenticatedProfile` valida las claims de Supabase y resuelve un `User` activo; el layout protegido redirige a quien no está autenticado. `authorize` aplica rol y, para personal no administrador, `healthCenterId`; para `GUARDIAN` exige una relación cargada del recurso. Las comprobaciones de relación niño–tutor y centro ocurren en servicios, no solo en la navegación. Fuentes: `prisma/schema.prisma`, `src/modules/auth/session.ts`, `src/modules/auth/authorization.ts`, `src/app/app/layout.tsx`, `src/modules/children/services/child-service.ts`.

| Actor | Capacidades implementadas representativas | Límites relevantes |
| --- | --- | --- |
| `ADMIN` | Administración del catálogo de vacunas; operaciones globales de centros, comunidades, niños, tutores, crecimiento, vacunación, alertas, campañas, QR y reportes | Cada servicio sigue validando entradas y recursos. |
| `HEALTH_STAFF` | Alta/edición de tutores y niños, asociación, mediciones, vacunas aplicadas, revisión de alertas y QR | Operaciones del centro asignado; no administra catálogo de vacunas ni campañas. |
| `CENTER_MANAGER` | Gestión de comunidades y edición de su centro, lectura operativa, revisión de alertas, campañas y reportes | Centro asignado; lectura de niños/tutores/crecimiento/vacunación, sin registro clínico. |
| `GUARDIAN` | Lectura de niños vinculados y su crecimiento/vacunación/alertas, inicio personalizado | Requiere asociación explícita `ChildGuardian` y `Guardian.userId`; no acceso a reportes operativos. |

La tabla es un resumen para casos de uso; la matriz exacta de acciones está en `src/modules/auth/authorization.ts`. La navegación visible (`src/modules/auth/navigation.ts`) no sustituye la autorización del servidor. **Pendiente de verificar:** el requisito amplio de administración de usuarios aparece en `docs/requirements.md`, pero no hay módulo/páginas CRUD de usuarios en `src/modules/` o `src/app/app/`; no dibujar ese caso como implementado.

## 3. Módulos y funcionalidades comprobadas

| Área | Funcionalidad visible o servicio | Fuente principal |
| --- | --- | --- |
| Autenticación | Inicio/cierre de sesión, sesión Supabase y perfil activo | `src/modules/auth/actions.ts`, `src/modules/auth/session.ts` |
| Organización | Consulta/actualización de centros; CRUD con desactivación de comunidades | `src/modules/health-centers/services/health-center-service.ts`, `src/modules/communities/services/community-service.ts` |
| Tutores y niños | Alta, edición, desactivación; asociación niño–tutor y preferencia de notificación | `src/modules/guardians/services/guardian-service.ts`, `src/modules/children/services/child-service.ts` |
| Crecimiento | Medición histórica, corrección auditada, evaluación OMS, seguimiento programado | `src/modules/growth/services/growth-record-service.ts`, `src/modules/growth/services/growth-assessment-service.ts`, `src/modules/growth/services/follow-up-suggestion.ts` |
| Vacunación | Catálogo, versión/dosis de esquema, estados derivados y registro factual | `src/modules/vaccination/services/vaccine-service.ts`, `src/modules/vaccination/services/vaccination-service.ts`, `src/modules/vaccination/services/vaccination-status.ts` |
| Alertas | Percentil peso/edad, seguimiento vencido, dosis atrasadas; revisión/resolución | `src/modules/alerts/services/growth-alert-service.ts`, `src/modules/alerts/services/missed-follow-up-service.ts`, `src/modules/alerts/services/vaccination-alert-service.ts`, `src/modules/alerts/services/alert-service.ts` |
| Notificaciones | Canal elegido EMAIL/TELEGRAM, cola, claim y dispatcher; envío individual de alerta | `src/modules/notifications/services/notification-service.ts`, `src/modules/notifications/services/provider-registry.ts`, `src/modules/notifications/services/manual-alert-notification-service.ts` |
| Campañas | Borrador, segmentación, destinatarios y envío | `src/modules/campaigns/services/campaign-service.ts`, `src/modules/campaigns/services/campaign-segmentation.ts` |
| QR | Credencial opaca, PIN opcional, revocación, tarjeta pública protegida | `src/modules/qr/services/qr-service.ts`, `src/modules/qr/services/qr-crypto.ts`, `src/app/tarjeta/[token]/page.tsx` |
| Visualización | Dashboard, nueve tipos de reportes, PDF/Excel y analítica operativa | `src/modules/dashboard/services/dashboard-service.ts`, `src/modules/reports/schemas/report-schema.ts`, `src/modules/reports/services/report-service.ts`, `src/modules/analytics/services/analytics-service.ts` |
| Auditoría | Eventos críticos saneados dentro de transacciones de dominio | `src/modules/audit/services/audit-service.ts`, `src/modules/children/services/child-service.ts` |

Las referencias OMS y MSPAS son artefactos versionados/importados, no valores inferidos de la interfaz. La fecha de negocio se calcula en `America/Guatemala`. Fuentes: `docs/architecture/decisions/adr-005-who-growth-follow-up-and-email.md`, `docs/architecture/decisions/adr-006-guatemala-routine-vaccination.md`, `prisma/data/vaccination/gt-mspas-2026-01.json`, `src/lib/date/business-date.ts`.

## 4. Modelo de datos físico

**Hechos comprobados.** `prisma/schema.prisma` define **22 modelos**. Salvo donde se indique, los modelos de negocio usan `id` UUID; muchos tienen `createdAt` y `updatedAt`. `?` significa columna opcional en Prisma. Los atributos siguientes omiten campos inversos de navegación Prisma, que se explican como relaciones debajo. La fuente de todas las filas es `prisma/schema.prisma`.

| Modelo | Atributos propios principales, además de `id` y marcas temporales | Relaciones por clave externa |
| --- | --- | --- |
| `HealthCenter` | `name`, `code?` único, `address?`, `phone?`, `email?`, `isActive` | Raíz organizativa. |
| `User` | `authUserId` único, `healthCenterId?`, `fullName`, `email`, `role`, `isActive` | `healthCenterId → HealthCenter`. `authUserId` enlaza con Supabase Auth, no con otro modelo Prisma. |
| `Community` | `healthCenterId`, `name`, `location?`, `estimatedFamilies?`, `isActive` | `healthCenterId → HealthCenter`; `(healthCenterId, name)` único. |
| `Guardian` | `communityId`, `userId?` único, `fullName`, `identification?`, `phone?`, `email?`, `preferredNotificationChannel?`, `isActive` | `communityId → Community`, `userId? → User`. |
| `Child` | `communityId`, `fullName`, `dateOfBirth`, `sex`, `isActive` | `communityId → Community`. |
| `ChildGuardian` | `childId`, `guardianId`, `relationshipType?`, `isPrimary` | `childId → Child`, `guardianId → Guardian`; par único. |
| `GrowthRecord` | `childId`, `measuredByUserId`, `measurementDate`, `weightKg`, `heightCm`, `measurementMethod?`, `notes?` | `childId → Child`, `measuredByUserId → User`. |
| `GrowthAssessment` | `growthRecordId`, `indicator`, `zScore?`, `percentile?`, `classification?`, `standardName`, `standardVersion`, `calculatedAt` | `growthRecordId → GrowthRecord`; indicador/versión únicos por registro. |
| `GrowthReference` | `standardName`, `standardVersion`, `sex`, `indicator`, `ageReference`, `parameterL?`, `parameterM?`, `parameterS?`, `additionalParameters?` | Sin FK a otros modelos; combinación de estándar, versión, sexo, indicador y edad única. |
| `GrowthFollowUp` | `childId`, `scheduledByUserId`, `sourceGrowthRecordId` único, `dueDate`, `completedAt?`, `completedByGrowthRecordId?` | `childId → Child`, `scheduledByUserId → User`, `sourceGrowthRecordId → GrowthRecord`, `completedByGrowthRecordId? → GrowthRecord`. |
| `Vaccine` | `officialCode?` único, `name` único, `description?`, `isActive` | Catálogo referenciado por dosis. |
| `VaccineScheduleVersion` | `code` único, `name`, `authority`, `publishedAt`, `effectiveFrom`, `effectiveTo?`, `sourceUrl`, `sourceSha256?`, `isActive` | Versión referenciada por dosis. |
| `VaccineSchedule` | `vaccineId`, `scheduleVersionId?`, `doseCode?`, `doseName?`, `timingNote?`, `doseNumber`, `recommendedAgeMonths?`, `recommendedAgeDays?`, `minimumAgeMonths?`, `minimumAgeDays?`, `maximumAgeMonths?`, `maximumAgeDays?`, `maximumAgeExclusive`, `minimumIntervalDays?`, `scheduleName`, `scheduleVersion`, `isActive` | `vaccineId → Vaccine`, `scheduleVersionId? → VaccineScheduleVersion`; unicidad por vacuna/dosis/versión y por versión/código. |
| `Vaccination` | `childId`, `vaccineScheduleId`, `administeredByUserId`, `applicationDate`, `nextDoseDate?`, `notes?` | `childId → Child`, `vaccineScheduleId → VaccineSchedule`, `administeredByUserId → User`; niño+dosis únicos. |
| `Alert` | `childId`, `type`, `severity`, `status`, `title`, `message`, `sourceType?`, `sourceId?`, `reviewedAt?`, `reviewedByUserId?`, `resolvedAt?`, `resolvedByUserId?` | `childId → Child`, `reviewedByUserId? → User`, `resolvedByUserId? → User`; identidad de fuente única por tipo/fuente. |
| `Notification` | `guardianId?`, `alertId?`, `campaignRecipientId?`, `channel`, `destination`, `subject?`, `message`, `status`, `providerMessageId?`, `errorMessage?`, `sentAt?`, `deliveryClaimedAt?` | FKs opcionales a `Guardian`, `Alert` y `CampaignRecipient`; unicidad por alerta+tutor y por destinatario de campaña+canal. |
| `GuardianTelegramConnection` | `guardianId` único, `chatId?` único, `linkedAt?`, `consentedAt?`, `revokedAt?` | `guardianId → Guardian` (0..1 vínculo por tutor). |
| `TelegramLinkToken` | `guardianId`, `createdByUserId`, `tokenHash` único, `expiresAt`, `consumedAt?`, `revokedAt?` | `guardianId → Guardian`, `createdByUserId → User`. |
| `Campaign` | `createdByUserId`, `name`, `subject?`, `message`, `status`, `segmentation?`, `scheduledAt?`, `startedAt?`, `completedAt?` | `createdByUserId → User`. |
| `CampaignRecipient` | `campaignId`, `guardianId`, `status` | `campaignId → Campaign`, `guardianId → Guardian`; par único. |
| `QRToken` | `childId`, `tokenHash` único, `pinHash?`, `failedPinAttempts`, `pinLockedUntil?`, `expiresAt?`, `revokedAt?`, `lastUsedAt?`, `createdByUserId` | `childId → Child`, `createdByUserId → User`. |
| `AuditLog` | `userId?`, `action`, `entityType?`, `entityId?`, `metadata?`, `ipAddress?`, `userAgent?` | `userId? → User`; `entityType/entityId` no son FKs polimórficas declaradas. |

Las cardinalidades principales son: centro 1:N comunidades/usuarios; comunidad 1:N niños/tutores; niño N:M tutor mediante `ChildGuardian`; niño 1:N mediciones, vacunas aplicadas, alertas y credenciales QR; medición 1:N evaluaciones; versión 1:N dosis y dosis 1:N aplicaciones; campaña 1:N destinatarios; alerta y destinatario de campaña 1:N notificaciones opcionales. `GrowthReference` se selecciona por atributos del estándar, sin FK desde `GrowthAssessment`. Fuente: `prisma/schema.prisma`.

Enums persistidos: `UserRole`, `NotificationChannel`, `Sex`, `GrowthIndicator`, `GrowthMeasurementMethod`, `AlertType`, `AlertSeverity`, `AlertStatus`, `NotificationStatus`, `CampaignStatus`, `CampaignRecipientStatus`. El enum `NotificationChannel` incluye `WHATSAPP`, pero el registro de proveedores actual solo implementa `EMAIL` y `TELEGRAM`; no representar WhatsApp como integración operativa. Fuentes: `prisma/schema.prisma`, `src/modules/notifications/services/provider-registry.ts`, `src/modules/notifications/services/notification-service.ts`.

## 5. Rutas, endpoints y componentes principales

**Páginas implementadas:**

| Grupo | Rutas | Fuente |
| --- | --- | --- |
| Públicas/sesión | `/`, `/iniciar-sesion`, `/tarjeta/[token]` | `src/app/page.tsx`, `src/app/iniciar-sesion/page.tsx`, `src/app/tarjeta/[token]/page.tsx` |
| Inicio protegido | `/app` | `src/app/app/page.tsx`, `src/app/app/layout.tsx`, `src/components/layout/app-shell.tsx` |
| Organización | `/app/centros-de-salud`, `/app/centros-de-salud/[id]`, `/app/comunidades`, `/app/comunidades/nueva`, `/app/comunidades/[id]/editar` | `src/app/app/centros-de-salud/`, `src/app/app/comunidades/` |
| Tutores | `/app/tutores`, `/app/tutores/nuevo`, `/app/tutores/[id]`, `/app/tutores/[id]/editar` | `src/app/app/tutores/` |
| Niños y crecimiento | `/app/ninos`, `/app/ninos/nuevo`, `/app/ninos/[id]`, `/app/ninos/[id]/editar`, `/app/ninos/[id]/crecimiento`, `/app/ninos/[id]/crecimiento/nueva`, `/app/ninos/[id]/crecimiento/[recordId]/corregir` | `src/app/app/ninos/` |
| Vacunación y tarjeta | `/app/ninos/[id]/vacunacion`, `/app/ninos/[id]/vacunacion/nueva`, `/app/ninos/[id]/tarjeta`, `/app/vacunas`, `/app/vacunas/nueva`, `/app/vacunas/[id]/editar` | `src/app/app/ninos/`, `src/app/app/vacunas/` |
| Operación/análisis | `/app/alertas`, `/app/alertas/[id]`, `/app/campanas`, `/app/campanas/nueva`, `/app/campanas/[id]`, `/app/reportes`, `/app/analitica` | `src/app/app/alertas/`, `src/app/app/campanas/`, `src/app/app/reportes/page.tsx`, `src/app/app/analitica/page.tsx` |

**Route Handlers implementados:**

| Método y ruta | Función | Fuente |
| --- | --- | --- |
| `GET /api/v1/reports/pdf` | Exportación PDF autorizada | `src/app/api/v1/reports/pdf/route.ts` |
| `GET /api/v1/reports/excel` | Exportación Excel autorizada | `src/app/api/v1/reports/excel/route.ts` |
| `GET /api/internal/alerts/overdue` | Job de seguimiento/vacunación vencidos, autenticado con secreto de cron | `src/app/api/internal/alerts/overdue/route.ts` |
| `POST /api/integrations/resend/webhook` | Confirmación/fallo de entrega de correo | `src/app/api/integrations/resend/webhook/route.ts` |
| `POST /api/integrations/telegram/webhook` | Vinculación `/start` y revocación `/stop` | `src/app/api/integrations/telegram/webhook/route.ts` |

`docs/api/openapi.yaml` documenta los dos endpoints REST de exportación; las rutas internas/webhooks se leen desde sus handlers. La mayoría de mutaciones UI son Server Actions, no endpoints REST: `src/modules/*/actions/`. Componentes representativos: `src/components/layout/app-shell.tsx`, `src/modules/children/components/child-form.tsx`, `src/modules/growth/components/growth-record-form.tsx`, `src/modules/vaccination/components/vaccination-form.tsx`, `src/modules/dashboard/components/dashboard-overview.tsx`, `src/modules/analytics/components/analytics-dashboard.tsx`, `src/modules/reports/components/report-analytics.tsx`.

## 6. Flujos para diagramas posteriores

**Registro de niño.** Formulario → `createChildAction` → sesión/usuario → Zod de fecha/datos → validación de comunidad y centro → transacción `Child` + `AuditLog` → redirección. La asociación de tutor es posterior y valida tutor activo, duplicado y centro antes de crear `ChildGuardian` auditado. Fuentes: `src/modules/children/components/child-form.tsx`, `src/modules/children/actions/child-actions.ts`, `src/modules/children/schemas/child-schema.ts`, `src/modules/children/services/child-service.ts`, `prisma/schema.prisma`.

**Crecimiento.** Formulario → acción → autorización del niño y rol de medición → fecha no futura/posterior al nacimiento → transacción de `GrowthRecord`; puede completar/programar `GrowthFollowUp`; calcula y persiste `GrowthAssessment` con referencias OMS; sincroniza alerta preventiva de percentil peso/edad cuando corresponde; audita. La corrección pasa por una acción/servicio separados y conserva trazabilidad. Fuentes: `src/modules/growth/actions/growth-record-actions.ts`, `src/modules/growth/services/growth-record-service.ts`, `src/modules/growth/services/growth-assessment-service.ts`, `src/modules/alerts/services/growth-alert-service.ts`, `src/modules/growth/who/who-standard.ts`.

**Vacunación.** La versión aplicable y el estado por dosis se derivan de fecha de nacimiento, fecha de negocio, ventanas del esquema y registros `Vaccination`; dosis históricas no aplicables se excluyen de evaluación. Para registrar: formulario/acción → niño autorizado → dosis de versión aprobada → fecha/duplicado → transacción `Vaccination` + auditoría. No se reescribe historial al cambiar versión. Fuentes: `src/modules/vaccination/actions/vaccination-actions.ts`, `src/modules/vaccination/services/vaccination-service.ts`, `src/modules/vaccination/services/vaccination-status.ts`, `src/modules/vaccination/services/vaccination-registration.ts`, `docs/architecture/decisions/adr-006-guatemala-routine-vaccination.md`.

**Alertas.** `GROWTH` se sincroniza al guardar evaluación de peso/edad; `MISSED_FOLLOW_UP` y `VACCINATION` se generan en lotes desde servicios ejecutables por controles UI o por el cron. Los candidatos se deduplican por identidad de fuente, se persisten y pueden crear/entregar notificaciones elegibles. `Alert.status` avanza `OPEN → REVIEWED → RESOLVED` por acciones autorizadas. Fuentes: `src/modules/alerts/services/growth-alert-service.ts`, `src/modules/alerts/services/missed-follow-up-service.ts`, `src/modules/alerts/services/vaccination-alert-service.ts`, `src/modules/alerts/services/operational-alert-batch.ts`, `src/modules/alerts/services/alert-lifecycle.ts`, `src/modules/alerts/services/overdue-alert-job.ts`, `src/modules/alerts/actions/alert-actions.ts`, `vercel.json`.

**QR.** Usuario autorizado genera token opaco; la BD guarda `tokenHash` y, si se configura PIN, `pinHash`. La URL pública valida revocación, expiración y niño activo; intentos PIN se serializan con bloqueo de fila y el estado de intentos queda persistido. La tarjeta concedida proyecta datos del niño, vacunas aplicadas y hasta cinco controles recientes. Fuentes: `src/modules/qr/services/qr-service.ts`, `src/modules/qr/services/qr-crypto.ts`, `src/modules/qr/services/qr-pin-throttle.ts`, `src/modules/qr/services/digital-card.ts`, `src/app/tarjeta/[token]/page.tsx`.

**Campañas.** `ADMIN`/`CENTER_MANAGER` crean borrador con segmentación; el servicio selecciona tutores/niños en alcance, materializa `CampaignRecipient`, evalúa destino por preferencia y entrega por el proveedor del canal. Fuentes: `src/modules/campaigns/actions/campaign-actions.ts`, `src/modules/campaigns/services/campaign-service.ts`, `src/modules/campaigns/services/campaign-segmentation.ts`, `src/modules/notifications/services/notification-recipient-policy.ts`.

**Reportes y analítica.** `getReport` valida tipo/fechas/dosis, aplica centro y entrega filas más metadata analítica; la página presenta tablas y gráficos, y dos handlers generan PDF/Excel. Los nueve tipos están enumerados en `reportFilterSchema`. `getAnalytics` aplica filtros globales y combina agregaciones temporales, territoriales y evaluación paginada de vacunación. Fuente: `src/modules/reports/schemas/report-schema.ts`, `src/modules/reports/services/report-service.ts`, `src/modules/reports/components/report-analytics.tsx`, `src/modules/analytics/schemas/analytics-filter-schema.ts`, `src/modules/analytics/services/analytics-service.ts`, `src/app/app/reportes/page.tsx`.

## 7. Integraciones e infraestructura

**Supabase.** Supabase Auth maneja credenciales/sesión por cookies; el proxy refresca claims y el servidor obtiene el perfil. Prisma usa `DATABASE_URL` desde el servidor; `prisma.config.ts` elige `DIRECT_URL` para migraciones cuando está disponible. Las migraciones versionadas incluyen control RLS/revocación de roles de Data API para las tablas existentes en esa migración. Fuentes: `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, `proxy.ts`, `src/modules/auth/session.ts`, `src/lib/prisma.ts`, `prisma.config.ts`, `prisma/migrations/20260831090000_harden_supabase_data_api_access/migration.sql`.

**Resend y Telegram.** `ProviderRegistry` ofrece EMAIL/Resend y TELEGRAM/Bot API; `Notification` registra canal, estado, claim y referencia de proveedor. Resend verifica firma del webhook y correlaciona `providerMessageId`; Telegram verifica el secreto del webhook, permite vínculo con token hasheado de un uso y `/stop`. La preferencia del tutor elige un canal; no hay proveedor WhatsApp implementado. Fuentes: `src/modules/notifications/services/provider-registry.ts`, `src/modules/notifications/services/notification-service.ts`, `src/modules/notifications/providers/resend-email-provider.ts`, `src/modules/notifications/providers/telegram-provider.ts`, `src/modules/notifications/services/telegram-link-service.ts`, `src/app/api/integrations/resend/webhook/route.ts`, `src/app/api/integrations/telegram/webhook/route.ts`, `docs/architecture/decisions/adr-008-email-telegram-notifications.md`.

**Despliegue.** `staging.yml` define un flujo manual con SHA de `main`, calidad, pruebas aisladas, Environment `sccvi-staging`, identidad persistida de BD, migraciones revisadas, datos de referencia y candidato Vercel con smoke antes de promoción del hostname estable. `staging-demo.yml` aplica únicamente fixtures ficticios a staging por disparo manual. `vercel.json` programa el cron HTTP de alertas vencidas. Esto describe la infraestructura **configurada en Git**, no prueba ejecución, disponibilidad ni topología real de producción. Fuentes: `.github/workflows/staging.yml`, `.github/workflows/staging-demo.yml`, `docs/staging.md`, `vercel.json`.

**PWA.** `manifest.ts` declara SCCVI standalone e iconos 192/512/maskable; `ServiceWorkerRegistration` registra en contexto seguro de producción; `sw.js` usa red primero para navegaciones GET y guarda solo `offline.html`. No hay persistencia clínica ni mutaciones offline. Fuentes: `src/app/manifest.ts`, `src/app/layout.tsx`, `src/components/pwa/service-worker-registration.tsx`, `public/sw.js`, `public/offline.html`, `docs/security.md`.

## 8. Pruebas y automatización

**Hechos comprobados.** `npm test` ejecuta Vitest unitario en `src/**/*.test.ts(x)`; `npm run test:integration` usa una configuración separada con guard de identidad `ISOLATED_TEST`; `npm run test:e2e` usa Playwright con Chromium desktop y Pixel 7 y setup aislado. `npm run test:pwa` ejecuta smoke PWA sin fixtures clínicos; `npm run test:staging-smoke` hace lecturas de staging. También existen validadores de referencia OMS/MSPAS, Prisma y OpenAPI. Fuentes: `package.json`, `vitest.config.mts`, `vitest.integration.config.mts`, `playwright.config.ts`, `playwright.pwa.config.ts`, `playwright.staging.config.ts`, `tests/support/test-environment.ts`, `tests/integration/`, `tests/e2e/`, `tests/staging-smoke/`.

| Workflow | Activación y alcance versionado | Fuente |
| --- | --- | --- |
| CI | PR y push a `main`; npm ci, lint, formato, tipos, unitarios, build, Prisma y OpenAPI | `.github/workflows/ci.yml` |
| Isolated integration and E2E | PR del mismo repositorio, push a `main` o manual; Supabase efímero, integración y E2E | `.github/workflows/isolated-e2e.yml`, `.github/actions/setup-ephemeral-isolated/action.yml` |
| Deploy isolated staging | Manual; calidad + aisladas + Environment protegido + candidato/smoke/promoción | `.github/workflows/staging.yml` |
| Apply isolated staging demo dataset | Manual; preflight, carga ficticia, verificación | `.github/workflows/staging-demo.yml` |

**Pendiente de verificar:** `test:pwa` existe en `package.json`, pero no aparece como paso en `.github/workflows/ci.yml`; confirmar si se incorporará a CI o se mantendrá como validación manual. No se ejecutaron suites ni despliegues en esta etapa documental.

## 9. Puntos pendientes antes de diagramas definitivos

1. **Seguridad de tablas Telegram:** `prisma/schema.prisma` contiene 22 modelos. La migración `prisma/migrations/20260831090000_harden_supabase_data_api_access/migration.sql` enumera 20 tablas y `prisma/migrations/20260919120000_add_email_telegram_notifications/migration.sql` añade `GuardianTelegramConnection` y `TelegramLinkToken` sin sentencias RLS/revocación visibles. Confirmar permisos reales en BD y política aprobada antes de dibujar una frontera RLS que abarque las 22 tablas. No se modificó ninguna migración.
2. **Estado operativo externo:** la presencia de adaptadores, webhooks y workflows no demuestra configuración ni entrega real de Resend/Telegram, ni disponibilidad de staging o producción. Requiere evidencias saneadas del entorno autorizado. Fuentes: `src/modules/notifications/providers/`, `.github/workflows/staging.yml`, `docs/staging.md`.
3. **Alcance de requisitos frente a código:** `docs/requirements.md` menciona administración de usuarios; el árbol actual carece de módulo/páginas CRUD de usuarios. Verificar alcance aprobado antes de incluir ese caso de uso como implementado. Fuentes: `docs/requirements.md`, `src/modules/`, `src/app/app/`.
4. **Clasificación médica y datos de referencia:** para diagramas de decisiones clínicas, usar exclusivamente las versiones y límites documentados en ADR-005/ADR-006; no inferir equivalencias, catch-up ni diagnósticos desde atributos opcionales del esquema. Fuentes: `docs/architecture/decisions/adr-005-who-growth-follow-up-and-email.md`, `docs/architecture/decisions/adr-006-guatemala-routine-vaccination.md`, `src/modules/growth/services/growth-assessment-service.ts`, `src/modules/vaccination/services/vaccination-status.ts`.
