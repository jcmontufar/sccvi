# Capítulo 4. Análisis y modelado del sistema

## 1. Introducción al análisis y modelado

El modelado de SCCVI permite examinar el mismo sistema desde perspectivas complementarias: quién inicia una operación, qué información persiste, cómo se desarrolla un proceso y qué estados conserva cada entidad. Este capítulo interpreta los diagramas existentes sin convertirlos en prueba de operación institucional. El alcance y las brechas ya se establecieron en [generalidades](01-generalidades.md), [factibilidad](02-estudio-factibilidad.md) y [análisis de requisitos](03-analisis-requisitos.md); aquí se explica la correspondencia entre los modelos y el código vigente. El [inventario técnico](../inventario-tecnico.md) y la [matriz de trazabilidad](../requisitos/matriz-trazabilidad.md) sirven como índices de verificación.

## 2. Metodología y notaciones utilizadas

Los casos de uso, actividades, secuencias, estados y arquitectura se expresan en PlantUML (`.puml`); las vistas entidad–relación emplean Mermaid (`.mmd`). La fuente editable de cada figura se conserva junto a su exportación `.svg`. En este capítulo, identificadores como `FIG-DERCAS-CU-01` son **referencias estables**, no números de página ni numeración final de Word. Una edición posterior podrá numerar las figuras sin cambiar la correspondencia entre identificador, SVG y fuente. Las convenciones y límites de cada notación se documentan en los README de [casos de uso](../diagramas/casos-de-uso/README.md), [entidad–relación](../diagramas/entidad-relacion/README.md), [comportamiento](../diagramas/comportamiento/README.md) y [arquitectura](../diagramas/arquitectura/README.md).

El método fue contrastar actores con la [matriz de autorización](../../../src/modules/auth/authorization.ts), entidades y cardinalidades con [`schema.prisma`](../../../prisma/schema.prisma), y flujos con las acciones y servicios señalados por los README. Los SVG son figuras para la futura versión Word; los `.puml` y `.mmd` son anexos técnicos reproducibles. Un diagrama sintetiza decisiones y relaciones, pero no sustituye la validación de permisos, la ejecución de pruebas ni la comprobación de servicios externos.

## 3. Identificación de actores y límites del sistema

Los cuatro actores autenticados son `ADMIN`, `HEALTH_STAFF`, `CENTER_MANAGER` y `GUARDIAN`. Sus asociaciones con casos de uso indican que pueden iniciar una operación **dentro de su alcance**, no que tengan acceso indiscriminado. Salvo el alcance global aprobado del administrador, el personal actúa en su centro; el tutor accede solo a niños vinculados mediante `ChildGuardian`. El portador de una credencial QR es un actor distinto: consulta una tarjeta limitada tras validar un token y, si corresponde, un PIN, sin convertirse en usuario `GUARDIAN`. Esta separación está representada en los [casos de uso](../diagramas/casos-de-uso/README.md) y aplicada en la [autorización](../../../src/modules/auth/authorization.ts) y el [servicio QR](../../../src/modules/qr/services/qr-service.ts).

El límite lógico se aprecia en **FIG-DERCAS-ARQ-01**: presentación React, Server Actions y Route Handlers, seguridad, módulos y Prisma son partes del mismo monolito Next.js; Supabase Auth/PostgreSQL, Resend y Telegram son dependencias externas. **FIG-DERCAS-ARQ-02** representa únicamente la topología de *staging aislado configurada en Git* y distingue herramientas de desarrollo/despliegue de componentes de ejecución; no acredita disponibilidad actual ni describe producción. Las figuras y sus anexos son [arquitectura lógica SVG](../diagramas/arquitectura/arquitectura-logica.svg) ([fuente](../diagramas/arquitectura/arquitectura-logica.puml)) y [arquitectura de despliegue SVG](../diagramas/arquitectura/arquitectura-despliegue.svg) ([fuente](../diagramas/arquitectura/arquitectura-despliegue.puml)).

## 4. Modelo de casos de uso

Los casos de uso responden a la pregunta de qué objetivo persigue un actor frente a SCCVI y permiten detectar atribuciones indebidas de permisos. **FIG-DERCAS-CU-01** ofrece la vista general; las otras seis figuras separan ámbitos para conservar legibilidad. La asociación actor–caso se comprueba contra permisos y servicios, no contra la presencia de un enlace en la navegación. La inclusión `<<include>>` se reserva a pasos obligatorios, como evaluar la medición OMS al registrarla o validar una credencial antes de consultar la tarjeta. El [README de casos de uso](../diagramas/casos-de-uso/README.md) explica esta convención.

