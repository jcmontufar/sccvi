# Entrega documental del DERCAS

La entrega integra los nueve capítulos en [SCCVI-DERCAS.docx](SCCVI-DERCAS.docx) y su exportación [SCCVI-DERCAS.pdf](SCCVI-DERCAS.pdf). Las fuentes editables permanecen en `../capitulos/`, `../requisitos/` y `../diagramas/`. Los elementos preliminares, el glosario, las referencias y el inventario de anexos se conservan en esta carpeta. Ninguno de estos documentos acredita adopción institucional ni validación clínica.

## Composición verificada

- Nueve capítulos, 27 figuras basadas en los SVG versionados, 11 tablas y 42 términos de glosario.
- Tres índices automáticos en Word: general, de tablas y de figuras. Los campos se actualizaron antes de exportar el PDF.
- 107 páginas en el PDF generado. La primera página de cada capítulo lleva número solamente en el pie; las siguientes lo llevan solamente en el encabezado.
- Seis diagramas entidad–relación se presentan en páginas de formato ampliado; los otros 21 diagramas usan páginas horizontales. Cada figura incluye un enlace a su SVG original para ampliar los detalles.

## Regeneración

`generar-dercas.py` ensambla el DOCX a partir de las fuentes Markdown y los SVG. Requiere un intérprete Python con `python-docx` y Pillow, Node.js con `sharp` y Playwright, y un navegador Chromium disponible. Los ejecutables se indican como argumentos (`--node`, `--node-modules`, `--chrome`); no se agregaron dependencias a SCCVI. Tras generarlo, se deben actualizar los campos de índice en un procesador Word compatible, guardar el DOCX y exportar el PDF. `validar-dercas.py` comprueba la estructura, los enlaces locales y la presencia de los anexos; con `--contact-sheets DIR` crea láminas para la revisión visual del PDF.

La exportación con LibreOffice no estuvo disponible en el entorno de elaboración; se utilizó Microsoft Word para actualizar los campos y producir el PDF. Por ello, otra herramienta de conversión podría alterar saltos, índices o paginación y exigir una nueva revisión visual. La rúbrica y la plantilla universitaria no estaban disponibles: deben confirmarse antes de presentar el documento. También deben completarse los marcadores de portada y de responsabilidad académica.

La evidencia de las verificaciones realizadas se registra en [validacion-etapas-14-18.md](../evidencias/validacion-etapas-14-18.md).
