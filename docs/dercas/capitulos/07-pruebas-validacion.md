# Capítulo 7. Pruebas, verificación y validación

## 1. Introducción a las pruebas y validación

La verificación de SCCVI contrasta artefactos y comportamiento automatizable con los [requisitos](../requisitos/README.md) y sus [criterios de aceptación](../requisitos/criterios-de-aceptacion.md). Este capítulo separa cuatro niveles de evidencia: prueba existente en el repositorio, prueba ejecutada durante esta etapa, prueba omitida por ausencia de un entorno seguro y validación operativa o institucional pendiente. Los resultados concretos se registran en la [evidencia de ejecución](../evidencias/etapa-13-verificaciones.md); la presencia de código o de un workflow no se toma como aprobación automática.

## 2. Estrategia de pruebas del proyecto

La [estrategia versionada](../../testing.md) organiza Vitest unitario sin base de datos, Vitest de integración contra PostgreSQL aislado y Playwright para recorridos de extremo a extremo con aplicación, Auth y datos ficticios aislados. [`package.json`](../../../package.json) expone los comandos; [CI](../../../.github/workflows/ci.yml) ejecuta calidad, pruebas unitarias, compilación, Prisma y OpenAPI, mientras el [workflow aislado](../../../.github/workflows/isolated-e2e.yml) prepara una infraestructura efímera para integración y E2E. Ambos describen mecanismos de comprobación, no resultados históricos de esta ejecución local.

## 3. Entornos y condiciones de ejecución

Las verificaciones de esta etapa se realizaron desde `main` actualizado en `ad9c1c5`, en una rama exclusivamente documental y un host Windows local. Lint, formato, tipos, Vitest unitario, build y validadores de artefactos no requirieron conectar a una base de datos para su finalidad. El build detectó `.env.local`, pero no se consultaron ni registraron sus valores y no se invocaron operaciones de escritura de datos.

Las suites de integración y E2E exigen la identidad `ISOLATED_TEST` persistida y concordante con la configuración, además de condiciones propias de Auth y datos ficticios. Esas condiciones **no fueron verificadas positivamente en esta etapa**, por lo que no se ejecutaron esas suites ni se intentó sustituirlas por una base de desarrollo o staging. Las guardas se describen en [`docs/testing.md`](../../testing.md) y en la [configuración de integración](../../../vitest.integration.config.mts). Tampoco se accedió a producción.

## 4. Pruebas unitarias

`npm run test` ejecutó Vitest y terminó satisfactoriamente con **305 pruebas aprobadas en 71 archivos**. Entre los archivos existentes figuran pruebas de [autorización](../../../src/modules/auth/authorization.test.ts), [evaluación OMS](../../../src/modules/growth/who/who-standard.test.ts), [estado vacunal](../../../src/modules/vaccination/services/vaccination-status.test.ts), [reglas de alerta](../../../src/modules/alerts/services/vaccination-alert-rule.test.ts), [seguridad QR](../../../src/modules/qr/services/qr-security.test.ts) y [despacho de notificaciones](../../../src/modules/notifications/services/notification-dispatcher.test.ts). El resultado afirma que esa suite local pasó, no que todos los criterios CA ni flujos conectados estén satisfechos.

## 5. Pruebas de integración

Existen pruebas de [persistencia crítica](../../../tests/integration/critical-persistence.test.ts), [auditoría transaccional](../../../tests/integration/critical-audit-mutations.test.ts), [vencimientos programados](../../../tests/integration/scheduled-overdue-alerts.test.ts), [campañas](../../../tests/integration/campaign-delivery.test.ts) y [lecturas analíticas](../../../tests/integration/analytics-read-model.test.ts). Su [setup](../../../tests/integration/setup.ts) y las guardas documentadas requieren un destino aislado antes de cualquier mutación o limpieza. **No se ejecutó `npm run test:integration`** porque no se confirmó esa identidad en esta etapa. Su existencia se puede vincular a CA pertinentes mediante la [matriz](../requisitos/matriz-trazabilidad.md), pero no se atribuye un resultado local.

## 6. Pruebas funcionales y de extremo a extremo

Los recorridos Playwright versionados cubren registro básico, crecimiento, vacunación, QR, campañas, reportes, analítica y PWA en [`tests/e2e`](../../../tests/e2e/). La [configuración Playwright](../../../playwright.config.ts) prepara pruebas con infraestructura aislada y la [estrategia](../../testing.md) prohíbe reutilizar un servidor de desarrollo no confirmado. `npm run test:e2e`, `npm run test:pwa` y el smoke de staging **no se ejecutaron**; sus resultados durante esta etapa son desconocidos. Tampoco se efectuó una aceptación funcional con profesionales de salud o una validación institucional.

## 7. Pruebas de seguridad y autorización

La suite unitaria aprobada incluye pruebas existentes de permisos por [rol y recurso](../../../src/modules/auth/authorization.test.ts), [acceso a niños](../../../src/modules/children/services/child-access.test.ts), [credenciales QR](../../../src/modules/qr/services/qr-security.test.ts) y [política de destinatarios](../../../src/modules/notifications/services/notification-recipient-policy.test.ts). Las pruebas de [auditoría persistente](../../../tests/integration/critical-audit-mutations.test.ts) y los recorridos de [QR en navegador](../../../tests/e2e/qr-security.spec.ts) existen, pero no se ejecutaron aquí. Por tanto, la aprobación unitaria aporta evidencia de reglas aisladas, no una auditoría de seguridad completa, ni certifica RLS, TLS o aislamiento operativo de bases y proveedores.

