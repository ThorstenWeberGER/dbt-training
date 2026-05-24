import os
import subprocess
import sys
import tempfile
import shutil
import markdown

BASE = os.path.dirname(os.path.abspath(__file__))
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

CSS = """
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.6;
    color: #1a1a1a;
    padding: 32px 48px;
    max-width: 900px;
    margin: 0 auto;
  }
  h1 { font-size: 2em; font-weight: 700; margin: 0 0 12px; color: #111; }
  h2 { font-size: 1.4em; font-weight: 600; margin: 28px 0 10px; color: #222; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
  h3 { font-size: 1.15em; font-weight: 600; margin: 20px 0 8px; color: #333; }
  h4 { font-size: 1em; font-weight: 600; margin: 16px 0 6px; color: #444; }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 10px 24px; }
  li { margin-bottom: 4px; }
  code {
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    font-size: 0.85em;
    background: #f4f4f4;
    padding: 1px 5px;
    border-radius: 3px;
  }
  pre {
    background: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    padding: 14px;
    margin: 12px 0;
    overflow-x: auto;
  }
  pre code {
    background: none;
    padding: 0;
    font-size: 0.82em;
    line-height: 1.5;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 0.88em;
  }
  th {
    background: #f0f0f0;
    font-weight: 600;
    text-align: left;
    padding: 7px 10px;
    border: 1px solid #ccc;
  }
  td {
    padding: 6px 10px;
    border: 1px solid #ddd;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #fafafa; }
  blockquote {
    border-left: 4px solid #10b981;
    margin: 12px 0;
    padding: 8px 16px;
    background: #f0fdf4;
    color: #555;
  }
  strong { font-weight: 600; }
  em { font-style: italic; }
  hr { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }
  a { color: #10b981; }
  @media print {
    body { padding: 20px 36px; }
    pre { white-space: pre-wrap; }
  }
</style>
"""

def md_to_pdf(md_path, pdf_path):
    with open(md_path, encoding="utf-8") as f:
        content = f.read()

    # strip YAML frontmatter (Slidev / Jekyll style)
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            content = content[end + 3:].lstrip()

    html_body = markdown.markdown(
        content,
        extensions=["tables", "fenced_code", "codehilite", "toc", "nl2br"],
    )

    title = os.path.splitext(os.path.basename(md_path))[0].replace("_", " ").title()
    html = f"<!DOCTYPE html><html><head><meta charset='utf-8'><title>{title}</title>{CSS}</head><body>{html_body}</body></html>"

    with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8") as tmp:
        tmp.write(html)
        tmp_path = tmp.name

    try:
        url = "file:///" + tmp_path.replace("\\", "/")
        result = subprocess.run(
            [EDGE, "--headless=new", f"--print-to-pdf={pdf_path}", "--no-sandbox", "--disable-gpu", url],
            capture_output=True, timeout=30
        )
        return os.path.exists(pdf_path)
    finally:
        os.unlink(tmp_path)


JOBS = [
    ("handouts", "pdfs/handouts"),
    ("excercises", "pdfs/exercises"),
    ("resources",  "pdfs/resources"),
    ("presentation", "pdfs/slides"),
]

SKIP = {"README.md", "package.json"}

ok = 0
fail = 0

for src_dir, dst_dir in JOBS:
    src_path = os.path.join(BASE, src_dir)
    dst_path = os.path.join(BASE, dst_dir)
    os.makedirs(dst_path, exist_ok=True)

    for fname in sorted(os.listdir(src_path)):
        if not fname.endswith(".md") or fname in SKIP:
            continue
        md_file = os.path.join(src_path, fname)
        pdf_file = os.path.join(dst_path, fname.replace(".md", ".pdf"))
        print(f"  Converting {src_dir}/{fname} ...", end=" ", flush=True)
        try:
            if md_to_pdf(md_file, pdf_file):
                print("OK")
                ok += 1
            else:
                print("FAILED (no output)")
                fail += 1
        except Exception as e:
            print(f"ERROR: {e}")
            fail += 1

print(f"\nDone: {ok} PDFs created, {fail} failed.")
