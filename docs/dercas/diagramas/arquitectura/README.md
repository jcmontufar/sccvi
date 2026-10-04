# Arquitectura de SCCVI — DERCAS

Estos diagramas representan el código y la configuración de `main` en `1783eb9` al iniciar la etapa 3. Las fuentes `.puml` son editables; los `.svg` son exportaciones de PlantUML. No son evidencia de que servicios externos o entornos remotos estén disponibles en este momento.

| Diagrama | Propósito | Fuentes principales |
| --- | --- | --- |
| [Arquitectura lógica](arquitectura-logica.puml) · [SVG](arquitectura-logica.svg) | Capas conceptuales y flujo entre presentación, entradas de servidor, seguridad, módulos, Prisma y proveedores. Todos los módulos dentro del contorno SCCVI pertenecen al mismo monolito Next.js. | `docs/dercas/inventario-tecnico.md`, `docs/architecture.md`, `src/app/`, `src/modules/`, `src/lib/prisma.ts`, `src/lib/supabase/`, `src/modules/auth/`, `src/modules/notifications/`, `prisma/schema.prisma`, `package.json` |
| [Arquitectura de despliegue](arquitectura-despliegue.puml) · [SVG](arquitectura-despliegue.svg) | Topología de **STAGING aislado configurada en Git**: navegadores, proyecto Vercel, Supabase Auth/PostgreSQL, GitHub Actions, pruebas aisladas, proveedores y cron. No representa producción. | `.github/workflows/ci.yml`, `.github/workflows/isolated-e2e.yml`, `.github/workflows/staging.yml`, `vercel.json`, `docs/staging.md`, `src/app/api/internal/alerts/overdue/route.ts`, `src/app/api/integrations/` |

También se revisaron `docs/uml/component-architecture.md` y `docs/uml/deployment-architecture.md`. Cuando su descripción conceptual difiere del código vigente —por ejemplo, Telegram presentado como futuro— prevalecen los proveedores y handlers implementados en `src/modules/notifications/` y `src/app/api/integrations/`. No se muestran WhatsApp ni un CRUD de usuarios inexistente. Las flechas hacia Resend y Telegram indican integraciones implementadas en código, **no** entregas reales verificadas. Los Route Handlers de cron y webhooks aplican sus propias verificaciones de secretos; la sesión/RBAC se aplica a las rutas que lo requieren.

## Exportación y validación

Si se dispone de Java y del JAR oficial de PlantUML, desde la raíz del repositorio:

```powershell
java -jar plantuml.jar -checkonly docs/dercas/diagramas/arquitectura/arquitectura-logica.puml docs/dercas/diagramas/arquitectura/arquitectura-despliegue.puml
java -jar plantuml.jar -tsvg docs/dercas/diagramas/arquitectura/arquitectura-logica.puml docs/dercas/diagramas/arquitectura/arquitectura-despliegue.puml
```

En el equipo de esta etapa no estaban instalados `plantuml` ni Java. Los SVG se generaron con el [servidor oficial de PlantUML](https://plantuml.com/server), enviando únicamente estas fuentes documentales públicas; se comprobó que el renderizador no devolvió un error de sintaxis y que ambos archivos son XML SVG válido. Esto valida la sintaxis de las fuentes procesadas, pero no reemplaza una comprobación local con JAR ni una inspección de la infraestructura desplegada. La [CLI oficial](https://plantuml.com/command-line) permite regenerar y comprobarlos localmente sin modificar dependencias de SCCVI.
