# Comportamiento UML de SCCVI — DERCAS

Diagramas elaborados sobre `main` en `cfe8b16`. La fuente editable es cada `.puml`; el `.svg` homónimo es su exportación. El código implementado prevalece sobre requisitos prospectivos. Los diagramas resumen rutas relevantes; no sustituyen pruebas de ejecución ni describen información de pacientes.

## Actividades

| Diagrama | Alcance y evidencia principal |
| --- | --- |
| [Registro de niño y tutor](actividades/registro-nino-tutor.puml) · [SVG](actividades/registro-nino-tutor.svg) | El niño se crea primero y la asociación es posterior; `src/modules/children/actions/child-actions.ts`, `src/modules/children/services/child-service.ts`. |
| [Crecimiento OMS](actividades/crecimiento-oms.puml) · [SVG](actividades/crecimiento-oms.svg) | Medición factual, seguimiento opcional, referencias OMS, evaluación y alerta preventiva; `src/modules/growth/services/growth-record-service.ts`, `src/modules/growth/services/growth-assessment-service.ts`, `src/modules/alerts/services/growth-alert-service.ts`. |
| [Vacunación](actividades/registro-vacunacion.puml) · [SVG](actividades/registro-vacunacion.svg) | Registro factual único por niño/dosis y auditoría, sin envío desde esta acción; `src/modules/vaccination/actions/vaccination-actions.ts`, `src/modules/vaccination/services/vaccination-service.ts`, `src/modules/vaccination/services/vaccination-registration.ts`. |
| [Alertas y notificaciones](actividades/alertas-notificaciones.puml) · [SVG](actividades/alertas-notificaciones.svg) | Distingue sincronización al medir, lotes UI/cron, transición humana y entrega; `src/modules/alerts/services/operational-alert-batch.ts`, `src/modules/alerts/services/overdue-alert-job.ts`, `src/modules/alerts/services/alert-service.ts`, `src/modules/notifications/services/alert-email-service.ts`. |
| [Campañas](actividades/campanas.puml) · [SVG](actividades/campanas.svg) | Segmentación, borrador, claim de envío, destinatarios y resultado; `src/modules/campaigns/actions/campaign-actions.ts`, `src/modules/campaigns/services/campaign-service.ts`. |

## Secuencia

| Diagrama | Alcance y evidencia principal |
| --- | --- |
| [Medición](secuencia/registro-medicion.puml) · [SVG](secuencia/registro-medicion.svg) | Interfaz → Action → autorización/servicio → Prisma/PostgreSQL en transacción; `src/modules/growth/actions/growth-record-actions.ts`, `src/modules/growth/services/growth-record-service.ts`. |
| [Vacunación](secuencia/registro-vacunacion.puml) · [SVG](secuencia/registro-vacunacion.svg) | Registro y consulta posterior de estados derivados, no una actualización automática persistida; `src/modules/vaccination/services/vaccination-service.ts`, `src/modules/vaccination/services/vaccination-status.ts`. |
| [Carné QR](secuencia/carne-qr.puml) · [SVG](secuencia/carne-qr.svg) | Generación autorizada y consulta pública protegida con PIN opcional; `src/modules/qr/actions/qr-actions.ts`, `src/modules/qr/services/qr-service.ts`, `src/app/tarjeta/[token]/page.tsx`. |
| [Notificaciones](secuencia/entrega-notificaciones.puml) · [SVG](secuencia/entrega-notificaciones.svg) | Canal único, claim atómico, proveedor y webhook Resend posterior; `src/modules/notifications/services/notification-service.ts`, `src/modules/notifications/services/provider-registry.ts`, `src/app/api/integrations/resend/webhook/route.ts`. |

## Estados

| Diagrama | Alcance y evidencia principal |
| --- | --- |
| [Alerta](estados/alerta.puml) · [SVG](estados/alerta.svg) | `OPEN → REVIEWED → RESOLVED`; `prisma/schema.prisma`, `src/modules/alerts/services/alert-lifecycle.ts`, `src/modules/alerts/services/alert-service.ts`. |
| [Campaña](estados/campana.puml) · [SVG](estados/campana.svg) | `DRAFT → PROCESSING → COMPLETED/FAILED`; `prisma/schema.prisma`, `src/modules/campaigns/services/campaign-service.ts`. |
| [Notificación](estados/notificacion.puml) · [SVG](estados/notificacion.svg) | `PENDING → SENT/FAILED` y cambios posteriores por webhook Resend; `prisma/schema.prisma`, `src/modules/notifications/services/notification-service.ts`, `src/app/api/integrations/resend/webhook/route.ts`. |

Fuentes de contexto: `docs/dercas/inventario-tecnico.md`, `docs/dercas/diagramas/casos-de-uso/README.md`, `docs/uml/critical-workflows.md`, las Server Actions y los modelos Prisma respectivos. Los controles del servidor se dibujan donde se ejecutan; una flecha de error resume la devolución de un mensaje seguro sin exponer información interna.

**Diferencias entre esquema y flujo:** `CampaignStatus.SCHEDULED` existe en Prisma, pero el envío actual solo reclama campañas `DRAFT` y no implementa programación. `Notification.deliveryClaimedAt` es un campo de concurrencia, no un estado adicional. El webhook Resend puede cambiar `SENT` a `FAILED` o actualizar por `providerMessageId` tras el resultado inicial; eso no es un reintento de entrega. El webhook Telegram actual sirve para vincular/desvincular el chat, no para confirmar entregas. La evaluación OMS es preventiva, no diagnóstica.

## Regenerar y verificar

Con Java y el JAR oficial de PlantUML instalados localmente, desde la raíz del repositorio:

```powershell
java -jar plantuml.jar -checkonly docs/dercas/diagramas/comportamiento/actividades/*.puml docs/dercas/diagramas/comportamiento/secuencia/*.puml docs/dercas/diagramas/comportamiento/estados/*.puml
java -jar plantuml.jar -tsvg docs/dercas/diagramas/comportamiento/actividades/*.puml docs/dercas/diagramas/comportamiento/secuencia/*.puml docs/dercas/diagramas/comportamiento/estados/*.puml
```

Si Java/PlantUML no están disponibles, los SVG se pueden generar con el [servidor oficial de PlantUML](https://plantuml.com/server) usando únicamente estas fuentes documentales. No se necesitan cambios a las dependencias de SCCVI.
