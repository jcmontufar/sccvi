# Criterios de aceptación verificables

Cada `CA` está asociado a exactamente un requisito. Son condiciones de aceptación para revisión futura: la existencia de una prueba automatizada no implica que se haya ejecutado en esta etapa, y los criterios operativos no se declaran cumplidos sin evidencia del entorno.

| CA | Requisito | Condición verificable |
| --- | --- | --- |
| CA-001 | RF-001 | Dada una sesión ausente o perfil SCCVI inactivo, una ruta/acción privada deniega acceso; con perfil activo resuelve el rol vigente. |
| CA-002 | RF-002 | Desde el inicio de sesión, el usuario puede iniciar y completar recuperación de cuenta mediante un flujo documentado y probado. |
| CA-003 | RF-003 | ADMIN puede crear, consultar, editar rol/datos permitidos y desactivar un `User`; otro rol no puede hacerlo y existe auditoría de cambios críticos. |
| CA-004 | RF-004 | ADMIN ve/activa centros; CENTER_MANAGER solo edita el propio; un identificador de otro centro se rechaza. |
| CA-005 | RF-005 | ADMIN/CENTER_MANAGER crean, consultan, filtran, editan y desactivan comunidades de su alcance; un centro ajeno se deniega. |
| CA-006 | RF-006 | Personal autorizado registra y edita tutor y canal preferido; la desactivación preserva vínculos e historial; un centro ajeno se deniega. |
| CA-007 | RF-007 | Personal autorizado registra/edita/desactiva niño; al desactivar, mediciones y vacunas previas siguen consultables según permisos. |
| CA-008 | RF-008 | Se guarda una asociación niño–tutor con tipo/primario; repetir el mismo par no genera duplicado y un tutor no asociado no adquiere acceso. |
| CA-009 | RF-009 | Medición válida genera `GrowthRecord` y auditoría; entrada inválida o fallo de auditoría revierte la transacción; corrección mantiene trazabilidad. |
| CA-010 | RF-010 | Para edad/sexo cubiertos hay evaluaciones OMS de peso y talla con estándar/version; falta de referencia impide afirmar resultado y la UI no declara diagnóstico. |
| CA-011 | RF-011 | El formulario sugiere fecha por edad, permite cambiarla/omitirla y una medición posterior completa el seguimiento existente. |
| CA-012 | RF-012 | ADMIN crea/edita/desactiva vacuna; personal de salud solo consulta; historial que la referencia permanece. |
| CA-013 | RF-013 | Un import repetido de la versión MSPAS mantiene la misma identidad y dosis sin duplicados; cada dosis apunta a versión aprobada. |
| CA-014 | RF-014 | Dosis/fecha válidas generan una `Vaccination` y auditoría; segundo registro niño+dosis o fecha futura se rechaza sin alterar el primero. |
| CA-015 | RF-015 | Casos antes/en/después de fecha programada y con aplicación muestran estado correcto; dosis históricamente inaplicable no queda `OVERDUE`. |
| CA-016 | RF-016 | Una medición elegible genera alerta de crecimiento; cron autenticado genera solo seguimientos/dosis vencidos aplicables, sin duplicar por fuente ni crear por `PENDING`. |
| CA-017 | RF-017 | Una alerta `OPEN` puede revisarse y luego resolverse por rol/centro autorizado; transición inválida o ID ajeno se rechaza. |
| CA-018 | RF-018 | Tutor EMAIL elegible usa Resend y TELEGRAM vinculado usa Bot API, nunca ambos; inelegible no envía; claim duplicado no reenvía; éxito/fallo persisten estado correspondiente. |
| CA-019 | RF-019 | Borrador materializa destinatarios únicos filtrados y autorizados; un envío cambia a `PROCESSING` una sola vez y termina con estados por destinatario. |
| CA-020 | RF-020 | Token inválido/revocado/vencido o PIN incorrecto/bloqueado no revela tarjeta; acceso válido muestra solo campos aprobados; revocación impide acceso posterior. |
| CA-021 | RF-021 | Cada rol ve solo sus métricas autorizadas; los conteos coinciden con datos recuperados sin valores simulados. |
| CA-022 | RF-022 | Período, corte y filtros de alcance producen conteos consistentes; otro centro no aparece y registros se distinguen de niños únicos. |
| CA-023 | RF-023 | Un reporte autorizado conserva filtros y filas en pantalla/PDF/Excel; un rol o centro ajeno no descarga información. |
| CA-024 | RF-024 | Toda operación crítica enumerada en el alcance aprobado crea evento saneado; si la escritura de auditoría transaccional falla, la mutación se revierte. |
| CA-025 | RF-025 | Los dos endpoints `/api/v1/reports/*` aplican sesión/filtros/alcance y coinciden con `docs/api/openapi.yaml`. |
| CA-026 | RF-026 | Manifest ofrece instalación donde el navegador lo soporta; sin red aparece fallback y ninguna escritura clínica ni lectura cacheada de datos privados funciona offline. |
| CA-027 | RNF-001 | Cambiar `childId`, `guardianId` o centro a un recurso no autorizado produce denegación del servidor aun si la UI muestra un enlace. |
| CA-028 | RNF-002 | Datos malformados de formulario/ruta/filtro se rechazan en servidor con error seguro, sin stack trace ni secreto. |
| CA-029 | RNF-003 | Un escaneo del diff y archivos versionados no encuentra valores reales de claves/contraseñas; proveedor/DB solo reciben configuración del servidor. |
| CA-030 | RNF-004 | Una comprobación autorizada del hostname publicado demuestra HTTPS válido y redirección/bloqueo de HTTP inseguro antes de afirmarlo cumplido. |
| CA-031 | RNF-005 | Prueba de conteo de consultas de reporte/analítica demuestra cargas masivas o paginadas y ausencia de crecimiento lineal por niño; la segmentación de campaña también debe superarlo. |
| CA-032 | RNF-006 | E2E de escritorio y móvil permite navegación/lectura/acción principal sin overflow ni controles inaccesibles, con textos visibles en español. |
| CA-033 | RNF-007 | En dispositivos autorizados Android e iOS compatibles se verifica instalación, iconos, nombre y apertura standalone; sin dicha prueba queda no verificado. |
| CA-034 | RNF-008 | Sin conexión se sirve `offline.html`; Cache Storage no contiene `/api`, RSC, páginas autenticadas ni datos de niños, y un POST no se intercepta. |
| CA-035 | RNF-009 | `strict` continúa activo y `npm run typecheck` pasa; reglas médicas permanecen en servicios/módulos y no solo en componentes React. |
| CA-036 | RNF-010 | CI ejecuta unitarias/gates pertinentes y la infraestructura aislada exige identidad de DB antes de integración/E2E destructivo. |
| CA-037 | RNF-011 | Tarjeta y mensajes carecen de contactos/diagnósticos innecesarios; una revisión autorizada demuestra permisos reales de tablas, incluidas las Telegram. |
| CA-038 | RN-001 | Un usuario de centro A no lee/escribe recurso de B; GUARDIAN con niño no vinculado recibe denegación aunque altere ID en URL. |
| CA-039 | RN-002 | Niño/tutor se relacionan con comunidad existente y la segunda inserción del mismo par `ChildGuardian` falla o no duplica. |
| CA-040 | RN-003 | En borde UTC donde Guatemala sigue en día anterior se rechaza una fecha local futura; edad de medición histórica no depende del día de consulta. |
| CA-041 | RN-004 | El valor original de `GrowthRecord` se conserva al recalcular evaluación; referencia faltante falla cerrada y `classification` no se inventa. |
| CA-042 | RN-005 | Fecha sugerida corresponde a tramo etario, puede omitirse; solo un seguimiento persistido, incompleto y con `dueDate` anterior al día local genera alerta. |
| CA-043 | RN-006 | Niño con oportunidad anterior a `effectiveFrom` no recibe `OVERDUE` actual ni alerta falsa; aplicación histórica permanece factual. |
| CA-044 | RN-007 | Fecha antes de nacimiento/futura, dosis inactiva/no versionada, niño inactivo o par duplicado se rechazan en servidor. |
| CA-045 | RN-008 | Solo `<P5`, `>P95`, seguimiento efectivamente vencido o dosis `OVERDUE` aplicable generan alerta preventiva; no se usa lenguaje diagnóstico. |
| CA-046 | RN-009 | `OPEN → REVIEWED → RESOLVED` se acepta con auditoría; `OPEN → RESOLVED` y reapertura se rechazan. |
| CA-047 | RN-010 | Para cada tutor hay un único canal elegible; un segundo despachador no obtiene claim; fallo queda `FAILED`, no `SENT`. |
| CA-048 | RN-011 | Token bruto no se persiste; credencial revocada/vencida y PIN bloqueado se rechazan, y la tarjeta no incluye contactos o notas. |
| CA-049 | RN-012 | Por dosis/comunidad, `0/0` se presenta `N/A`, `0/1` como `0 %` y `1/1` como `100 %`, sin sumar denominadores incompatibles. |
