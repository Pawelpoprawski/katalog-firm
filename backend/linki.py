# POWIĄZANIA
# Cel: normalizacja pól firmy (strona www, Facebook, Instagram) i slugów ASCII - przy zapisie (storage.create_company /
#   update_company) i w jednorazowej poprawce danych (scripts/seo_katalog_2026_11.py). Audyt SEO 01.11.2026: wartości
#   bez https:// dawały względne linki = 404, slugi z „ł” i ozdobnymi literami Unicode dawały nieczytelne adresy.
# Przy zmianie: te same reguły linków w frontend/src/lib/linki.ts.
# AUTO używany przez: backend/storage.py, scripts/seo_katalog_2026_11.py
# /POWIĄZANIA
import re
import unicodedata

_DOMENA = re.compile(r"^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#].*)?$", re.I)
_UCHWYT_IG = re.compile(r"^@?[a-z0-9._]{2,30}$", re.I)
_UCHWYT_FB = re.compile(r"^@?[a-z0-9.]{5,50}$", re.I)


def link_zewnetrzny(wartosc, typ: str):
    """Adres https:// albo None, gdy wartość nie jest adresem (np. sama nazwa firmy)."""
    v = (wartosc or "").strip()
    if not v or v == "-":
        return None
    if re.fullmatch(r"https?://\S+", v, re.I):
        return v
    if re.search(r"\s", v):
        return None
    bez = v.lstrip("/")
    if typ == "instagram" and not re.search(r"instagram\.com", bez, re.I):
        return f"https://www.instagram.com/{bez.lstrip('@')}" if _UCHWYT_IG.fullmatch(bez) else None
    if typ == "facebook" and not re.search(r"(facebook|fb)\.com", bez, re.I):
        return f"https://www.facebook.com/{bez.lstrip('@')}" if _UCHWYT_FB.fullmatch(bez) and not _DOMENA.fullmatch(bez) else None
    return f"https://{re.sub(r'^www\.', 'www.', bez, flags=re.I)}" if _DOMENA.fullmatch(bez) else None


def normalizuj_linki(dane: dict) -> int:
    """Zamienia w słowniku firmy wartości wyglądające na adres na pełny https://. Wartości, które nie są adresem
    (np. sama nazwa), zostają bez zmian - frontend pokaże je jako tekst. Zwraca liczbę zmienionych pól."""
    zmienione = 0
    for typ in ("website", "facebook", "instagram"):
        v = dane.get(typ)
        if not isinstance(v, str) or not v.strip():
            continue
        nowy = link_zewnetrzny(v, typ)
        if nowy and nowy != v:
            dane[typ] = nowy
            zmienione += 1
    return zmienione


_ZNAKI = str.maketrans({"ł": "l", "Ł": "L", "ß": "ss", "æ": "ae", "Æ": "AE", "ø": "o", "Ø": "O", "đ": "d", "Đ": "D", "_": "-"})


def generuj_slug(tekst: str, max_dl: int = 80) -> str:
    """Slug z samych znaków a-z0-9 i myślników: NFKD zamienia ozdobne litery Unicode (np. 𝓞) na zwykłe, usuwa
    akcenty; ł i podobne zamieniane ręcznie. Długie slugi przycinane na granicy słowa."""
    if not tekst:
        return ""
    t = unicodedata.normalize("NFKD", tekst.translate(_ZNAKI))
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").translate(_ZNAKI)
    t = t.encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9\s-]", "", t)
    t = re.sub(r"[-\s]+", "-", t).strip("-")
    if len(t) > max_dl:
        t = t[:max_dl].rsplit("-", 1)[0] or t[:max_dl]
    return t