## 8. Verificación de reglas OMS y MSPAS

`npm run who:validate` aprobó la lectura, hash y estructura del artefacto OMS con **7 428 filas**; `npm run vaccination:validate` aprobó **21 dosis** de la versión MSPAS `GT-MSPAS-2026-01-12`. Ambos scripts retornan antes de conectar a Prisma en modo `--validate-only`, conforme a los [importadores OMS](../../../scripts/import-who-growth.ts) y [MSPAS](../../../scripts/import-vaccination-schedule.ts). Las pruebas unitarias de [cálculo OMS](../../../src/modules/growth/services/growth-assessment-engine.test.ts), [cohorte/estado vacunal](../../../src/modules/vaccination/services/vaccination-status.test.ts) y [artefacto guatemalteco](../../../src/modules/vaccination/schedule/guatemala-schedule.test.ts) participaron en Vitest. Estas comprobaciones verifican integridad y reglas codificadas; no equivalen a aprobación clínica independiente, importación en una base ni aplicación de una vacuna real.

## 9. Pruebas de calidad de código y compilación

`npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run build` y `npm run prisma:validate` terminaron con código 0. El build compiló y completó su paso de generación de páginas (26/26); ese número no representa cobertura funcional ni rendimiento desplegado. La validación adicional `npm run openapi:validate` comunicó que el YAML era válido, pero **el comando terminó con código 1** por una aserción Node/libuv en Windows. Se conserva como fallo del gate en este host, sin adjudicarle una causa definitiva ni alterar dependencias para hacerlo desaparecer. El registro reproducible recoge las [salidas resumidas](../evidencias/etapa-13-verificaciones.md).

## 10. Resultados de las comprobaciones ejecutadas

| Grupo | Resultado local de esta etapa | Interpretación |
| --- | --- | --- |
| Calidad y tipos | Lint, formato y TypeScript aprobados. | Evidencia estática local. |
| Pruebas unitarias | 305/305 aprobadas en 71 archivos. | No comprende bases ni navegadores. |
| Compilación y esquema | Build y `prisma:validate` aprobados. | No se ejecutaron migraciones ni se verificó una base remota. |
| Referencias sanitarias | OMS: 7 428 filas; MSPAS: 21 dosis; ambos validadores aprobados. | Validación local sin importación. |
| OpenAPI | YAML informado como válido; comando fallido con código 1 por aserción Node/libuv. | Gate no aprobado en este host; requiere diagnóstico separado. |
| Integración, E2E y operación | No ejecutados. | Entorno aislado y operación real no verificados aquí. |

Los comandos, mensajes significativos y límites de cada fila se detallan en la [evidencia documental](../evidencias/etapa-13-verificaciones.md). Ningún resultado se extrapola a staging o producción.

## 11. Cobertura de requisitos y criterios de aceptación

La [matriz de trazabilidad](../requisitos/matriz-trazabilidad.md) enlaza los 26 RF, 11 RNF y 12 RN con sus 49 CA y, cuando existen, con archivos de pruebas. Los resultados unitarios de esta etapa respaldan parcialmente reglas de acceso y validación (por ejemplo, RF-001, RNF-001 y RNF-002), cálculos OMS (RF-010), estado vacunal (RF-015), alertas (RF-016) y QR (RF-020). La validación de artefactos contribuye a RF-010 y RF-013; el build y los gates estáticos aportan evidencia a RNF-009 y RNF-010. Esta relación es por **alcance de las pruebas** identificado en los archivos, no una declaración de aprobación íntegra de cada CA.

Los CA que exigen persistencia real, interfaz navegada, entrega externa, TLS, instalación física o aceptación institucional siguen sin evidencia de ejecución en esta etapa. RF-002 y RF-003 continúan pendientes y RF-024 parcial según el [catálogo funcional](../requisitos/requisitos-funcionales.md); la ejecución de pruebas unitarias no cambia esos estados.

## 12. Pruebas pendientes y limitaciones

Quedan por ejecutar integración y E2E únicamente después de verificar una base y un proyecto Auth de prueba aislados, así como las pruebas de proveedor y de operación autorizada en el entorno correspondiente. Debe investigarse la terminación anómala de `openapi:validate` en Windows y contrastarse con CI antes de afirmar ese gate como aprobado. Las propiedades dependientes de infraestructura, entre ellas TLS publicado, RLS efectivo de tablas posteriores, instalación Android/iOS, recepción real de Resend/Telegram y disponibilidad, requieren evidencia adicional. El [catálogo no funcional](../requisitos/requisitos-no-funcionales.md) distingue expresamente esos estados de la mera presencia de código.

No se ejecutaron migraciones, seeds, importaciones, campañas, cron ni despliegues; tampoco se emplearon datos clínicos reales. Este límite reduce riesgo sobre datos, aunque deja sin observar el comportamiento conectado de la aplicación durante la etapa.

## 13. Conclusión del proceso de verificación

Las comprobaciones seguras disponibles aportaron evidencia favorable de calidad estática, compilación, esquema, referencias OMS/MSPAS y 305 pruebas unitarias. La validación OpenAPI no puede declararse aprobada por su salida anómala, y los flujos con base de datos, navegador o proveedores permanecen no ejecutados localmente. El estado resultante es una verificación técnica parcial y trazable, no una certificación clínica ni una validación operativa o institucional de SCCVI.
