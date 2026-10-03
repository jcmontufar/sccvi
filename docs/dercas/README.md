# DERCAS — fuentes técnicas de SCCVI

Esta carpeta prepara los insumos del DERCAS. La etapa 1 contiene un [inventario técnico](inventario-tecnico.md) basado en el código y la configuración versionados; **no contiene diagramas nuevos**. El punto de partida fue `main` en el commit `b9df02a` (3 de octubre de 2026). El inventario describe ese estado del repositorio, no una comprobación del entorno desplegado.

## Organización prevista

| Carpeta | Entregable futuro |
| --- | --- |
| `diagramas/casos-de-uso/` | Actores, permisos y casos de uso |
| `diagramas/actividades/` | Flujos de operación |
| `diagramas/secuencia/` | Interacciones entre presentación, servicios y proveedores |
| `diagramas/estados/` | Ciclos de vida persistidos y derivados |
| `diagramas/entidad-relacion/` | Modelo físico y cardinalidades |
| `diagramas/arquitectura/` | Componentes y despliegue |
| `evidencias/` | Evidencias aprobadas para el documento final |

Los directorios vacíos contienen `.gitkeep`. La documentación UML anterior permanece en `docs/uml/`; no se trasladó ni se asumió que represente automáticamente la versión actual. Referencias: `docs/uml/README.md`, `prisma/schema.prisma`, `src/app/`, `.github/workflows/`.

## Uso del inventario

1. Seguir las rutas de código indicadas en cada apartado y confirmar su vigencia antes de dibujar.
2. Representar por separado reglas implementadas, modelos persistidos y capacidades aún pendientes.
3. Resolver los puntos marcados **Pendiente de verificar** antes de presentarlos como comportamiento del entorno o control de seguridad demostrado.
4. No incorporar credenciales, datos reales de pacientes, capturas privadas ni valores de variables de entorno a `evidencias/`.

Fuentes normativas y de diseño: `AGENTS.md`, `docs/requirements.md`, `docs/business-rules.md`, `docs/architecture.md`, `docs/database.md`, `docs/backlog.md`, `docs/api/openapi.yaml`.