| Figura estable | Ámbito y aporte analítico | Figura SVG · anexo editable |
| --- | --- | --- |
| `FIG-DERCAS-CU-01` | Vista general de capacidades por perfil, útil para delimitar el sistema. | [SVG](../diagramas/casos-de-uso/general.svg) · [PUML](../diagramas/casos-de-uso/general.puml) |
| `FIG-DERCAS-CU-02` | Registro, consulta, cambio y asociación explícita de niños y tutores. | [SVG](../diagramas/casos-de-uso/ninos-y-tutores.svg) · [PUML](../diagramas/casos-de-uso/ninos-y-tutores.puml) |
| `FIG-DERCAS-CU-03` | Medición, corrección, evaluación OMS obligatoria y consulta de historial. | [SVG](../diagramas/casos-de-uso/crecimiento.svg) · [PUML](../diagramas/casos-de-uso/crecimiento.puml) |
| `FIG-DERCAS-CU-04` | Carné e historial vacunal, aplicación factual y catálogo autorizado. | [SVG](../diagramas/casos-de-uso/vacunacion.svg) · [PUML](../diagramas/casos-de-uso/vacunacion.puml) |
| `FIG-DERCAS-CU-05` | Consulta y ciclo de alertas, notificación individual y vínculo Telegram. | [SVG](../diagramas/casos-de-uso/alertas-y-notificaciones.svg) · [PUML](../diagramas/casos-de-uso/alertas-y-notificaciones.puml) |
| `FIG-DERCAS-CU-06` | Borrador/envío de campañas, reportes, exportación y analítica. | [SVG](../diagramas/casos-de-uso/campanas-y-reportes.svg) · [PUML](../diagramas/casos-de-uso/campanas-y-reportes.puml) |
| `FIG-DERCAS-CU-07` | Generación, revocación y consulta protegida del carné QR por actor distinto. | [SVG](../diagramas/casos-de-uso/carne-digital-qr.svg) · [PUML](../diagramas/casos-de-uso/carne-digital-qr.puml) |

La vista general no convierte en implementada la administración de usuarios solicitada originalmente: `RF-003` sigue pendiente. Tampoco los diagramas atribuyen a tutores registro de mediciones o vacunaciones, ni a cualquier visitante acceso infantil por un identificador de URL. Estas ausencias son decisiones de correspondencia con el [catálogo funcional](../requisitos/requisitos-funcionales.md), no omisiones gráficas.

## 5. Modelo entidad–relación

Los diagramas ER describen la estructura persistida, sus claves y cardinalidades, no los permisos ni el orden de ejecución. **FIG-DERCAS-ER-01** reúne los 22 modelos de [`schema.prisma`](../../../prisma/schema.prisma); las cinco vistas de dominio repiten algunas entidades como contexto, sin crear tablas adicionales. El [README ER](../diagramas/entidad-relacion/README.md) define `PK`, `FK`, opcionalidad y pata de cuervo, y advierte que índices, nulabilidad detallada y restricciones completas deben consultarse en Prisma.

| Figura estable | Submodelo y relaciones destacadas | Figura SVG · anexo editable |
| --- | --- | --- |
| `FIG-DERCAS-ER-01` | Vista general de los 22 modelos y relaciones físicas declaradas. | [SVG](../diagramas/entidad-relacion/general.svg) · [MMD](../diagramas/entidad-relacion/general.mmd) |
| `FIG-DERCAS-ER-02` | `HealthCenter` agrupa usuarios/comunidades; `Community` agrupa niños/tutores; `ChildGuardian` materializa la asociación N:M. | [SVG](../diagramas/entidad-relacion/organizacion-y-personas.svg) · [MMD](../diagramas/entidad-relacion/organizacion-y-personas.mmd) |
| `FIG-DERCAS-ER-03` | `Child → GrowthRecord → GrowthAssessment`; `GrowthFollowUp` enlaza controles y `GrowthReference` conserva parámetros versionados. | [SVG](../diagramas/entidad-relacion/crecimiento-y-seguimiento.svg) · [MMD](../diagramas/entidad-relacion/crecimiento-y-seguimiento.mmd) |
| `FIG-DERCAS-ER-04` | `Vaccine`, `VaccineScheduleVersion` y `VaccineSchedule` definen dosis; `Vaccination` conserva aplicaciones por niño y usuario. | [SVG](../diagramas/entidad-relacion/vacunacion.svg) · [MMD](../diagramas/entidad-relacion/vacunacion.mmd) |
| `FIG-DERCAS-ER-05` | `Alert` y `Notification` se relacionan con niño/tutor; campañas y destinatarios tienen historia de envío; la identidad Telegram se almacena por separado. | [SVG](../diagramas/entidad-relacion/alertas-comunicaciones.svg) · [MMD](../diagramas/entidad-relacion/alertas-comunicaciones.mmd) |
| `FIG-DERCAS-ER-06` | `QRToken` vincula credencial y niño; `AuditLog` vincula el actor cuando existe. | [SVG](../diagramas/entidad-relacion/qr-y-auditoria.svg) · [MMD](../diagramas/entidad-relacion/qr-y-auditoria.mmd) |

