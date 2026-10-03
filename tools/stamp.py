"""Stamp content hashes into index.html so a deploy can never serve a mix of
old and new modules.

Why: the app is plain ES modules with no bundler. Each module is cached by its
URL, and GitHub Pages serves with a short max-age, so right after a push a
phone can hold a NEW app.js next to an OLD speech.js and die on a missing
export (a white screen). An import map rewrites every module URL to carry that
file's own content hash, so a changed file is always refetched and an
unchanged one stays cached. Browsers without import-map support (iOS < 16.4)
ignore the map and behave exactly as before.

Run before every commit that touches js/ or css/:

    py -3 tools/stamp.py

tests/index.html fails if the stamp is stale, so forgetting is caught.
Standard library only; hashes are over LF-normalised bytes so Windows
checkouts and the deployed files agree.
"""
import hashlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BEGIN, END = "<!-- stamp:begin -->", "<!-- stamp:end -->"


def file_hash(path: pathlib.Path) -> str:
    data = path.read_bytes().replace(b"\r\n", b"\n")
    return hashlib.sha1(data).hexdigest()[:8]


def module_files():
    return sorted(p for p in (ROOT / "js").rglob("*.js"))


def build():
    imports = {}
    for p in module_files():
        rel = p.relative_to(ROOT).as_posix()
        imports[f"./{rel}"] = f"./{rel}?v={file_hash(p)}"
    return imports


def main():
    index = ROOT / "index.html"
    html = index.read_text(encoding="utf-8")
    if BEGIN not in html or END not in html:
        sys.exit("index.html is missing the stamp markers")

    imports = build()
    app_v = imports["./js/app.js"].split("?v=")[1]
    css_v = file_hash(ROOT / "css" / "styles.css")
    block = (
        f"{BEGIN}\n"
        f'  <script type="importmap">\n{json.dumps({"imports": imports}, indent=2)}\n  </script>\n'
        f"  {END}"
    )
    html = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), lambda m: block, html, flags=re.S)
    html = re.sub(r'href="css/styles\.css(\?v=[0-9a-f]+)?"', f'href="css/styles.css?v={css_v}"', html)
    html = re.sub(r'src="js/app\.js(\?v=[0-9a-f]+)?"', f'src="js/app.js?v={app_v}"', html)
    with open(index, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    print(f"stamped {len(imports)} modules + css into index.html")


if __name__ == "__main__":
    main()
