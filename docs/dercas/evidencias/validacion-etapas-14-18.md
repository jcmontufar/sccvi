# Verificación documental de las etapas 14–18

Fecha de elaboración: 2026-10-04. Rama: `docs/dercas-entrega-final`. Se comprobó previamente que la PR #54 estaba fusionada en `main`; no se modificaron código funcional, base de datos ni despliegues.

| Comprobación | Resultado y alcance |
| --- | --- |
| Fuentes | Nueve capítulos presentes; capítulos VIII y IX redactados para este lote. La rúbrica y la plantilla universitaria no estaban disponibles. |
| DOCX | Generación completada con `generar-dercas.py`: nueve capítulos, 27 imágenes de diagramas, 11 tablas y tres campos de índice. |
| PDF | Exportación desde Microsoft Word completada; 107 páginas. El conversor LibreOffice de `render_docx.py` no estaba instalado, por lo que no se usó ese flujo. |
| Estructura y enlaces | `validar-dercas.py` aprobó 27 SVG, 42 términos de glosario y 533 enlaces locales existentes en las fuentes revisadas. No se verificó en línea la vigencia de los URL externos. |
| Figuras | Las 27 figuras, su numeración y sus notas de fuente aparecen en el PDF; los diagramas ER conservaron etiquetas al rasterizarse con Chromium. La figura ER general es densa y debe ampliarse o consultarse en el SVG original. |
| Paginación | Los capítulos comienzan en las páginas 14, 22, 29, 37, 47, 56, 64, 70 y 75. En esos inicios el número aparece solo en el pie y en la página siguiente solo en el encabezado, comprobado con extracción de posiciones del PDF. |
| Revisión visual | Se inspeccionaron láminas de contacto de las 107 páginas y páginas clave en alta resolución. No se observaron páginas vacías inesperadas, imágenes cortadas ni tablas desbordadas en esa inspección. No equivale a una revisión editorial a tamaño completo de cada página. |
| Alcance académico | Los resultados técnicos de los capítulos anteriores se describen como evidencia documentada, no como adopción oficial o validación clínica. Persisten marcadores de institución, estudiante, asesor, lugar y fecha. |

`npm run format:check` aprobó la revisión de estilo. Los comandos funcionales de SCCVI, las migraciones y las pruebas con bases de datos no se ejecutaron porque este lote es exclusivamente documental.
