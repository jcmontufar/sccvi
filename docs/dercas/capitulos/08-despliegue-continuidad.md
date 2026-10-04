# Capítulo 8. Despliegue y continuidad operativa

## 1. Propósito y alcance

Este capítulo examina el despliegue documentado de SCCVI y las condiciones necesarias para sostenerlo. La [arquitectura de despliegue](../diagramas/arquitectura/arquitectura-despliegue.svg) y el [capítulo V](05-diseno-arquitectura.md) representan un entorno de staging aislado, no una implantación productiva acreditada. El [capítulo VII](07-pruebas-validacion.md) registra verificaciones locales y distingue expresamente las pruebas conectadas que no se ejecutaron en esa etapa. Por ello, los procedimientos descritos a continuación son evidencia de configuración y control; su eficacia operativa debe comprobarse en el entorno autorizado.

## 2. Separación de entornos

El proyecto diferencia desarrollo local, base de pruebas aislada, staging y una eventual producción. El [runbook de staging](../../staging.md) exige un proyecto Vercel y un proyecto Supabase exclusivos, con identidad persistida de la base, variables de entorno separadas y un GitHub Environment protegido. La [estrategia de pruebas](../../testing.md) exige a su vez una marca `ISOLATED_TEST` y un identificador concordante antes de cualquier limpieza o mutación de integración y E2E. Una URL distinta no prueba por sí sola que dos conexiones apunten a bases diferentes. El código de [preflight de staging](../../../scripts/staging-database.ts) y las [guardas de prueba](../../../tests/support/test-environment.ts) constituyen las fuentes técnicas de esas comprobaciones.

No se infiere que el hostname estable de staging sea el entorno productivo de SCCVI. Tampoco se transportan datos reales entre entornos para facilitar demostraciones: los [fixtures de staging](../../../scripts/staging-demo-dataset.ts) se diseñaron como ficticios y sujetos a guardas. El uso institucional con datos infantiles reales requeriría decisiones, responsabilidades y autorizaciones adicionales que el repositorio no demuestra.

## 3. Configuración y proceso de despliegue

El [workflow de staging](../../../.github/workflows/staging.yml) parte de un commit de `main`, pasa controles de calidad y pruebas aisladas, requiere aprobación del entorno protegido, realiza preflight de identidad y estado de migraciones, y solo después contempla un despliegue candidato y smoke de lectura. El [runbook](../../staging.md) especifica la revisión de migraciones, la verificación de datos de referencia y las condiciones de parada antes de promover el hostname estable. El cron de alertas está configurado en [`vercel.json`](../../../vercel.json); su presencia no demuestra que cada ejecución haya terminado satisfactoriamente.

La configuración de secretos se distribuye entre GitHub Environment y variables de runtime Vercel según finalidad. Claves de base de datos, proveedores y webhook no deben figurar en Git ni en reportes. La [configuración de entorno del servidor](../../../src/lib/env/server-env.ts) y el [runbook](../../staging.md) permiten identificar qué variables son necesarias sin publicar sus valores. Las migraciones se gestionan mediante Prisma y el procedimiento revisado del entorno; este capítulo no ejecuta ninguna migración ni declara una ruta de despliegue productivo aprobada.

## 4. Mantenimiento y observación

El mantenimiento técnico requiere revisar cambios de dependencias, ejecutar los gates de [CI](../../../.github/workflows/ci.yml), conservar migraciones versionadas y repetir pruebas de seguridad y dominio cuando cambien servicios críticos. Las tareas de referencia OMS y MSPAS tienen validadores reproducibles en [`package.json`](../../../package.json), pero ninguna actualización clínica debe incorporarse sin fuente oficial y revisión de aplicabilidad. La [ADR-005](../../architecture/decisions/adr-005-who-growth-follow-up-and-email.md) y la [ADR-006](../../architecture/decisions/adr-006-guatemala-routine-vaccination.md) documentan esas fronteras.

