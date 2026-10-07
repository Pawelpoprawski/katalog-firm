#!/usr/bin/env python3
# POWIĄZANIA
# Cel: generator mapy zależności (sekcja AUTO w POWIAZANIA.md) i linii AUTO w nagłówkach plików; --check
#   zgłasza pliki bez opisu.
# Przy zmianie: ten sam plik jest w 4 repo (web, praca, katalog-firm, ps-tools) - zmieniasz tu, skopiuj do
#   pozostałych i przegeneruj POWIAZANIA.md wszędzie. Konfiguracja per repo: scripts/powiazania.json.
# AUTO używany przez: nikt nie importuje (punkt wejścia: skrypt/cron/CLI - patrz Cel)
# /POWIĄZANIA
"""
POWIAZANIA - generator mapy zależności kodu (część automatyczna POWIAZANIA.md).

Cel: żeby przed każdą zmianą (człowiek albo AI) dało się w 10 sekund sprawdzić,
co jeszcze się sypnie: kto importuje dany moduł, jakie są endpointy API i kto
je woła (także z innych repo), które pliki czytają daną zmienną środowiskową
i którą tabelę/bazę.

Użycie (z katalogu głównego repo):
    python scripts/powiazania.py           # przepisuje sekcję AUTO w POWIAZANIA.md
    python scripts/powiazania.py --check   # kod 1, gdy POWIAZANIA.md jest nieaktualne

Konfiguracja: scripts/powiazania.json (obok tego pliku):
    {
      "ts_roots": ["."],              # katalogi z tsconfig.json (Next.js / React)
      "py_roots": [],                 # katalogi z kodem Pythona (pakiety liczone od tego katalogu)
      "siblings": {"praca": "../praca"}  # inne repo skanowane w poszukiwaniu wywołań naszych endpointów
    }

TEN SAM PLIK jest skopiowany do 4 repo (web, praca, katalog-firm, ps-tools).
Zmieniasz go w jednym -> skopiuj do pozostałych i przegeneruj POWIAZANIA.md wszędzie.

Ograniczenia (świadome): analiza jest regexowa, nie AST. Nie widzi dynamicznych
importów z wyliczanych stringów ani URL-i sklejanych z wielu zmiennych. Takie
powiązania opisuje ręczna część POWIAZANIA.md i nagłówki plików.
"""
from __future__ import annotations

import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((Path(__file__).with_name("powiazania.json")).read_text(encoding="utf-8"))
OUT = ROOT / "POWIAZANIA.md"
START, END = "<!-- AUTO:START (generuje scripts/powiazania.py - nie edytuj ręcznie) -->", "<!-- AUTO:END -->"

SKIP_DIRS = {"node_modules", ".next", ".git", "venv", ".venv", "__pycache__", "dist", "build",
             "public", "static", "migrations", "alembic", ".pytest_cache", "coverage", "uploads", "var"}
TS_EXT = (".ts", ".tsx", ".js", ".jsx", ".mjs")
HTTP = ("GET", "POST", "PUT", "PATCH", "DELETE")


def rel(p: Path) -> str:
    return p.resolve().relative_to(ROOT).as_posix()


def walk(base: Path, exts) -> list[Path]:
    out = []
    for dp, dn, fn in os.walk(base):
        dn[:] = [d for d in dn if d not in SKIP_DIRS and not d.startswith(".")]
        for f in fn:
            if f.endswith(exts) and not f.endswith(".d.ts"):
                out.append(Path(dp) / f)
    return sorted(out)


def read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def read_raw(p: Path) -> str:
    """Odczyt bez zamiany końców linii (do zapisu z zachowaniem CRLF/LF)."""
    with open(p, encoding="utf-8", errors="replace", newline="") as fh:
        return fh.read()


