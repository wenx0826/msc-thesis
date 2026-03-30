# Docling Demo

This is a small standalone Docling demo inside the `Code` folder. It lets you try Docling quickly without touching the existing `dbpm` app.

## Prerequisite

Use Python 3.11 on this machine. The default `python3` here is 3.9, but current Docling releases require Python 3.10 or newer.

## Quick start

```bash
cd "/Users/owxwo/Documents/MSc Thesis - Document-Based Process Modeler/Code/docling-demo"
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python convert_document.py
```

If you run the script without a source, it uses a sample PDF that already exists in this repository.

The exported files are written to `output/`:

- Markdown: `output/<name>.md`
- Plain text: `output/<name>.txt`
- JSON: `output/<name>.json`

## Try your own file

```bash
python convert_document.py "/absolute/path/to/your-file.pdf"
```

You can also point it at a URL:

```bash
python convert_document.py "https://arxiv.org/pdf/2408.09869"
```

## Useful options

```bash
python convert_document.py --help
python convert_document.py --to md html json text
python convert_document.py --image-mode referenced
python convert_document.py --output-dir output/custom
python convert_document.py "../Business Process Technologies and Management/BPTM_5.pdf" --preview-chars 1200
```

## Try the Docling CLI directly

After the virtual environment is active, you can also use Docling's built-in CLI:

```bash
docling "../Business Process Technologies and Management/BPTM_5.pdf" --to md --output output/cli
```

For JSON output instead:

```bash
docling "../Business Process Technologies and Management/BPTM_5.pdf" --to json --output output/cli-json
```

## Notes

- The first run can take longer because Docling may download model artifacts.
- If you want, the next step can be wiring this into the `dbpm` backend or adding a small upload page in the frontend.
