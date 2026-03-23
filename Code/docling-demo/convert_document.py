#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from docling.document_converter import DocumentConverter
from docling_core.types.doc import ImageRefMode


SCRIPT_DIR = Path(__file__).resolve().parent
CODE_DIR = SCRIPT_DIR.parent
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / "output"
DEFAULT_FORMATS = ["md", "text", "json"]
DEFAULT_SAMPLE_CANDIDATES = [
    CODE_DIR / "Business Process Technologies and Management" / "BPTM_3.pdf",
    CODE_DIR / "Business Process Technologies and Management" / "BPTM_5.pdf",
    CODE_DIR / "Business Process Technologies and Management" / "Car Service.pdf",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Convert a local document or URL with Docling and export it to "
            "Markdown, text, JSON, or HTML."
        )
    )
    parser.add_argument(
        "source",
        nargs="?",
        help="Local file path or URL. If omitted, a sample PDF from this repository is used.",
    )
    parser.add_argument(
        "--to",
        nargs="+",
        choices=["md", "text", "json", "html"],
        default=DEFAULT_FORMATS,
        help="Export formats to generate. Defaults to: md text json",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Directory where converted files are written. Defaults to {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--image-mode",
        choices=["embedded", "referenced", "placeholder"],
        default="embedded",
        help="Image handling mode for Markdown and HTML exports.",
    )
    parser.add_argument(
        "--preview-chars",
        type=int,
        default=800,
        help="How many characters of plain-text preview to print after conversion.",
    )
    return parser.parse_args()


def pick_default_sample() -> Path:
    for candidate in DEFAULT_SAMPLE_CANDIDATES:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("No default sample PDF was found in the Code folder.")


def is_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def resolve_source(raw_source: str | None) -> tuple[str | Path, str]:
    if not raw_source:
        sample = pick_default_sample()
        return sample, f"{sample} (default sample)"

    if is_url(raw_source):
        return raw_source, raw_source

    path = Path(raw_source).expanduser()
    if not path.is_absolute():
        path = (Path.cwd() / path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Source file not found: {path}")
    return path, str(path)


def sanitize_name(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._")
    return cleaned or "document"


def derive_basename(source: str | Path) -> str:
    if isinstance(source, Path):
        return sanitize_name(source.stem)

    parsed = urlparse(source)
    path_name = Path(parsed.path).stem or parsed.netloc
    return sanitize_name(path_name)


def to_image_mode(value: str) -> ImageRefMode:
    mapping = {
        "embedded": ImageRefMode.EMBEDDED,
        "referenced": ImageRefMode.REFERENCED,
        "placeholder": ImageRefMode.PLACEHOLDER,
    }
    return mapping[value]


def save_outputs(document, basename: str, output_dir: Path, formats: list[str], image_mode: ImageRefMode) -> list[Path]:
    saved_files: list[Path] = []
    output_dir.mkdir(parents=True, exist_ok=True)

    if "md" in formats:
        md_path = output_dir / f"{basename}.md"
        document.save_as_markdown(md_path, image_mode=image_mode)
        saved_files.append(md_path)

    if "html" in formats:
        html_path = output_dir / f"{basename}.html"
        document.save_as_html(html_path, image_mode=image_mode)
        saved_files.append(html_path)

    if "json" in formats:
        json_path = output_dir / f"{basename}.json"
        document.save_as_json(json_path)
        saved_files.append(json_path)

    if "text" in formats:
        text_path = output_dir / f"{basename}.txt"
        text_path.write_text(document.export_to_text(), encoding="utf-8")
        saved_files.append(text_path)

    return saved_files


def main() -> int:
    args = parse_args()

    try:
        source, display_source = resolve_source(args.source)
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 1

    image_mode = to_image_mode(args.image_mode)
    basename = derive_basename(source)
    converter = DocumentConverter()

    print(f"Source: {display_source}", flush=True)
    print(f"Output directory: {args.output_dir}", flush=True)
    print(f"Formats: {', '.join(args.to)}", flush=True)
    print("Converting with Docling...", flush=True)

    started_at = time.perf_counter()
    result = converter.convert(str(source))
    elapsed = time.perf_counter() - started_at

    saved_files = save_outputs(
        result.document,
        basename=basename,
        output_dir=args.output_dir,
        formats=args.to,
        image_mode=image_mode,
    )

    page_count = len(getattr(result.document, "pages", {}) or {})
    full_text = result.document.export_to_text()
    preview = full_text.strip()
    if args.preview_chars >= 0:
        preview = preview[: args.preview_chars].strip()

    print(f"Done in {elapsed:.2f}s", flush=True)
    if page_count:
        print(f"Pages detected: {page_count}", flush=True)
    print("Saved files:", flush=True)
    for file_path in saved_files:
        print(f"  - {file_path}", flush=True)

    if preview:
        print("\nPreview:\n", flush=True)
        print(preview, flush=True)
        if args.preview_chars >= 0 and len(full_text) > args.preview_chars:
            print("\n[preview truncated]", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