def norm_path(p: str) -> str:
    """'/api/jobs/${id}?x=1' / '/jobs/{job_id}' / '/jobs/[slug]' -> '/api/jobs/{}'."""
    p = p.split("?")[0].split("#")[0]
    p = re.sub(r"\$\{[^}]*\}|\{[^}]*\}|\[[^\]]*\]|:[A-Za-z_]\w*|<[^>]*>", "{}", p)
    p = re.sub(r"/+", "/", p).rstrip("/")
    return p or "/"


# ----------------------------------------------------------------- TypeScript
def ts_alias(root: Path) -> dict[str, str]:
    try:
        raw = re.sub(r"//.*", "", read(root / "tsconfig.json"))
        paths = json.loads(raw).get("compilerOptions", {}).get("paths", {})
    except Exception:
        paths = {}
    return {k.rstrip("*"): v[0].rstrip("*") for k, v in paths.items()} or {"@/": "src/"}


def ts_resolve(src: Path, spec: str, root: Path, alias: dict) -> Path | None:
    base = None
    for a, target in alias.items():
        if spec.startswith(a):
            base = root / target / spec[len(a):]
    if base is None and spec.startswith("."):
        base = src.parent / spec
    if base is None:
        return None
    for cand in [base, *(Path(str(base) + e) for e in TS_EXT), *(base / ("index" + e) for e in TS_EXT)]:
        if cand.is_file():
            return cand
    return None


def next_url(p: Path, app_dir: Path) -> str:
    parts = [s for s in p.relative_to(app_dir).parent.parts if not (s.startswith("(") and s.endswith(")"))]
    return "/" + "/".join(parts)


# --------------------------------------------------------------------- Python
def py_module_map(root: Path, files: list[Path]) -> dict[str, Path]:
    m = {}
    for f in files:
        parts = list(f.relative_to(root).with_suffix("").parts)
        if parts[-1] == "__init__":
            parts = parts[:-1]
        if parts:
            m[".".join(parts)] = f
    return m


def py_resolve(src: Path, mod: str, root: Path, mods: dict) -> list[Path]:
    if mod.startswith("."):
        level = len(mod) - len(mod.lstrip("."))
        pkg = list(src.relative_to(root).parent.parts)
        pkg = pkg[: len(pkg) - (level - 1)] if level > 1 else pkg
        mod = ".".join(pkg + ([mod.lstrip(".")] if mod.lstrip(".") else []))
    # dopasuj najdłuższy istniejący prefiks (from a.b import c -> a.b.c albo a.b)
    out = []
    for cand in (mod, mod.rsplit(".", 1)[0] if "." in mod else None):
        if cand and cand in mods:
            out.append(mods[cand])
            break
        # moduły liczone od podkatalogu (np. 'app.x' gdy root=backend) albo z prefiksem pakietu
        for k, v in mods.items():
            if cand and (k.endswith("." + cand) or k == cand):
                out.append(v)
                break
        if out:
            break
    return out


