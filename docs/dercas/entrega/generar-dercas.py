"""Assemble the versioned DERCAS Markdown and SVG sources into an editable DOCX.

This documentation-only tool does not connect to SCCVI services or databases.
Run it with the bundled Codex Python/Node runtimes and their package directory.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
import unicodedata
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from docx.opc.constants import RELATIONSHIP_TYPE as RT


ROOT = Path(__file__).resolve().parents[3]
DERCAS = ROOT / "docs" / "dercas"
CHAPTERS = DERCAS / "capitulos"
DELIVERY = DERCAS / "entrega"
REPO_URL = "https://github.com/jcmontufar/sccvi/blob/docs/dercas-entrega-final/"
INLINE = re.compile(r"\[([^]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`")


def field(paragraph, instruction: str) -> None:
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    code = OxmlElement("w:instrText")
    code.set(qn("xml:space"), "preserve")
    code.text = f" {instruction} "
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    display = OxmlElement("w:t")
    display.text = "1"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for element in (begin, code, separate, display, end):
        run._r.append(element)


def hyperlink(paragraph, label: str, target: str, source: Path) -> None:
    if not target.startswith(("http://", "https://")):
        resolved = (source.parent / target).resolve()
        try:
            relative = resolved.relative_to(ROOT).as_posix()
        except ValueError:
            paragraph.add_run(label)
            return
        target = REPO_URL + relative
    part = paragraph.part
    relation = part.relate_to(target, RT.HYPERLINK, is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), relation)
    run = OxmlElement("w:r")
    properties = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "07556D")
    properties.append(color)
    run.append(properties)
    text = OxmlElement("w:t")
    text.text = label.replace("`", "")
    run.append(text)
    link.append(run)
    paragraph._p.append(link)


def inline(paragraph, text: str, source: Path) -> None:
    cursor = 0
    for match in INLINE.finditer(text):
        if match.start() > cursor:
            paragraph.add_run(text[cursor : match.start()])
        if match.group(1) is not None:
            hyperlink(paragraph, match.group(1), match.group(2), source)
        elif match.group(3) is not None:
            paragraph.add_run(match.group(3)).bold = True
        else:
            paragraph.add_run(match.group(4))
        cursor = match.end()
    if cursor < len(text):
        paragraph.add_run(text[cursor:])


def border_cell(cell) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        tag = OxmlElement(f"w:{edge}")
        tag.set(qn("w:val"), "single")
        tag.set(qn("w:sz"), "4")
        tag.set(qn("w:color"), "D9D9D9")
        borders.append(tag)
    tc_pr.append(borders)


def shade_cell(cell, fill: str) -> None:
    shade = OxmlElement("w:shd")
    shade.set(qn("w:fill"), fill)
    cell._tc.get_or_add_tcPr().append(shade)


def caption(document, kind: str, title: str) -> None:
    paragraph = document.add_paragraph(style="Caption")
    paragraph.paragraph_format.keep_with_next = True
    paragraph.add_run(f"{kind} ")
    field(paragraph, f"SEQ {kind} \\* ARABIC")
    paragraph.add_run(f". {title}")


def add_table(document, rows: list[list[str]], source: Path, title: str) -> None:
    if len(rows) < 2:
        return
    caption(document, "Tabla", title)
    width = max(len(row) for row in rows)
    table = document.add_table(rows=0, cols=width)
    table.autofit = False
    available = Inches(6.9)
    # The first column is usually an identifier and is kept narrower.
    first = available * (0.19 if width > 2 else 0.35)
    remaining = (available - first) / max(1, width - 1)
    for index, values in enumerate(rows):
        cells = table.add_row().cells
        for column, cell in enumerate(cells):
            cell.width = first if column == 0 else remaining
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            border_cell(cell)
            if index == 0:
                shade_cell(cell, "E7F1F4")
            elif index % 2 == 0:
                shade_cell(cell, "F7F9FA")
            text = values[column] if column < len(values) else ""
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(1)
            inline(paragraph, text, source)
            for run in paragraph.runs:
                run.font.size = Pt(8 if width >= 4 else 9)
                if index == 0:
                    run.bold = True
        if index == 0:
            table.rows[0]._tr.get_or_add_trPr().append(OxmlElement("w:tblHeader"))
    document.add_paragraph().paragraph_format.space_after = Pt(2)


def clean_table_cell(text: str) -> str:
    return text.strip().replace("<br>", "; ")


def parse_table(lines: list[str]) -> list[list[str]]:
    values = [[clean_table_cell(c) for c in line.strip().strip("|").split("|")] for line in lines]
    return [values[0]] + values[2:]


def append_markdown(document, source: Path) -> int:
    lines = source.read_text(encoding="utf-8").splitlines()
    position = 0
    current_section = "Contenido"
    table_count = 0
    while position < len(lines):
        line = lines[position].strip()
        if not line:
            position += 1
            continue
        if line.startswith("#"):
            depth = len(line) - len(line.lstrip("#"))
            heading = line[depth:].strip()
            paragraph = document.add_paragraph(style=f"Heading {min(depth, 3)}")
            inline(paragraph, heading, source)
            if depth == 2:
                current_section = re.sub(r"^\d+\.\s*", "", heading)
            position += 1
            continue
        if line.startswith("|") and position + 1 < len(lines) and re.match(r"^\|\s*:?-", lines[position + 1].strip()):
            end = position + 2
            while end < len(lines) and lines[end].strip().startswith("|"):
                end += 1
            table_count += 1
            add_table(document, parse_table(lines[position:end]), source, f"{current_section}")
            position = end
            continue
        if re.match(r"^(?:[-*]|\d+\.)\s+", line):
            ordered = bool(re.match(r"^\d+\.\s+", line))
            body = re.sub(r"^(?:[-*]|\d+\.)\s+", "", line)
            paragraph = document.add_paragraph(style="List Number" if ordered else "List Bullet")
            inline(paragraph, body, source)
            position += 1
            continue
        parts = [line]
        position += 1
        while position < len(lines):
            next_line = lines[position].strip()
            if not next_line or next_line.startswith(("#", "|")) or re.match(r"^(?:[-*]|\d+\.)\s+", next_line):
                break
            parts.append(next_line)
            position += 1
        paragraph = document.add_paragraph(style="Normal")
        inline(paragraph, " ".join(parts), source)
    return table_count


def page_number(paragraph) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    field(paragraph, "PAGE")


def configure_section(section, *, chapter: bool = False, landscape: bool = False, large: bool = False) -> None:
    # Word limits each page edge to 22 inches. ER fold-outs stay within that limit.
    section.page_width = Inches(22 if large else 17 if landscape else 8.5)
    section.page_height = Inches(17 if large else 11)
    section.top_margin = Inches(1 if large else 0.85 if landscape else 1)
    section.bottom_margin = Inches(1 if large else 0.8 if landscape else 1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.header_distance = Inches(0.38)
    section.footer_distance = Inches(0.38)
    section.different_first_page_header_footer = chapter
    for item in (section.header, section.footer, section.first_page_header, section.first_page_footer):
        item.is_linked_to_previous = False
    if chapter:
        page_number(section.first_page_footer.paragraphs[0])
        page_number(section.header.paragraphs[0])
    else:
        page_number(section.footer.paragraphs[0])


def add_index(document, label: str, instruction: str) -> None:
    document.add_heading(label, level=1)
    paragraph = document.add_paragraph()
    field(paragraph, instruction)


def add_preliminaries(document) -> None:
    cover = document.add_paragraph(style="Title")
    cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover.add_run("Documento de Especificación de Requisitos y Análisis del Sistema")
    for text in (
        "[NOMBRE DE LA UNIVERSIDAD]",
        "[FACULTAD O UNIDAD ACADÉMICA]",
        "[PROGRAMA O CARRERA]",
        "Sistema de Control de Crecimiento y Vacunación Infantil",
        "SCCVI",
        "Autor o autores: [NOMBRE DEL ESTUDIANTE O EQUIPO]",
        "Asesor o asesora: [NOMBRE Y GRADO, SI CORRESPONDE]",
        "[CIUDAD Y PAÍS] — [MES Y AÑO]",
    ):
        paragraph = document.add_paragraph(text)
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_before = Pt(14)
    document.add_page_break()
    document.add_heading("Hoja de control de versiones", level=1)
    source = DELIVERY / "preliminares.md"
    add_table(
        document,
        [
            ["Versión", "Estado", "Alcance", "Responsable"],
            [
                "1.0",
                "Borrador académico",
                "Nueve capítulos, requisitos, diagramas y evidencia técnica",
                "[RESPONSABLE ACADÉMICO POR CONFIRMAR]",
            ],
        ],
        source,
        "Control de versiones del documento",
    )
    document.add_paragraph("La aprobación institucional, fecha y firmas permanecen por confirmar.")
    document.add_heading("Introducción general", level=1)
    preliminary = source.read_text(encoding="utf-8")
    introduction = preliminary.split("## Introducción general", 1)[1].split("## Índices", 1)[0].strip()
    for block in introduction.split("\n\n"):
        paragraph = document.add_paragraph()
        inline(paragraph, " ".join(block.splitlines()), source)
    add_index(document, "Índice general", 'TOC \\o "1-2" \\h \\z \\u')
    add_index(document, "Índice de tablas", 'TOC \\h \\z \\c "Tabla"')
    add_index(document, "Índice de figuras", 'TOC \\h \\z \\c "Figura"')
    document.add_heading("Glosario", level=1)
    glossary = (DELIVERY / "glosario.md").read_text(encoding="utf-8")
    for line in glossary.splitlines()[2:]:
        if not line.strip():
            continue
        match = re.match(r"^\*\*(.+?):\*\*\s+(.+)$", line)
        if not match:
            raise ValueError(f"Entrada de glosario inválida: {line}")
        paragraph = document.add_paragraph()
        paragraph.add_run(match.group(1) + ". ").bold = True
        paragraph.add_run(match.group(2))


def add_references(document) -> None:
    document.add_section(WD_SECTION.NEW_PAGE)
    configure_section(document.sections[-1], chapter=True)
    document.add_heading("Referencias", level=1)
    source = DELIVERY / "referencias.md"
    for line in source.read_text(encoding="utf-8").splitlines():
        if line.startswith("- "):
            paragraph = document.add_paragraph()
            paragraph.paragraph_format.left_indent = Inches(0.5)
            paragraph.paragraph_format.first_line_indent = Inches(-0.5)
            inline(paragraph, line[2:], source)


def list_figures() -> list[tuple[str, str, Path]]:
    source = DELIVERY / "anexos.md"
    figures = []
    for line in source.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| FIG-"):
            continue
        fields = [part.strip() for part in line.strip().strip("|").split("|")]
        match = re.search(r"\]\(([^)]+)\)", fields[3])
        if not match:
            raise ValueError(f"SVG ausente en {fields[0]}")
        svg = (source.parent / match.group(1)).resolve()
        if not svg.is_file():
            raise FileNotFoundError(svg)
        figures.append((fields[0], fields[2], svg))
    if len(figures) != 27 or len({item[2] for item in figures}) != 27:
        raise ValueError(f"Se esperaban 27 SVG únicos; encontrados {len(figures)}")
    return figures


def convert_figures(figures, destination: Path, node: str, node_modules: str, chrome: str) -> list[Path]:
    jobs = []
    for index, (_identifier, _title, svg) in enumerate(figures, 1):
        jobs.append([str(svg), str(destination / f"figura-{index:02}.png")])
    js = r"""
