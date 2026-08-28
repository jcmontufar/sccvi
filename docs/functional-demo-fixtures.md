# Datos ficticios para pruebas funcionales

Este mecanismo carga datos identificables y reproducibles exclusivamente en una base SCCVI de desarrollo o de pruebas aislada. No usa `prisma:seed`, no modifica las referencias WHO/MSPAS y no altera datos manuales existentes.

La verificación usa de forma determinista el **28 de agosto de 2026** en la zona de negocio `America/Guatemala`. La interfaz evaluada en otra fecha conserva las reglas clínicas normales de la aplicación.

## Protección del destino

El proceso falla antes de cualquier escritura si no demuestra la identidad persistida de la base conectada. `SCCVI_DEMO_FIXTURES_CONFIRMED` por sí sola nunca es suficiente. Los destinos `STAGING` y `PRODUCTION` están prohibidos.

Para una base de pruebas aislada use `SCCVI_DEMO_TARGET=ISOLATED_TEST`. Se reutilizan el marcador persistido `ISOLATED_TEST`, `TEST_DATABASE_ID`, `TEST_DATABASE_URL` y la confirmación de prueba documentados en [testing.md](testing.md).

Para desarrollo, un administrador debe confirmar primero que está conectado a la base SCCVI de desarrollo y crear manualmente un marcador independiente:

```sql
CREATE TABLE public.sccvi_development_database_identity (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  environment text NOT NULL CHECK (environment = 'DEVELOPMENT'),
  identity uuid NOT NULL UNIQUE
);

INSERT INTO public.sccvi_development_database_identity
  (singleton, environment, identity)
VALUES
  (true, 'DEVELOPMENT', '<UUID generado exclusivamente para esta base>');

REVOKE ALL ON public.sccvi_development_database_identity FROM anon, authenticated;
```

Configure en `.env.local`, sin versionar valores reales:

```text
SCCVI_DEMO_TARGET=DEVELOPMENT
SCCVI_DEMO_FIXTURES_CONFIRMED=functional-fictional-data-only
SCCVI_DEVELOPMENT_DATABASE_ID=<el mismo UUID persistido>
SCCVI_DEMO_HEALTH_CENTER_ID=<UUID opcional de un centro activo>
```

El proceso nunca crea el marcador automáticamente. Si falta, no coincide o no puede leerse, falla de forma cerrada.

## Casos reproducibles

Todos los nombres comienzan con `[DEMO FUNCIONAL]`, los identificadores son fijos y las notas médicas creadas incluyen `SCCVI_FUNCTIONAL_DEMO_V1`.

| Caso | Fecha de nacimiento | Fundamento esperado al 2026-08-28 |
| --- | --- | --- |
| Ana Crecimiento Normal | 2026-01-15 | Medición construida con la mediana WHO; percentil entre P5 y P95, sin alerta. |
| Bruno Peso Bajo | 2026-01-15 | Peso/edad menor de P5 y alerta preventiva no diagnóstica. |
| Camila Peso Alto | 2026-01-15 | Peso/edad mayor de P95 y alerta preventiva no diagnóstica. |
| Diego Hexavalente Atrasada | 2026-02-01 | `HEXAVALENT_1` tiene fecha objetivo 2026-04-01, posterior a `effectiveFrom`; sin aplicación resulta `OVERDUE`. |
| Elena Cobertura Cero | 2025-01-12 | `VARICELLA_1` tiene fecha objetivo 2026-04-12, posterior a `effectiveFrom`; es elegible, no aplicada y produce 0/1 · 0 %. |
| Fabio Vacunas Aplicadas | 2025-01-12 | Aplicaciones factuales de `MMR_1` en el límite 2026-01-12 y `VARICELLA_1` el 2026-04-12; cobertura 1/1 · 100 %. |
| Gabriela Seguimiento Vencido | 2026-01-15 | Seguimiento abierto con vencimiento 2026-07-01 y alerta preventiva. |

Los niños se distribuyen entre dos comunidades ficticias del mismo centro y tienen tutores ficticios asociados. No se implementa catch-up ni equivalencia entre vacunas.

## Comandos

```bash
npm run demo:fixtures
npm run demo:fixtures:verify
npm run demo:fixtures:clean
```

`demo:fixtures` es idempotente: valida que cualquier fila con sus identificadores fijos le pertenece, elimina únicamente el conjunto anterior y lo recrea dentro de una transacción. `demo:fixtures:verify` recalcula los estados con los motores centrales de crecimiento, vacunación y cobertura. `demo:fixtures:clean` vuelve a verificar la identidad de la base y la propiedad de cada identificador antes de eliminar solo las filas del fixture; una colisión o duda cancela toda la transacción.