Tres límites evitan interpretar el modelo como una historia clínica calculada. `GrowthRecord` es el hecho medido y `GrowthAssessment` la evaluación derivada; `VaccineSchedule` define oportunidad, mientras `Vaccination` prueba una aplicación registrada. El estado vacunal se calcula y no forma otra tabla. Además, `GrowthReference` se selecciona por estándar, versión, sexo, indicador y edad, **sin FK** desde `GrowthAssessment`; `AuditLog.entityType/entityId` no es una FK polimórfica, y `User.authUserId` apunta a Supabase Auth fuera de Prisma. Esas distinciones proceden del [esquema](../../../prisma/schema.prisma) y de las [convenciones ER](../diagramas/entidad-relacion/README.md).

## 6. Modelos de actividades

Los diagramas de actividades muestran decisiones, bifurcaciones y respuestas de error dentro de procesos completos. Permiten verificar en qué momento intervienen validación, autorización, transacción y, en su caso, un proceso programado. No indican que toda actividad ocurra en una sola solicitud: el alta de un niño antecede a una posible asociación posterior con un tutor; los vencimientos pueden evaluarse por un control autorizado o por cron. Las cinco figuras, descritas también en el [README de comportamiento](../diagramas/comportamiento/README.md), son las siguientes.

| Figura estable | Proceso sintetizado | Figura SVG · anexo editable |
| --- | --- | --- |
| `FIG-DERCAS-ACT-01` | Alta de niño y asociación posterior con tutor, ambas con alcance y auditoría. | [SVG](../diagramas/comportamiento/actividades/registro-nino-tutor.svg) · [PUML](../diagramas/comportamiento/actividades/registro-nino-tutor.puml) |
| `FIG-DERCAS-ACT-02` | Medición factual, seguimiento opcional, evaluación OMS y alerta preventiva si corresponde. | [SVG](../diagramas/comportamiento/actividades/crecimiento-oms.svg) · [PUML](../diagramas/comportamiento/actividades/crecimiento-oms.puml) |
| `FIG-DERCAS-ACT-03` | Registro vacunal autorizado, validación de dosis/fecha/duplicado y auditoría transaccional. | [SVG](../diagramas/comportamiento/actividades/registro-vacunacion.svg) · [PUML](../diagramas/comportamiento/actividades/registro-vacunacion.puml) |
| `FIG-DERCAS-ACT-04` | Alerta de crecimiento al medir, vencimientos por UI/cron, revisión y comunicación elegible. | [SVG](../diagramas/comportamiento/actividades/alertas-notificaciones.svg) · [PUML](../diagramas/comportamiento/actividades/alertas-notificaciones.puml) |
| `FIG-DERCAS-ACT-05` | Segmentación y borrador de campaña, envío reclamado y resultado por destinatario. | [SVG](../diagramas/comportamiento/actividades/campanas.svg) · [PUML](../diagramas/comportamiento/actividades/campanas.puml) |

El proceso OMS calcula la edad desde el nacimiento hasta la fecha de medición; si falta una referencia necesaria, no fabrica un resultado. El registro vacunal no envía una notificación ni reescribe historial en esa misma acción. El flujo de alertas distingue la sincronización al medir de la evaluación de vencimientos y de la transición humana posterior. Estas precisiones se respaldan en los servicios de [medición](../../../src/modules/growth/services/growth-record-service.ts), [vacunación](../../../src/modules/vaccination/services/vaccination-service.ts) y [alertas vencidas](../../../src/modules/alerts/services/overdue-alert-job.ts).

## 7. Diagramas de secuencia