def main(check: bool) -> int:
    imports = defaultdict(set)          # plik -> {plik}
    endpoints = []                      # (metoda, ścieżka, plik:linia, funkcja)
    pages = []                          # (url, plik)
    envs = defaultdict(set)             # ZMIENNA -> {plik}
    tables = defaultdict(set)           # tabela -> {plik}
    url_literals = defaultdict(set)     # znormalizowany URL -> {plik (także z innych repo)}
    url_bases = defaultdict(set)        # (znormalizowany URL, plik) -> {baza adresu: nazwa zmiennej albo host}
    url_for_calls = defaultdict(set)    # nazwa funkcji widoku (Flask url_for) -> {plik}
    files_all: list[Path] = []

    # tylko słowa kluczowe SQL WIELKIMI literami (inaczej łapie pythonowe "from x import" i "require(...)")
    sql_re = re.compile(r"\b(?:FROM|INTO|UPDATE|JOIN|TABLE(?: IF NOT EXISTS)?)\s+[\"`]?([a-z_][a-z0-9_]{2,})\b")
    sql_skip = {"nie", "jest", "sie", "tej", "ten", "tego", "lub", "oraz",
                "select", "where", "set", "values", "the", "and", "exists", "not", "only", "each", "json_each",
                "pragma_table_info", "sqlite_master", "information_schema", "excluded", "unnest", "generate_series"}

    def collect_urls(text: str, label: str):
        if label.endswith("powiazania.py"):  # przykłady URL-i w komentarzach generatora to nie wywołania
            return
        # baza: ${X} (JS), {X} (f-string Pythona) albo absolutny http(s)://host
        for m in re.finditer(r"""[`'"]((?:\$?\{[^}`'"]*\}|https?://[^/`'"\s]+)?/[A-Za-z0-9_\-./{}$\[\]:]*(?:\?[^`'"\s]*)?)[`'"]""", text):
            s = m.group(1)
            if len(s) > 1 and not s.startswith("//") and not re.search(r"\.(png|jpe?g|webp|svg|css|ico|js|woff2?|mp4|pdf)$", s.split("?")[0]):
                # host absolutnego URL-a zamieniamy na "{}" (= "inny serwer / adres bazowy")
                key = norm_path(re.sub(r"^https?://[^/]+", "{}", s))
                url_literals[key].add(label)
                b = re.match(r"\$?\{([^}]*)\}|https?://([^/]+)", s)
                if b:
                    url_bases[(key, label)].add(b.group(1) or b.group(2))
        # URL-e bez cudzysłowów (skrypty shell: API=http://127.0.0.1:3200/api/...)
        for m in re.finditer(r"https?://([A-Za-z0-9.\-]+(?::\d+)?)(/[^\s'\"`<>)]*)", text):
            key = norm_path("{}" + m.group(2))
            url_literals[key].add(label)
            url_bases[(key, label)].add(m.group(1))
        # Flask: url_for('nazwa_widoku') w szablonach i kodzie - tylko w obrębie tego samego repo
        if not label.startswith("["):
            for name in re.findall(r"url_for\(\s*['\"](\w+)['\"]", text):
                url_for_calls[name].add(label)

    # ---- TS / Next.js
    app_dirs = []
    for tr in CFG.get("ts_roots", []):
        root = (ROOT / tr).resolve()
        alias = ts_alias(root)
        src_dir = root / "src" if (root / "src").is_dir() else root
        app_dir = next((d for d in (src_dir / "app", root / "app") if d.is_dir()), None)
        if app_dir:
            app_dirs.append(app_dir)
        for f in walk(src_dir, TS_EXT):
            files_all.append(f)
            t = read(f)
            for spec in re.findall(r"""(?:from\s+|import\s*\(\s*|require\(\s*)['"]([^'"]+)['"]""", t):
                r = ts_resolve(f, spec, root, alias)
                if r:
                    imports[f].add(r)
            for v in re.findall(r"process\.env\.([A-Z][A-Z0-9_]+)", t):
                envs[v].add(rel(f))
            for tb in sql_re.findall(t):
                if tb.lower() not in sql_skip and re.search(r"(prepare|exec|query|sql)\s*\(", t):
                    tables[tb.lower()].add(rel(f))
            collect_urls(t, rel(f))
            if app_dir and app_dir in f.parents:
                url = next_url(f, app_dir)
                if f.stem == "route":
                    for meth in HTTP:
                        mm = re.search(rf"export\s+(?:async\s+)?(?:function|const)\s+{meth}\b", t)
                        if mm:
                            endpoints.append((meth, url, f"{rel(f)}:{t[:mm.start()].count(chr(10)) + 1}", meth))
                elif f.stem == "page":
                    pages.append((url, rel(f)))

    # ---- Python (FastAPI / Flask)
    for pr in CFG.get("py_roots", []):
        root = (ROOT / pr).resolve()
        pyfiles = walk(root, (".py",))
        mods = py_module_map(root, pyfiles)
        # moduły także z prefiksem nazwy katalogu (katalog-firm: 'backend.main')
        mods.update({f"{root.name}.{k}": v for k, v in list(mods.items())})
        prefixes = {}  # nazwa routera w pliku -> prefiks
        include_prefix = defaultdict(str)  # plik routera -> prefiks z include_router
        for f in pyfiles:
            t = read(f)
            for name, pre in re.findall(r"(\w+)\s*=\s*APIRouter\([^)]*prefix\s*=\s*['\"]([^'\"]*)['\"]", t, re.S):
                prefixes[(f, name)] = pre
            for mod, attr, pre in re.findall(r"include_router\(\s*([\w.]+)\.(\w+)[^)]*?prefix\s*=\s*['\"]([^'\"]*)['\"]", t, re.S):
                for g in pyfiles:
                    if g.stem == mod.split(".")[-1]:
                        include_prefix[g] = pre
        for f in pyfiles:
            files_all.append(f)
            t = read(f)
            for m in re.finditer(r"^\s*(?:from\s+([\w.]+)\s+import\s+([\w, ()\n]+)|import\s+([\w.]+))", t, re.M):
                mod = m.group(1) or m.group(3)
                targets = py_resolve(f, mod, root, mods)
                if m.group(1) and m.group(2):  # from pkg import modul1, modul2
                    for name in re.findall(r"\w+", m.group(2)):
                        targets += py_resolve(f, (mod + "." + name) if not mod.endswith(".") else mod + name, root, mods)
                for r in targets:
                    if r != f:
                        imports[f].add(r)
            for v in re.findall(r"""(?:os\.environ(?:\.get)?\(|os\.getenv\(|environ\[)\s*['"]([A-Z][A-Z0-9_]+)['"]""", t):
                envs[v].add(rel(f))
            for tb in re.findall(r"__tablename__\s*=\s*['\"](\w+)['\"]", t):
                tables[tb].add(rel(f) + " (model)")
            for tb in sql_re.findall(t):
                if tb.lower() not in sql_skip and re.search(r"(execute|text|query)\s*\(", t):
                    tables[tb.lower()].add(rel(f))
            # definicje tras (@router.get("/x"), prefix="/x") to nie wywołania - wytnij je przed szukaniem URL-i
            collect_urls(re.sub(r"(?m)^\s*@\w+\.(?:get|post|put|patch|delete|api_route|route)\(.*$|prefix\s*=\s*['\"][^'\"]*['\"]", "", t), rel(f))
            lines = t.split("\n")
            for i, line in enumerate(lines):
                m = re.match(r"\s*@(\w+)\.(get|post|put|patch|delete|api_route)\(\s*['\"]([^'\"]*)['\"]", line)
                m2 = re.match(r"\s*@(\w+)\.route\(\s*['\"]([^'\"]*)['\"](.*)", line)
                if not (m or m2):
                    continue
                fn = next((re.search(r"def\s+(\w+)", l).group(1) for l in lines[i + 1:i + 8] if re.search(r"def\s+(\w+)", l)), "?")
                if m:
                    path = include_prefix.get(f, "") + prefixes.get((f, m.group(1)), "") + m.group(3)
                    endpoints.append((m.group(2).upper().replace("API_ROUTE", "ANY"), path or "/", f"{rel(f)}:{i + 1}", fn))
                else:
                    meths = re.findall(r"['\"](GET|POST|PUT|PATCH|DELETE)['\"]", m2.group(3)) or ["GET"]
                    endpoints.append(("/".join(meths), m2.group(2), f"{rel(f)}:{i + 1}", fn))

    # ---- własne skrypty shell (crony) i katalogi z szablonami (caller_dirs) - tylko jako wywołujący
    for f in walk(ROOT / "scripts", (".sh",)) if (ROOT / "scripts").is_dir() else []:
        collect_urls(read(f), rel(f))
    for d in CFG.get("caller_dirs", []):
        for f in walk(ROOT / d, (".html", ".js", ".jinja", ".j2")) if (ROOT / d).is_dir() else []:
            collect_urls(read(f), rel(f))

    # ---- wywołania z innych repo (tylko literały URL)
    for name, path in CFG.get("siblings", {}).items():
        sib = (ROOT / path).resolve()
        if not sib.is_dir():
            continue
        for f in walk(sib, TS_EXT + (".py", ".sh")):
            collect_urls(read(f), f"[{name}] {f.relative_to(sib).as_posix()}")

    # ---- dopasowanie endpoint -> wywołujący
    def callers(path: str, own: str) -> list[str]:
        ep = norm_path(path)
        segs = [s for s in ep.split("/") if s]
        if not any(s != "{}" for s in segs):
            return []
        found = set()
        for lit, who in url_literals.items():
            ls = [s for s in lit.split("/") if s]
            if len(ls) < len(segs):
                continue
            tail = ls[len(ls) - len(segs):]
            if not any(a == b != "{}" for a, b in zip(tail, segs)):
                continue
            # w tym samym repo '{}' w literale może zastąpić stały segment (np. ${API_BASE} = "/api");
            # wywołania z innych repo ([nazwa] ...) muszą mieć pełną, dokładną ścieżkę.
            # segment "api" musi wystąpić dosłownie - placeholder adresu bazowego (${SITE_URL}) go nie zastępuje
            loose = all(a == b or (a == "{}" and b != "api") or b == "{}" for a, b in zip(tail, segs))
            def exact(xs):
                return len(xs) == len(segs) and all(a == b or b == "{}" for a, b in zip(xs, segs))
            # z innego repo: tylko URL skierowany na inny serwer - adres bazowy + pełna ścieżka
            # (${PRACA_API}/api/v1/jobs, http://127.0.0.1:3200/api/menu/). Gołe "/admin/x" w innym repo
            # dotyczy JEGO własnego API, więc nie liczy się jako wywołanie naszego endpointu.
            strict = len(ls) > 1 and ls[0] == "{}" and exact(ls[1:])
            for w in who:
                if w == own:
                    continue
                if w.startswith("["):
                    # inne repo: pełna ścieżka + baza adresu wskazująca NA TĘ aplikację
                    # (incoming_bases w powiazania.json, np. "KATALOG|8201" - nazwa zmiennej albo host:port)
                    inc = CFG.get("incoming_bases")
                    if strict and inc and any(re.search(inc, b) for b in url_bases.get((lit, w), ())):
                        found.add(w)
                elif loose:
                    found.add(w)
        # klient HTTP z baseURL (np. axios baseURL="/api/v1"): w kodzie stoi "/jobs/{}" zamiast "/api/v1/jobs/{}".
        # Tylko dla wywołań z TEGO repo i tylko przy pełnej zgodności reszty ścieżki.
        for pre in CFG.get("api_prefixes", []):
            ps = [s for s in pre.split("/") if s]
            if segs[: len(ps)] != ps or len(segs) == len(ps):
                continue
            rest = segs[len(ps):]
            for lit, who in url_literals.items():
                ls = [s for s in lit.split("/") if s]
                if len(ls) == len(rest) and all(a == b or b == "{}" or a == "{}" for a, b in zip(ls, rest)) \
                        and any(a == b != "{}" for a, b in zip(ls, rest)) and ls[0] != "{}":
                    found |= {w for w in who if w != own and not w.startswith("[")}
        return sorted(found)

    imported_by = defaultdict(set)
    for a, bs in imports.items():
        for b in bs:
            imported_by[b].add(a)

    L = [START, "", "_Wygenerowane automatycznie. Odśwież: `python scripts/powiazania.py`._", ""]
    if endpoints:
        L += ["### Endpointy (API) i kto je wywołuje", "",
              "| Metoda | Ścieżka | Obsługa | Wywoływane z (literały URL w kodzie, też z innych repo) |", "|---|---|---|---|"]
        for meth, path, where, fn in sorted(endpoints, key=lambda e: (e[1], e[0])):
            c = sorted(set(callers(path, where.split(":")[0])) | url_for_calls.get(fn, set()))
            L.append(f"| {meth} | `{path}` | `{where}` {fn}() | {'<br>'.join(f'`{x}`' for x in c[:12]) + (f' +{len(c) - 12}' if len(c) > 12 else '') if c else '—'} |")
        L.append("")
    if pages:
        L += ["### Strony (URL -> plik)", "", "| URL | Plik |", "|---|---|"]
        L += [f"| `{u}` | `{p}` |" for u, p in sorted(pages)]
        L.append("")
    if tables:
        L += ["### Tabele baz danych -> pliki, które ich dotykają", "", "| Tabela | Pliki |", "|---|---|"]
        L += [f"| `{t}` | {', '.join(f'`{x}`' for x in sorted(fs))} |" for t, fs in sorted(tables.items())]
        L.append("")
    if envs:
        L += ["### Zmienne środowiskowe -> pliki", "", "| Zmienna | Pliki |", "|---|---|"]
        L += [f"| `{v}` | {', '.join(f'`{x}`' for x in sorted(fs))} |" for v, fs in sorted(envs.items())]
        L.append("")
    L += ["### Moduły: importuje / jest importowany przez", "",
          "| Plik | Importuje | Importowany przez |", "|---|---|---|"]
    for f in sorted(set(files_all), key=rel):
        imp = sorted(rel(x) for x in imports.get(f, ()))
        by = sorted(rel(x) for x in imported_by.get(f, ()))
        fmt = lambda xs: "<br>".join(f"`{x}`" for x in xs) if xs else "—"
        L.append(f"| `{rel(f)}` | {fmt(imp)} | {fmt(by)} |")
    L += ["", END]
    auto = "\n".join(L)

    # ---- nagłówki POWIĄZANIA w plikach: odśwież linie AUTO, wypisz pliki bez opisu
    route_callers = defaultdict(set)
    route_files = defaultdict(str)
    for meth, path, where, fn in endpoints:
        fr = where.split(":")[0]
        route_callers[fr].update(callers(path, fr))
        route_callers[fr].update(url_for_calls.get(fn, set()) - {fr})
        route_files[fr] = (route_files[fr] + ", " if route_files[fr] else "") + f"{meth} {path}"
    page_url = {p: u for u, p in pages}
    missing, changed = [], []
    for f in sorted(set(files_all), key=rel):
        r = rel(f)
        if is_excluded(r):
            continue
        hdr = []
        by = sorted(rel(x) for x in imported_by.get(f, ()))
        if by:
            hdr.append("AUTO używany przez: " + short_list(by))
        if route_callers.get(r):
            hdr.append("AUTO wywoływany z: " + short_list(sorted(route_callers[r])))
        if r in page_url:
            hdr.append(f"AUTO adres strony: {page_url[r]}")
        elif r in route_files:
            if not route_callers.get(r):
                hdr.append("AUTO wywoływany z: brak literałów URL w kodzie (cron/skrypt/zewnętrzne narzędzie albo URL sklejany dynamicznie - patrz Cel)")
            hdr.append(f"AUTO endpoint: {route_files[r]}")
        elif f.stem in NEXT_SPECIAL and (any(d in f.parents for d in app_dirs) or f.stem in ("middleware", "instrumentation")):
            hdr.append(f"AUTO plik specjalny Next.js ({f.stem}) - ładowany przez framework, nie przez import")
        elif not by:
            hdr.append("AUTO używany przez: nikt nie importuje (punkt wejścia: skrypt/cron/CLI - patrz Cel)")
        raw = read_raw(f)
        crlf = "\r\n" in raw
        t = raw.replace("\r\n", "\n")
        nt, ok = update_header(t, f.suffix, hdr)
        if not ok:
            missing.append(r)
        elif nt != t:
            changed.append(r)
            if not check:  # zachowaj styl końców linii pliku (repo mają mieszane CRLF/LF)
                with open(f, "w", encoding="utf-8", newline="") as fh:
                    fh.write(nt.replace("\n", "\r\n") if crlf else nt)

    cur = read(OUT)
    if START in cur and END in cur:
        new = cur[: cur.index(START)] + auto + cur[cur.index(END) + len(END):]
    else:
        new = (cur.rstrip() + "\n\n" if cur else "# POWIAZANIA\n\n") + "## Mapa automatyczna\n\n" + auto + "\n"
    if missing:
        print(f"BRAK opisu POWIĄZANIA (Cel / Przy zmianie) w {len(missing)} plikach - dopisz nagłówek wg CLAUDE.md:")
        for m in missing:
            print("   ", m)
    if check:
        bad = False
        if new != cur or changed:
            print("POWIAZANIA.md albo linie AUTO w nagłówkach są nieaktualne - uruchom: python scripts/powiazania.py")
            bad = True
        if missing:
            bad = True
        if not bad:
            print("POWIAZANIA aktualne, wszystkie pliki opisane")
        return 1 if bad else 0
    OUT.write_text(new, encoding="utf-8", newline="\n")
    print(f"POWIAZANIA.md: {len(files_all)} plików, {len(endpoints)} endpointów, {len(pages)} stron, "
          f"{len(tables)} tabel, {len(envs)} zmiennych env; odświeżone nagłówki: {len(changed)}")
    return 0


