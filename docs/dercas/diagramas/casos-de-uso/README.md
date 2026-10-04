# Casos de uso de SCCVI — DERCAS

Diagramas documentales basados en `main` en `0bd16e9` al iniciar la etapa 4. El código vigente tiene prioridad sobre requisitos prospectivos y diagramas anteriores. Cada `.puml` es la fuente editable y su `.svg` homónimo es la imagen exportada; los diagramas no contienen datos de pacientes.

| Diagrama | Alcance | Evidencia principal |
| --- | --- | --- |
| [General](general.puml) · [SVG](general.svg) | Capacidades principales por perfil, sin detallar operaciones internas. | `src/modules/auth/authorization.ts`, `src/modules/auth/navigation.ts`, `src/app/app/`, `src/modules/` |
| [Niños y tutores](ninos-y-tutores.puml) · [SVG](ninos-y-tutores.svg) | Alta, consulta, actualización/desactivación y asociación explícita. | `src/modules/children/services/child-service.ts`, `src/modules/guardians/services/guardian-service.ts`, `src/app/app/ninos/`, `src/app/app/tutores/` |
| [Crecimiento](crecimiento.puml) · [SVG](crecimiento.svg) | Registro/corrección de mediciones, evaluación OMS persistida y consulta de historial; el siguiente control puede programarse en el formulario. | `src/modules/growth/services/growth-record-service.ts`, `src/modules/growth/services/growth-assessment-service.ts`, `src/app/app/ninos/[id]/crecimiento/` |
| [Vacunación](vacunacion.puml) · [SVG](vacunacion.svg) | Lectura de carné e historial, registro factual y administración del catálogo. | `src/modules/vaccination/services/vaccination-service.ts`, `src/modules/vaccination/services/vaccination-registration.ts`, `src/modules/vaccination/services/vaccine-service.ts`, `src/app/app/ninos/[id]/vacunacion/` |
| [Alertas y notificaciones](alertas-y-notificaciones.puml) · [SVG](alertas-y-notificaciones.svg) | Consulta/revisión/resolución, actualización de alertas vencidas, envío individual y vinculación de Telegram. | `src/modules/alerts/services/alert-service.ts`, `src/modules/alerts/actions/alert-actions.ts`, `src/modules/notifications/services/manual-alert-notification-service.ts`, `src/modules/notifications/services/telegram-link-service.ts` |
| [Campañas y reportes](campanas-y-reportes.puml) · [SVG](campanas-y-reportes.svg) | Segmentación/envío de campañas; reportes, PDF/Excel y analítica autorizada. | `src/modules/campaigns/services/campaign-service.ts`, `src/modules/reports/services/report-service.ts`, `src/modules/analytics/services/analytics-service.ts`, `src/app/api/v1/reports/` |
| [Carné digital QR](carne-digital-qr.puml) · [SVG](carne-digital-qr.svg) | Gestión de credenciales por personal autorizado y consulta pública protegida mediante token opaco/PIN opcional. | `src/modules/qr/services/qr-service.ts`, `src/modules/qr/actions/qr-actions.ts`, `src/app/tarjeta/[token]/page.tsx` |

Fuentes complementarias: `docs/dercas/inventario-tecnico.md`, `docs/requirements.md` y `docs/uml/critical-workflows.md`. No se incluyó CRUD de usuarios: aparece en requisitos, pero no existe un módulo/página de administración correspondiente en `src/modules/` y `src/app/app/`. Tampoco se representan WhatsApp ni la importación técnica de referencias como operaciones de usuario.

## Actores y convenciones

`ADMIN` es administrador; `HEALTH_STAFF`, personal de salud; `CENTER_MANAGER`, responsable de centro; `GUARDIAN`, tutor con cuenta SCCVI. Los cuatro aparecen fuera del límite del sistema. Las asociaciones expresan capacidad de iniciar el caso, **no acceso irrestricto**: salvo `ADMIN`, las operaciones del personal se restringen al centro asignado; `GUARDIAN` solo accede a recursos autorizados por su vínculo explícito o a su propio perfil. La navegación visible no reemplaza `authorize()` ni las comprobaciones de los servicios.

El actor «Portador de credencial QR» representa el acceso público con token válido; no equivale al rol `GUARDIAN` ni presupone una sesión. No se modelan Prisma, Resend, Telegram o tablas como actores. `<<include>>` aparece solo donde el comportamiento es obligatorio: registrar/corregir medición recalcula la evaluación OMS y consultar el carné digital valida la credencial. No se usa `<<extend>>` para simples pasos o decisiones de interfaz.

## Regeneración y verificación

Con Java y el JAR oficial de PlantUML disponibles, desde la raíz del repositorio:

```powershell
java -jar plantuml.jar -checkonly docs/dercas/diagramas/casos-de-uso/*.puml
java -jar plantuml.jar -tsvg docs/dercas/diagramas/casos-de-uso/*.puml
```

En este equipo no había Java/PlantUML local. Las fuentes se renderizaron con el [servidor oficial de PlantUML](https://plantuml.com/server) usando solo este texto documental sin secretos; se verificó ausencia de errores de sintaxis y validez XML de cada SVG. Esta prueba no comprueba permisos en un entorno desplegado. La [CLI oficial](https://plantuml.com/command-line) permite validar/exportar localmente sin modificar las dependencias de SCCVI.