La secuencia representa **quién llama a quién y en qué orden**, por lo que complementa las decisiones de las actividades. En **FIG-DERCAS-SEQ-01** la medición atraviesa interfaz, Server Action, autorización, servicio y transacción Prisma/PostgreSQL; **FIG-DERCAS-SEQ-02** separa el `INSERT` factual de la posterior consulta del estado vacunal derivado. **FIG-DERCAS-SEQ-03** separa la generación autorizada del QR de su consulta pública con comprobación de vigencia y PIN. **FIG-DERCAS-SEQ-04** muestra elegibilidad, claim atómico, proveedor y webhook Resend posterior, sin doble canal ni fallback silencioso.

| Figura estable | Interacción representada | Figura SVG · anexo editable |
| --- | --- | --- |
| `FIG-DERCAS-SEQ-01` | Registro de medición, referencia OMS, seguimiento y auditoría dentro del límite transaccional. | [SVG](../diagramas/comportamiento/secuencia/registro-medicion.svg) · [PUML](../diagramas/comportamiento/secuencia/registro-medicion.puml) |
| `FIG-DERCAS-SEQ-02` | Aplicación vacunal factual y nueva lectura de estados aplicables, sin estado estático persistido. | [SVG](../diagramas/comportamiento/secuencia/registro-vacunacion.svg) · [PUML](../diagramas/comportamiento/secuencia/registro-vacunacion.puml) |
| `FIG-DERCAS-SEQ-03` | Credencial QR opaca y consulta protegida, con acceso denegado si falla una condición. | [SVG](../diagramas/comportamiento/secuencia/carne-qr.svg) · [PUML](../diagramas/comportamiento/secuencia/carne-qr.puml) |
| `FIG-DERCAS-SEQ-04` | Política de destinatario, `Notification`, proveedor EMAIL/TELEGRAM y callback Resend firmado. | [SVG](../diagramas/comportamiento/secuencia/entrega-notificaciones.svg) · [PUML](../diagramas/comportamiento/secuencia/entrega-notificaciones.puml) |

El webhook de Telegram representado en arquitectura vincula o revoca el chat; no confirma la entrega de una `Notification`. Por ello **FIG-DERCAS-SEQ-04** no le atribuye transiciones de entrega. Esta diferencia figura en el [README de comportamiento](../diagramas/comportamiento/README.md) y en el [registro de proveedores](../../../src/modules/notifications/services/provider-registry.ts).

## 8. Diagramas de estados

Los estados describen transiciones **persistidas**, no pasos visuales ni todos los valores posibles de un enum. **FIG-DERCAS-EST-01** restringe `Alert` a `OPEN → REVIEWED → RESOLVED` mediante acción autorizada, sin reapertura implementada. **FIG-DERCAS-EST-02** refleja el envío actual de `Campaign`: `DRAFT → PROCESSING → COMPLETED` o `FAILED`, según resultado. Prisma declara `SCHEDULED`, pero el [servicio de campañas](../../../src/modules/campaigns/services/campaign-service.ts) solo reclama `DRAFT`; no hay transición implementada a un envío programado. El destinatario de campaña tiene estados propios, entre ellos `SKIPPED`, y no debe confundirse con el estado agregado de `Campaign`.

**FIG-DERCAS-EST-03** presenta `Notification` desde `PENDING` hasta `SENT` o `FAILED`. `deliveryClaimedAt` limita entregas concurrentes, pero no añade un estado. Un evento posterior firmado de Resend puede confirmar `SENT` o cambiarlo a `FAILED` por rebote/fallo/supresión, y un `email.delivered` tardío puede cambiar `FAILED` a `SENT` según el diagrama; ello no constituye un reintento manual. El [servicio de notificaciones](../../../src/modules/notifications/services/notification-service.ts) y el [README de comportamiento](../diagramas/comportamiento/README.md) explican esa distinción.

| Figura estable | Ciclo modelado | Figura SVG · anexo editable |
| --- | --- | --- |
| `FIG-DERCAS-EST-01` | `Alert`: apertura, revisión y resolución. | [SVG](../diagramas/comportamiento/estados/alerta.svg) · [PUML](../diagramas/comportamiento/estados/alerta.puml) |
| `FIG-DERCAS-EST-02` | `Campaign`: borrador, procesamiento y resultado final implementado. | [SVG](../diagramas/comportamiento/estados/campana.svg) · [PUML](../diagramas/comportamiento/estados/campana.puml) |
| `FIG-DERCAS-EST-03` | `Notification`: cola, envío/fallo y corrección por webhook de correo. | [SVG](../diagramas/comportamiento/estados/notificacion.svg) · [PUML](../diagramas/comportamiento/estados/notificacion.puml) |

## 9. Correspondencia entre modelos, requisitos y reglas de negocio