# ------------------------------------------------------- nagłówki w plikach
# Format (TS/JS):                         Format (Python / shell):
#   /** POWIĄZANIA                          # POWIĄZANIA
#    * Cel: ...                             # Cel: ...
#    * Przy zmianie: ...                    # Przy zmianie: ...
#    * AUTO używany przez: ...              # AUTO używany przez: ...
#    */                                     # /POWIĄZANIA
# Linie "Cel"/"Przy zmianie"/inne pisze człowiek/AI; linie "AUTO ..." przepisuje ten skrypt.
NEXT_SPECIAL = {"layout", "template", "loading", "error", "global-error", "not-found", "sitemap", "robots",
                "opengraph-image", "twitter-image", "icon", "apple-icon", "manifest", "middleware", "instrumentation"}
EXCLUDE = re.compile(r"(^|/)(__tests__|tests?)/|\.(test|spec)\.[jt]sx?$|(^|/)conftest\.py$|/__init__\.py$|(^|/)next-env\.d\.ts$|(^|/)(vitest|next|tailwind|postcss)\.config\.")


def is_excluded(r: str) -> bool:
    return bool(EXCLUDE.search(r))


def short_list(xs: list[str], n: int = 8) -> str:
    return ", ".join(xs[:n]) + (f" (+{len(xs) - n}, pełna lista: POWIAZANIA.md)" if len(xs) > n else "")


def update_header(t: str, suffix: str, auto: list[str]) -> tuple[str, bool]:
    if suffix in TS_EXT:
        m = re.search(r"/\*\* POWIĄZANIA.*?\*/", t, re.S)
        if not m:
            return t, False
        body = [l for l in m.group(0).split("\n")[:-1] if not re.match(r"\s*\* AUTO ", l)]
        block = "\n".join(body + [f" * {a}" for a in auto] + [" */"])
        return t[: m.start()] + block + t[m.end():], True
    m = re.search(r"^# POWIĄZANIA.*?^# /POWIĄZANIA$", t, re.S | re.M)
    if not m:
        return t, False
    body = [l for l in m.group(0).split("\n")[:-1] if not l.startswith("# AUTO ")]
    block = "\n".join(body + [f"# {a}" for a in auto] + ["# /POWIĄZANIA"])
    return t[: m.start()] + block + t[m.end():], True


if __name__ == "__main__":
    sys.exit(main("--check" in sys.argv))