La operación requiere observar errores de la aplicación, fallos del cron, estado de las notificaciones y callbacks de Resend y Telegram. El [dispatcher](../../../src/modules/notifications/services/notification-service.ts) conserva `SENT` o `FAILED` según el resultado registrado; ello no sustituye comprobar recepción real ni atender reintentos y fallos de proveedor. No se identificó en el repositorio un acuerdo de nivel de servicio, un equipo de guardia ni un procedimiento institucional aprobado de respuesta a incidentes.

## 5. Respaldos, restauración y recuperación

PostgreSQL conserva datos factuales de niños, mediciones, vacunas y auditoría, cuyo extravío o recuperación incompleta tendría consecuencias operativas. Antes de una adopción se requiere definir responsable, frecuencia, retención, cifrado, acceso y ubicación de respaldos, además de ensayar restauraciones sobre un destino aislado y comprobar integridad referencial, migraciones y versiones de referencia. El [esquema Prisma](../../../prisma/schema.prisma) y las [migraciones](../../../prisma/migrations/) documentan la estructura, pero **no** prueban que existan respaldos restaurables o tiempos de recuperación medidos.

Ante un despliegue fallido, el [runbook de staging](../../staging.md) define puntos de detención y revisión del candidato. La recuperación de la aplicación, la base y los proveedores debe tratarse por separado: revertir código no revierte necesariamente una migración o un mensaje ya entregado. En el estado documental actual no se certifican objetivos de punto o tiempo de recuperación, copias probadas ni continuidad durante pérdida de red. La [PWA](../../../public/sw.js) muestra un fallback público, pero no permite trabajo clínico offline.

## 6. Riesgos y controles pendientes

Los riesgos principales son confundir credenciales o bases entre entornos, aplicar migraciones no revisadas, exponer datos infantiles, introducir reglas clínicas sin fuente, perder trazabilidad histórica o asumir que un proveedor entregó mensajes por la mera existencia de un adaptador. Los controles versionados de identidad, autorización, validación, auditoría y pruebas reducen parte de esos riesgos; no sustituyen una revisión operativa de permisos de base, TLS publicado, privacidad y recuperación. El [catálogo RNF](../requisitos/requisitos-no-funcionales.md) mantiene algunas de estas propiedades como parciales o no verificadas.

El [capítulo VII](07-pruebas-validacion.md) registra que la suite unitaria y las validaciones locales pasaron, mientras integración y E2E no se ejecutaron en aquella etapa por ausencia de verificación positiva de un entorno aislado; además, el comando OpenAPI terminó anómalamente en Windows. Estos límites impiden extrapolar una ejecución local al funcionamiento de staging o a seguridad productiva. Debe repetirse la verificación correspondiente con evidencia saneada y corregir o caracterizar fallos antes de aceptar un proceso de entrega.

## 7. Condiciones para adopción institucional

Una institución interesada tendría que aprobar finalidades y bases de tratamiento de datos infantiles, definir responsables por rol y centro, formar operadores, establecer soporte y respuesta a incidentes, verificar accesibilidad y conectividad, y comprobar respaldo/restauración y proveedores en un entorno autorizado. El [estudio de factibilidad](02-estudio-factibilidad.md) deja costos, capacidad y revisión jurídica por determinar. El [catálogo funcional](../requisitos/requisitos-funcionales.md) mantiene pendientes la recuperación de cuenta y la administración integral de usuarios, y parcial la auditoría original. También faltan validación clínica formal y aceptación institucional documentada; ninguna se infiere de pruebas automatizadas.

## 8. Síntesis

SCCVI dispone de un procedimiento versionado para staging aislado y de controles preventivos sobre migraciones, secretos y pruebas conectadas. La continuidad real depende, sin embargo, de respaldos restaurados en ensayo, supervisión de servicios, responsables institucionales, verificación de seguridad y protocolos de recuperación todavía no acreditados. En consecuencia, este capítulo describe preparación técnica y requisitos para una decisión posterior; no declara producción en servicio ni adopción oficial.