La [matriz de trazabilidad](../requisitos/matriz-trazabilidad.md) es la correspondencia exhaustiva de `RF`, `RNF` y `RN` con criterios `CA`, código, pruebas existentes y alias de diagrama. Esta sección ofrece ejemplos de lectura cruzada sin repetir sus 49 filas.

| Tema | Requisitos y reglas | Figuras que permiten el análisis |
| --- | --- | --- |
| Acceso infantil | `RF-007`, `RF-008`, `RNF-001`, `RN-001`, `RN-002` | `FIG-DERCAS-CU-02`, `FIG-DERCAS-ER-02`, `FIG-DERCAS-ACT-01` muestran operación, vínculo físico y control de asociación. |
| Crecimiento y seguimiento | `RF-009`–`RF-011`, `RN-003`–`RN-005` | `FIG-DERCAS-CU-03`, `FIG-DERCAS-ER-03`, `FIG-DERCAS-ACT-02`, `FIG-DERCAS-SEQ-01` separan dato factual, cálculo y seguimiento. |
| Vacunación | `RF-012`–`RF-015`, `RN-006`, `RN-007` | `FIG-DERCAS-ER-04`, `FIG-DERCAS-ACT-03`, `FIG-DERCAS-SEQ-02` muestran versión, aplicación y estado derivado por cohorte. |
| Alertas y entrega | `RF-016`–`RF-019`, `RN-008`–`RN-010` | `FIG-DERCAS-ACT-04`, `FIG-DERCAS-SEQ-04` y `FIG-DERCAS-EST-01`–`FIG-DERCAS-EST-03` distinguen generación, proveedor y ciclos persistidos. |
| Carné QR protegido | `RF-020`, `RNF-011`, `RN-011` | `FIG-DERCAS-CU-07`, `FIG-DERCAS-ER-06` y `FIG-DERCAS-SEQ-03` separan credencial, consulta pública limitada y controles de acceso. |
| Reportes y cobertura vacunal | `RF-023`, `RN-012` | `FIG-DERCAS-CU-06` y `FIG-DERCAS-ER-04` relacionan la consulta/exportación autorizada con dosis y aplicaciones factuales; la fórmula de cobertura se verifica en el servicio, no en el ER. |

La relación entre figuras y requisitos orienta una revisión, pero la prueba de cumplimiento sigue en los criterios y servicios. Por ejemplo, una cardinalidad en **FIG-DERCAS-ER-02** no demuestra por sí sola la comprobación de IDOR exigida por `RNF-001`; una flecha de proveedor en **FIG-DERCAS-ARQ-01** tampoco prueba entrega real. Esta distinción conserva el método del [capítulo III](03-analisis-requisitos.md).

## 10. Limitaciones y consideraciones del análisis

Los ER documentan el esquema Prisma versionado, no el estado de una base remota. Los diagramas UML resumen caminos representativos y no enumeran todas las validaciones o errores posibles. Las representaciones de arquitectura indican código e infraestructura de staging configurada, no una implantación productiva ni disponibilidad de Resend o Telegram. El [inventario](../inventario-tecnico.md) deja pendiente verificar privilegios efectivos de tablas Telegram, y el [catálogo no funcional](../requisitos/requisitos-no-funcionales.md) mantiene sin comprobación operativa TLS e instalación física de la PWA. Estas limitaciones impiden tratar una figura como acta de aceptación.

Las funciones pendientes no se incorporan como casos de uso implementados: recuperación de cuenta y CRUD de usuarios siguen sin flujo propio. El campo `classification` de una evaluación no acredita clasificación clínica automática aprobada; el estado `SCHEDULED` tampoco acredita programación de campañas. La separación OMS/MSPAS, la historia factual y el lenguaje preventivo se conservan conforme a las [reglas formalizadas](../requisitos/reglas-de-negocio.md). La importación de referencias oficiales, aunque relevante para el sistema, no se presenta como acción ordinaria de un usuario final.

## 11. Conclusión del capítulo

El conjunto modelado reúne **dos diagramas de arquitectura, siete de casos de uso, seis entidad–relación y doce de comportamiento** —cinco actividades, cuatro secuencias y tres estados—. Sus vistas articulan límites de acceso, estructura persistida y procesos verificables sin equiparar hecho registrado, evaluación derivada y comunicación. Los identificadores estables y los enlaces a SVG y fuentes editables permiten reutilizar las figuras en la versión Word y volver a contrastarlas con la [matriz de trazabilidad](../requisitos/matriz-trazabilidad.md) cuando evolucione el código. El capítulo describe el diseño vigente; no afirma validación clínica, operación institucional ni despliegue productivo.
