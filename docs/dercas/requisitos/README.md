# Especificación verificable de SCCVI — DERCAS

**Corte documental:** `main` en `bd453a7`. Este catálogo reconcilia el alcance declarado con el comportamiento versionado; no certifica una instalación desplegada. El único documento de requisitos del proyecto encontrado en el repositorio es `docs/requirements.md`. No se encontró un documento académico original adicional (`.pdf`/`.docx`); si existe fuera del repositorio, debe aportarse antes de atribuirle requisitos.

## Método y fuentes

Se contrastaron `docs/requirements.md`, `docs/business-rules.md`, `docs/architecture.md`, `docs/database.md`, `docs/dercas/inventario-tecnico.md`, los [diagramas DERCAS](../diagramas/), `prisma/schema.prisma`, rutas de `src/app/`, servicios/acciones de `src/modules/`, pruebas de `src/**/*.test.ts`, `tests/integration/`, `tests/e2e/`, `package.json` y workflows de `.github/workflows/`. El código actual prevalece para describir la implementación; la documentación original se conserva como fuente de brechas, no como prueba de ejecución.

Los requisitos se agrupan en [funcionales](requisitos-funcionales.md) (`RF`), [no funcionales](requisitos-no-funcionales.md) (`RNF`) y [reglas de negocio](reglas-de-negocio.md) (`RN`). Los [criterios](criterios-de-aceptacion.md) usan `CA` y la [matriz](matriz-trazabilidad.md) conecta cada requisito con criterio, código, prueba y diagrama. Los identificadores son locales al DERCAS y no sustituyen `BR-` ni `TASK-` existentes.

## Lectura de estados y prioridades

- **implementado**: existe un camino de código que materializa el requisito; no significa que su operación remota se haya comprobado.
- **parcial**: existe implementación para parte del alcance, con una brecha concreta.
- **pendiente**: el requisito está documentado pero no se identificó un flujo implementado.
- **no verificado**: la propiedad depende de infraestructura, navegador o evidencia operativa ausente; el código/configuración no basta para afirmarla.
- **Alta**: protege datos, seguridad, integridad o semántica médica. **Media**: habilita una operación central o interoperabilidad. **Baja**: mejora complementaria sin bloquear la seguridad del núcleo. Cada fila indica la razón concreta.

Una prueba citada significa que **existe en el repositorio**, no que se ejecutó en esta etapa. Una validación operativa requiere evidencia saneada del entorno autorizado (por ejemplo, TLS, recepción real de Resend/Telegram, instalación móvil); aquí no se accedió a staging ni producción. No se inventan SLA, tasas de cobertura global, diagnósticos o equivalencias clínicas.

## Brechas y discrepancias a resolver

1. `docs/requirements.md` pide recuperación de cuenta y administración de usuarios; no se hallaron páginas/servicios específicos para esos flujos. Se catalogan como pendientes, sin asumir que Supabase Auth los ofrece automáticamente en la interfaz SCCVI.
2. La clasificación clínica derivada se menciona como posibilidad en `docs/requirements.md`, pero `src/modules/growth/services/growth-assessment-service.ts` guarda `classification: null`; no se afirma que exista clasificación automática aprobada.
3. `docs/architecture.md` aún describe Telegram como integración futura, mientras el código incluye proveedor, enlace y webhook. El catálogo describe el código y deja la entrega real como no verificada.
4. `CampaignStatus.SCHEDULED` existe en `prisma/schema.prisma`, pero `sendCampaign` solo reclama `DRAFT`; no se cataloga programación de campañas como implementada.
5. El inventario marca pendiente confirmar controles RLS/privilegios de las dos tablas Telegram agregadas después de la migración de endurecimiento. El catálogo no presume cifrado de campo ni una auditoría de privacidad completa.
6. PWA, analítica y Telegram tienen código vigente que excede la formulación inicial de `docs/requirements.md`; figuran como alcance derivado del repositorio y deben reconciliarse formalmente con el documento académico si este se aporta.
