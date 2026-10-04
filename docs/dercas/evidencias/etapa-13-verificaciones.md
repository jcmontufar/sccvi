# Evidencia de verificaciones locales — DERCAS, etapa 13

**Fecha de ejecución:** 2026-10-04. **Base:** `main` en `ad9c1c5` (PR #53 fusionada). **Rama documental:** `docs/dercas-pruebas-validacion`. Las comprobaciones se ejecutaron localmente en Windows; este registro resume la salida sin conservar credenciales, datos personales ni logs completos. No se modificó la aplicación ni se accedió a una base de datos para ejecutar pruebas.

| Comando | Resultado observado | Alcance y límite |
| --- | --- | --- |
| `npm run lint` | Aprobado; código de salida 0. | ESLint sobre el repositorio; no prueba operación en navegador. |
| `npm run format:check` | Aprobado; Prettier indicó que todos los archivos coincidían, código 0. | Comprobación previa a la redacción de los nuevos documentos; se repite al final. |
| `npm run typecheck` | Aprobado; Next.js generó tipos de rutas y `tsc --noEmit` terminó con código 0. | Análisis estático, sin base de datos. |
| `npm run test` | Aprobado; **71 archivos y 305 pruebas** Vitest, código 0. | Suite unitaria configurada; no equivale a integración ni E2E. |
| `npm run build` | Aprobado; Next.js compiló, comprobó TypeScript y completó el paso de generación de páginas (26/26), código 0. | El proceso indicó que cargó `.env.local` sin mostrar valores. No se ejecutaron migraciones ni se verificó un despliegue. |
| `npm run prisma:validate` | Aprobado; esquema Prisma válido, código 0. | Valida el esquema local; no comprueba el estado de una base remota. |
| `npm run who:validate` | Aprobado; **7 428 filas** OMS validadas, código 0. | Modo `--validate-only`: archivos locales y hash; no importa datos. |
| `npm run vaccination:validate` | Aprobado; **21 dosis**, versión `GT-MSPAS-2026-01-12`, código 0. | Modo `--validate-only`: artefacto local y hash; no importa datos. El script cargó variables de entorno sin imprimir sus valores. |
| `npm run openapi:validate` | **Falló el comando**, código 1. Redocly informó que `docs/api/openapi.yaml` era válido y, a continuación, Node/libuv emitió `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94`. | La sintaxis de la descripción fue aceptada, pero no se acredita un gate aprobado por la terminación anómala en este host. Causa específica no determinada; requiere reproducción/diagnóstico separado, preferentemente en CI. |

## Comprobaciones deliberadamente no ejecutadas

`npm run test:integration`, `npm run test:e2e`, `npm run test:pwa` y `npm run test:staging-smoke` **no se ejecutaron**: en esta etapa no se verificó positivamente la identidad persistida de una base de pruebas aislada ni el resto de condiciones de los entornos respectivos. La presencia de `.env.local` no acredita aislamiento. Tampoco se ejecutaron migraciones, importaciones, seeds, cron, pruebas de entrega real por proveedores ni despliegues.

Los archivos [`docs/testing.md`](../../testing.md), [`vitest.integration.config.mts`](../../../vitest.integration.config.mts), [`playwright.config.ts`](../../../playwright.config.ts) y los [workflows de CI](../../../.github/workflows/) documentan las guardas y la ejecución automatizada posible en otros entornos. Su existencia **no es evidencia de que esas suites se ejecutaran durante esta etapa**.
