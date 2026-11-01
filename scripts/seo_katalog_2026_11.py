# POWIĄZANIA
# Cel: jednorazowa poprawka danych katalogu po audycie SEO 01.11.2026 - linki www/Facebook/Instagram bez https:// na
#   pełne adresy (backend/linki.py), slugi ze znakami spoza ASCII na ASCII (stary slug do „old_slugs”). Backup przed
#   zapisem, liczby w logu, sprawdzenie zgodności z mapą w frontend/src/middleware.ts.
# Przy zmianie: uruchamiać na serwerze z katalogu katalog_firm_psz: `python3 scripts/seo_katalog_2026_11.py [--dry]`,
#   potem `pm2 restart katalog-psz-backend` (cache listy firm w pamięci backendu).
# AUTO używany przez: nikt nie importuje (punkt wejścia: skrypt/cron/CLI - patrz Cel)
# /POWIĄZANIA
import json
import re
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
import linki  # noqa: E402

DRY = "--dry" in sys.argv
PLIK = ROOT / "backend" / "data" / "companies.json"
MW = (ROOT / "frontend" / "src" / "middleware.ts").read_text(encoding="utf-8")
mapa_mw = dict(re.findall(r'"([^"]+)":\s*\n?\s*"([^"]+)"', MW.split("STARE_SLUGI")[1].split("};")[0]))

firmy = json.loads(PLIK.read_text(encoding="utf-8"))
print(f"firm: {len(firmy)}")
zajete = {(c.get("slug") or "").lower() for c in firmy}
linki_zm, slugi_zm, niezgodne = 0, [], []
for c in firmy:
    przed = {k: c.get(k) for k in ("website", "facebook", "instagram")}
    n = linki.normalizuj_linki(c)
    if n:
        linki_zm += n
        print(f"  linki id={c['id']}: " + ", ".join(f"{k}: {przed[k]!r} -> {c[k]!r}" for k in przed if przed[k] != c.get(k)))
    stary = c.get("slug") or ""
    if stary and not re.fullmatch(r"[a-z0-9_-]+", stary):
        nowy = linki.generuj_slug(stary) or linki.generuj_slug(c.get("name", "")) or f"firma-{c['id']}"
        baza, i = nowy, 2
        while nowy.lower() in zajete:
            nowy = f"{baza}-{i}"
            i += 1
        zajete.add(nowy.lower())
        c["old_slugs"] = sorted(set((c.get("old_slugs") or []) + [stary]))
        c["slug"] = nowy
        slugi_zm.append((c["id"], stary, nowy))
        if mapa_mw.get(stary) != nowy:
            niezgodne.append((stary, nowy, mapa_mw.get(stary)))
        print(f"  slug id={c['id']}: {stary} -> {nowy}")

print(f"linki poprawione: {linki_zm} pól; slugi zmienione: {len(slugi_zm)}; w mapie middleware: {len(mapa_mw)}; niezgodne z mapą: {len(niezgodne)}")
if niezgodne:
    print("NIEZGODNE (popraw middleware.ts):", niezgodne)
    sys.exit(1)
if DRY:
    print("--dry: nic nie zapisano")
    sys.exit(0)
kopia = PLIK.with_name(f"companies.json.bak_seo_{time.strftime('%Y%m%d%H%M%S')}")
shutil.copy2(PLIK, kopia)
tmp = PLIK.with_suffix(".json.tmp")
tmp.write_text(json.dumps(firmy, ensure_ascii=False, indent=2), encoding="utf-8")
tmp.replace(PLIK)
print(f"zapisano; backup: {kopia}")
