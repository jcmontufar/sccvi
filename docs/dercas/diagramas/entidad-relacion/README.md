# Diagramas entidad-relación — SCCVI

Fuentes: [`prisma/schema.prisma`](../../../../prisma/schema.prisma) (modelo físico vigente), [`docs/dercas/inventario-tecnico.md`](../../inventario-tecnico.md) (inventario de la etapa 1) y [`docs/uml/entity-relationship.md`](../../../uml/entity-relationship.md) (material previo revisado, no tomado como autoridad si difiere del esquema). Estos diagramas documentan la estructura de Prisma en `main` en `2ed3891` al iniciar esta etapa; no verifican por sí mismos el estado de una base de datos desplegada. No contienen datos de pacientes.

| Fuente Mermaid | Alcance |
| --- | --- |
| [`general.mmd`](general.mmd) | Los 22 modelos y todas las relaciones declaradas con claves foráneas en Prisma. |
| [`organizacion-y-personas.mmd`](organizacion-y-personas.mmd) | Centros, usuarios, comunidades, tutores, niños y asociación niño–tutor. |
| [`crecimiento-y-seguimiento.mmd`](crecimiento-y-seguimiento.mmd) | Mediciones, evaluaciones, referencias OMS y seguimiento. |
| [`vacunacion.mmd`](vacunacion.mmd) | Catálogo, versiones, dosis programadas y aplicaciones históricas. |
| [`alertas-comunicaciones.mmd`](alertas-comunicaciones.mmd) | Alertas, notificaciones, Telegram y campañas. |
| [`qr-y-auditoria.mmd`](qr-y-auditoria.mmd) | Credenciales de tarjeta digital y eventos de auditoría. |

Cada `.svg` homónimo, cuando está disponible, es una exportación del `.mmd`; **el Mermaid es la fuente editable**. Los modelos repetidos entre vistas son contexto, no tablas adicionales.

## Convenciones

- `PK` marca la clave primaria y `FK` una columna de clave foránea. Los tipos se simplifican (`uuid`, `date`, `datetime`, `decimal`, etc.); para precisión, índices y valores predeterminados, consultar `prisma/schema.prisma`.
- La pata de cuervo expresa cardinalidad de filas: `||` = exactamente una, `o|` = cero o una, `o{` = cero o muchas. Una FK obligatoria usa `||` del lado padre; una nullable usa `o|`. La unicidad de `Guardian.userId`, `GuardianTelegramConnection.guardianId` y `GrowthFollowUp.sourceGrowthRecordId` limita el lado dependiente a `o|`.
- Mermaid ER no indica aquí nulabilidad de cada atributo ni todas las restricciones `@@unique`; esas propiedades se consultan en Prisma. Las vistas incluyen atributos relevantes y todas las FK de sus modelos centrales, aunque omiten algunas entidades externas al dominio; no sustituyen el esquema completo.
- `GrowthReference` no tiene FK con `GrowthAssessment`: la selección de parámetros OMS se hace por estándar, versión, sexo, indicador y edad. `AuditLog.entityType/entityId` tampoco constituyen FK polimórfica. `User.authUserId` refiere a Supabase Auth, fuera de los 22 modelos Prisma. Por ello no se dibujan aristas para esos vínculos lógicos.
- Una FK nullable en `Notification` no significa que una notificación deba tener simultáneamente tutor, alerta y destinatario de campaña; el diagrama muestra relaciones físicas, no reglas condicionales de aplicación. Los estados de vacunación son derivados, no otra entidad persistida.

## Visualización y exportación

Abrir los `.mmd` en un visor/editor compatible con Mermaid. Para regenerar SVG sin modificar `package.json` ni instalar dependencias globales, usar la CLI oficial en ejecución temporal mediante npm:

```powershell
npx --yes --package @mermaid-js/mermaid-cli@12.0.0 mmdc -i docs/dercas/diagramas/entidad-relacion/general.mmd -o docs/dercas/diagramas/entidad-relacion/general.svg
```

Repetir cambiando el nombre base para las otras cinco vistas. La CLI usa un navegador headless y necesita acceso a su paquete y a Chromium. En este equipo el Chromium incluido falló al iniciar por un error de ICU; se exportó con Chrome local mediante `PUPPETEER_EXECUTABLE_PATH`:

```powershell
$env:PUPPETEER_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
```

En otros equipos, usar la ruta del navegador compatible instalado o dejar que la CLI use el suyo. Si no hay navegador disponible, los `.mmd` siguen siendo la fuente verificable. Véase [Mermaid CLI oficial](https://github.com/mermaid-js/mermaid-cli#usage).
