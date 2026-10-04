# Capítulo 9. Conclusiones y recomendaciones

## 1. Conclusiones generales

El DERCAS reúne una especificación trazable del Sistema de Control de Crecimiento y Vacunación Infantil. Los [requisitos](../requisitos/README.md), la [matriz](../requisitos/matriz-trazabilidad.md), los [diagramas](../diagramas/) y los capítulos de diseño, implementación y pruebas permiten seguir cada capacidad desde su formulación hasta evidencia de código o una limitación explícita. El sistema vigente se organiza como monolito modular; separa la identidad de Supabase Auth del perfil SCCVI, y distingue mediciones y vacunaciones factuales de evaluaciones derivadas. Estas son conclusiones documentales y técnicas, no resultados de impacto sanitario o implantación institucional.

La versión actual incluye módulos de gestión territorial, niños, tutores, crecimiento, vacunación, alertas, notificaciones, campañas, carné QR, reportes y analítica. Las referencias OMS y el esquema rutinario MSPAS son versionados y verificables; la protección de datos se apoya en autorización de servidor, límites por centro y vínculo niño–tutor, credenciales QR opacas y controles de auditoría. Los [capítulos V](05-diseno-arquitectura.md) y [VI](06-implementacion.md) respaldan estas afirmaciones. La existencia del software no permite concluir que un niño esté diagnosticado, que un mensaje haya sido recibido o que el sistema esté autorizado para atender datos reales en una institución.

## 2. Cumplimiento documentado de los objetivos del DERCAS

El [objetivo general y los específicos](01-generalidades.md) se materializan documentalmente mediante el catálogo de 26 RF, 11 RNF, 12 RN y 49 CA; el modelado de actores, entidades y flujos; la explicación de arquitectura e implementación; y un registro explícito de pruebas seguras. Los [27 diagramas](../diagramas/) permiten contrastar estructura y comportamiento sin sustituir al código. El [capítulo VII](07-pruebas-validacion.md) informa 305 pruebas unitarias aprobadas y validaciones de artefactos OMS/MSPAS, pero también señala integración y E2E no ejecutados en esa etapa y un comando OpenAPI que terminó con fallo de proceso. Por tanto, el objetivo de **documentar y hacer verificable** el alcance se cumple en la medida de las fuentes disponibles; no se confunde con la aceptación integral de todos los criterios o con la operación clínica validada.

## 3. Limitaciones de las conclusiones

No se encontró una rúbrica universitaria ni el documento académico original dentro del repositorio. Los datos de autoría, institución, programa y asesoría deberán incorporarse por sus responsables. La ausencia de entrevistas, cifras poblacionales, presupuestos, evaluación jurídica y validación clínica impide afirmar beneficios medidos, rentabilidad, cumplimiento normativo o adopción oficial. La [factibilidad](02-estudio-factibilidad.md) y el [despliegue](08-despliegue-continuidad.md) identifican estas condiciones pendientes sin inventar resultados.

En el producto continúan pendientes la recuperación de cuenta y el CRUD de usuarios; la auditoría original es parcial. También requieren comprobación la instalación física de la PWA, el estado efectivo de privilegios de todas las tablas, la recepción real de Resend/Telegram, la restauración de respaldos y el rendimiento bajo carga institucional. No se implementan clasificación clínica automática, equivalencias vacunales no aprobadas, WhatsApp ni trabajo clínico offline. La [matriz de trazabilidad](../requisitos/matriz-trazabilidad.md) permite revisar cada brecha sin atribuirle una prueba inexistente.

## 4. Recomendaciones priorizadas

1. **Resolver seguridad y operación antes de usar datos reales.** Completar una revisión jurídica y de privacidad, confirmar permisos y aislamiento de la base, ensayar respaldos y restauración, definir responsables y verificar TLS, proveedores y webhooks con evidencia saneada. La prioridad responde a la sensibilidad de los datos infantiles y a los estados RNF parciales o no verificados.
2. **Cerrar brechas funcionales y de trazabilidad.** Diseñar y probar recuperación de cuenta, administración de usuarios y cobertura de auditoría pendiente, con controles de centro y rol. Estos cambios deben actualizar RF-002, RF-003, RF-024 y sus CA sin asumir que Supabase Auth proporciona por sí solo la interfaz o las autorizaciones de SCCVI.
3. **Completar verificación conectada y evaluación de rendimiento.** Ejecutar integración y E2E únicamente en entornos aislados con identidad positiva; caracterizar el fallo local de `openapi:validate`; medir consultas y segmentación de campañas con volúmenes representativos ficticios. No debe ocultarse una puerta de calidad fallida.
4. **Obtener revisión sanitaria e institucional formal.** Revisar referencias OMS/MSPAS, cohortes y lenguaje preventivo con autoridades competentes; probar los flujos con usuarios autorizados y acordar procedimientos de capacitación y respuesta a alertas. Ninguna prueba de software sustituye la aprobación clínica o la aceptación de un centro de salud.
5. **Mantener el DERCAS sincronizado.** Actualizar requisitos, diagramas, ADR, pruebas y capítulos cuando cambie el código, conservando la separación entre función implementada, prueba automatizada y validación operativa.

## 5. Cierre

El DERCAS ofrece una base académica y técnica para examinar SCCVI con afirmaciones verificables y límites visibles. Su mayor utilidad reside en permitir que una decisión futura de adopción se apoye en evidencia adicional, no en la apariencia de completitud del software. Las recomendaciones anteriores deben cerrarse mediante responsables y resultados comprobables antes de presentar SCCVI como un servicio sanitario institucional operativo.
