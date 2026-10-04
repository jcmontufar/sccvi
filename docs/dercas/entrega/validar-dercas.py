"""Check structural DERCAS deliverables and optionally render PDF contact sheets.

This documentation-only checker reads local files; it never calls SCCVI services.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from docx import Document
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
DERCAS = HERE.parent


def check_markdown_links() -> int:
    count = 0
    for source in [*sorted((DERCAS / "capitulos").glob("*.md")), *sorted(HERE.glob("*.md"))]:
        for match in re.finditer(r"\]\(([^)]+)\)", source.read_text(encoding="utf-8")):
            target = match.group(1)
            if target.startswith(("https://", "http://", "#")):
                continue
            if not (source.parent / target).exists():
                raise ValueError(f"Enlace roto: {source} → {target}")
            count += 1
    return count


def check_structure() -> dict[str, int]:
    chapter_sources = sorted((DERCAS / "capitulos").glob("[0-9][0-9]-*.md"))
    figures = sorted((DERCAS / "diagramas").rglob("*.svg"))
    glossary = (HERE / "glosario.md").read_text(encoding="utf-8")
    entries = re.findall(r"^\*\*[^*]+:\*\*", glossary, flags=re.MULTILINE)
    if len(chapter_sources) != 9 or len(figures) != 27 or len(entries) < 30:
        raise ValueError("Capítulos, figuras o glosario incompletos")
    document = Document(HERE / "SCCVI-DERCAS.docx")
    captions = [paragraph.text for paragraph in document.paragraphs if paragraph.style.name == "Caption"]
    if len(captions) != 38 or len(document.tables) != 11 or len(document.inline_shapes) != 27:
        raise ValueError(
            f"Captions={len(captions)}, tablas={len(document.tables)} o imágenes={len(document.inline_shapes)} incorrectas"
        )
    reader = PdfReader(HERE / "SCCVI-DERCAS.pdf")
    texts = [page.extract_text() or "" for page in reader.pages]
    if any(len(text.strip()) < 75 for text in texts):
        raise ValueError("Se encontró una página casi vacía")
    chapter_starts = []
    for number in range(1, 10):
        matches = [i + 1 for i, text in enumerate(texts) if f"tulo {number}." in text]
        if not matches:
            raise ValueError(f"Falta capítulo {number} en PDF")
        chapter_starts.append(matches[-1])
    for number in range(1, 28):
        matches = [i for i, text in enumerate(texts) if f"Figura {number}." in text]
        if not matches or "Fuente:" not in texts[matches[-1]]:
            raise ValueError(f"Figura {number} o su fuente no aparece en la misma página")
    return {
        "chapters": len(chapter_sources),
        "figures": len(figures),
        "tables": len(document.tables),
        "glossary_entries": len(entries),
        "pages": len(reader.pages),
        "local_links": check_markdown_links(),
        "chapter_starts": chapter_starts,
    }


def make_contact_sheets(output: Path) -> None:
    import pypdfium2 as pdfium
    from PIL import Image, ImageDraw

    output.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(str(HERE / "SCCVI-DERCAS.pdf"))
    thumb_width, thumb_height = 370, 270
    columns, rows = 4, 4
    for start in range(0, len(pdf), columns * rows):
        sheet = Image.new("RGB", (columns * thumb_width, rows * (thumb_height + 20)), "#e8edf0")
        draw = ImageDraw.Draw(sheet)
        for offset in range(min(columns * rows, len(pdf) - start)):
            index = start + offset
            page = pdf[index]
            image = page.render(scale=0.5).to_pil().convert("RGB")
            image.thumbnail((thumb_width - 12, thumb_height - 8))
            x = (offset % columns) * thumb_width + (thumb_width - image.width) // 2
            y = (offset // columns) * (thumb_height + 20) + 15
            sheet.paste(image, (x, y))
            draw.text(((offset % columns) * thumb_width + 7, y - 13), str(index + 1), fill="black")
        sheet.save(output / f"contacto-{start // (columns * rows) + 1:02}.png")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contact-sheets", type=Path)
    args = parser.parse_args()
    print(check_structure())
    if args.contact_sheets:
        make_contact_sheets(args.contact_sheets)


if __name__ == "__main__":
    main()