const sharp = require('sharp');
const {pathToFileURL} = require('url');
let input=''; process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  const jobs = JSON.parse(input);
  const { chromium } = require('playwright');
  let browser;
  try {
    for (let index=0; index<jobs.length; index++) {
      const [source, output] = jobs[index];
      const er = index >= 9 && index <= 14;
      if (er) {
        if (!browser) browser = await chromium.launch({headless:true, executablePath:process.env.SCCVI_DOC_CHROME});
        const svg = require('fs').readFileSync(source, 'utf8');
        const box = svg.match(/viewBox="[^"]*?([0-9.]+)\s+([0-9.]+)"/);
        if (!box) throw new Error('SVG ER sin viewBox');
        const page = await browser.newPage({viewport:{width:Math.ceil(Number(box[1]))+24,height:Math.ceil(Number(box[2]))+24},deviceScaleFactor:2});
        await page.goto(pathToFileURL(source).href);
        await page.locator('svg').screenshot({path:output,animations:'disabled'});
        await page.close();
      } else {
        await sharp(source, {density: 240, limitInputPixels: false})
          .resize({width: 4400, height: 2550, fit: 'inside', withoutEnlargement: false})
          .png().toFile(output);
      }
    }
  } finally { if (browser) await browser.close(); }
});
"""
    result = subprocess.run(
        [node, "-e", js], input=json.dumps(jobs), text=True, capture_output=True,
        env={**__import__("os").environ, "NODE_PATH": node_modules, "SCCVI_DOC_CHROME": chrome}, check=False,
    )
    if result.returncode:
        raise RuntimeError(f"Falló la conversión local de SVG: {result.stderr[:400]}")
    return [Path(item[1]) for item in jobs]


def add_figures(document, figures, pngs) -> None:
    section = document.add_section(WD_SECTION.NEW_PAGE)
    configure_section(section, chapter=False, landscape=True)
    document.add_heading("Anexos gráficos", level=1)
    document.add_paragraph(
        "Las 27 figuras se reproducen a partir de los SVG versionados. "
        "Las fuentes editables PlantUML y Mermaid permanecen en docs/dercas/diagramas/."
    )
    for index, ((identifier, title, svg), png) in enumerate(zip(figures, pngs), 1):
        if index in (10, 16):
            new_section = document.add_section(WD_SECTION.NEW_PAGE)
            configure_section(new_section, landscape=True, large=index == 10)
        else:
            document.add_page_break()
        caption(document, "Figura", f"{title} ({identifier})")
        from PIL import Image

        with Image.open(png) as image:
            width, height = image.size
        max_width, max_height = (19.9, 12.7) if 10 <= index <= 15 else (15.25, 8.0)
        scale = min(max_width / width, max_height / height)
        paragraph = document.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        picture = paragraph.add_run().add_picture(str(png), width=Inches(width * scale))
        picture._inline.docPr.set("descr", f"{identifier}: {title}")
        note = document.add_paragraph(style="Normal")
        note.alignment = WD_ALIGN_PARAGRAPH.CENTER
        note.add_run("Fuente: elaboración técnica basada en ")
        path = svg.relative_to(ROOT).as_posix()
        hyperlink(note, path, REPO_URL + path, DELIVERY / "anexos.md")
        note.add_run(". El SVG versionado permite ampliar el detalle.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--node", required=True)
    parser.add_argument("--node-modules", required=True)
    parser.add_argument("--chrome", required=True)
    options = parser.parse_args()
    document = Document()
    configure_section(document.sections[0])
    normal = document.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(12)
    normal.paragraph_format.line_spacing = 2
    normal.paragraph_format.space_after = Pt(0)
    normal.paragraph_format.first_line_indent = Inches(0.5)
    for name, size in (("Title", 16), ("Heading 1", 14), ("Heading 2", 12), ("Heading 3", 11)):
        style = document.styles[name]
        style.font.name = "Times New Roman"
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.space_before = Pt(12)
        style.paragraph_format.space_after = Pt(6)
        style.paragraph_format.keep_with_next = True
        if name == "Title":
            properties = style._element.get_or_add_pPr()
            for border in properties.findall(qn("w:pBdr")):
                properties.remove(border)
    document.styles["Caption"].font.name = "Times New Roman"
    document.styles["Caption"].font.size = Pt(10)
    document.styles["Caption"].font.color.rgb = RGBColor(0, 0, 0)
    document.core_properties.title = "DERCAS SCCVI"
    document.core_properties.subject = "Especificación y análisis del sistema"
    document.core_properties.author = "SCCVI"
    add_preliminaries(document)
    total_tables = 1
    chapters = sorted(CHAPTERS.glob("[0-9][0-9]-*.md"))
    if len(chapters) != 9:
        raise ValueError(f"Se esperaban nueve capítulos; encontrados {len(chapters)}")
    for source in chapters:
        section = document.add_section(WD_SECTION.NEW_PAGE)
        configure_section(section, chapter=True)
        total_tables += append_markdown(document, source)
    add_references(document)
    figures = list_figures()
    with tempfile.TemporaryDirectory(prefix="sccvi-dercas-") as temp:
        pngs = convert_figures(figures, Path(temp), options.node, options.node_modules, options.chrome)
        add_figures(document, figures, pngs)
        options.out.parent.mkdir(parents=True, exist_ok=True)
        document.save(options.out)
    print(json.dumps({"chapters": len(chapters), "figures": len(figures), "tables": total_tables, "docx": str(options.out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
