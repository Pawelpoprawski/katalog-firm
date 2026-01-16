"""
Skrypt importu firm z folderu uslugi/ do JSON database.
Kompresuje obrazy do WebP dla lepszej wydajności.
Uruchomienie: python import_uslugi.py
"""

import json
import base64
import time
import io
from pathlib import Path
from secrets import token_urlsafe

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("⚠ Pillow nie zainstalowane. Użyj: pip install Pillow")
    print("  Obrazy nie będą kompresowane do WebP.")

# Ścieżki
USLUGI_DIR = Path(__file__).parent / "uslugi"
COMPANIES_FILE = Path(__file__).parent / "backend" / "data" / "companies.json"

# Ustawienia kompresji
MAX_WIDTH = 800  # Max szerokość dla thumbnails
MAX_HEIGHT = 600
WEBP_QUALITY = 75  # Jakość WebP (0-100)

# Mapowanie kategorii ze źródła na ID w systemie
CATEGORY_MAP = {
    "beauty": 1,
    "zdrowie": 10,
    "remont": 6,
    "samochód / transport": 8,
    "samochod-transport": 8,
    "transport": 8,
    "sprzątanie": 9,
    "sprzatanie": 9,
    "gastronomia": 5,
    "edukacja": 3,
    "fotografia": 4,
    "cv & tłumaczenia": 2,
    "cv-tlumaczenia": 2,
    "technika dźwięku i światła": 7,
    "różne": 7,
    "rozne": 7,
}

def get_category_id(categories: list) -> int:
    """Mapuje kategorię ze źródła na ID w systemie."""
    if not categories:
        return 7  # Różne
    
    for cat in categories:
        slug = (cat.get("slug") or "").lower()
        name = (cat.get("name") or "").lower()
        
        if slug in CATEGORY_MAP:
            return CATEGORY_MAP[slug]
        if name in CATEGORY_MAP:
            return CATEGORY_MAP[name]
    
    return 7  # Domyślnie: Różne

def compress_image_to_webp(image_path: Path) -> str | None:
    """Kompresuje obraz do WebP i zwraca base64."""
    if not image_path.exists():
        return None
    
    try:
        if HAS_PIL:
            # Otwórz i przekonwertuj na RGB (WebP nie obsługuje wszystkich trybów)
            with Image.open(image_path) as img:
                # Konwertuj do RGB jeśli potrzeba
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Utwórz białe tło dla przezroczystych obrazów
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Zmniejsz rozmiar jeśli za duży
                if img.width > MAX_WIDTH or img.height > MAX_HEIGHT:
                    img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.Resampling.LANCZOS)
                
                # Zapisz do bufora jako WebP
                buffer = io.BytesIO()
                img.save(buffer, format='WEBP', quality=WEBP_QUALITY, optimize=True)
                buffer.seek(0)
                
                data = base64.b64encode(buffer.read()).decode('utf-8')
                return f"data:image/webp;base64,{data}"
        else:
            # Fallback: zwykłe base64 bez kompresji
            suffix = image_path.suffix.lower()
            mime_types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
            mime_type = mime_types.get(suffix, "image/jpeg")
            
            with open(image_path, "rb") as f:
                data = base64.b64encode(f.read()).decode("utf-8")
            return f"data:{mime_type};base64,{data}"
            
    except Exception as e:
        print(f"  ⚠ Błąd przy kompresji {image_path.name}: {e}")
        return None

def get_main_image(company_dir: Path) -> str | None:
    """Pobiera główne zdjęcie z folderu zdjecie_glowne/."""
    main_dir = company_dir / "zdjecie_glowne"
    if not main_dir.exists():
        return None
    
    for img_file in main_dir.iterdir():
        if img_file.is_file() and img_file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            return compress_image_to_webp(img_file)
    return None

def get_gallery_images(company_dir: Path, max_images: int = 10) -> list[str]:
    """Pobiera zdjęcia galerii z folderu reszta_zdjec/ (max 10 dla wydajności)."""
    gallery_dir = company_dir / "reszta_zdjec"
    if not gallery_dir.exists():
        return []
    
    images = []
    for img_file in sorted(gallery_dir.iterdir())[:max_images]:
        if img_file.is_file() and img_file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            base64_img = compress_image_to_webp(img_file)
            if base64_img:
                images.append(base64_img)
    return images

def generate_slug(text: str) -> str:
    """Generuje slug z tekstu."""
    import unicodedata
    import re
    
    if not text:
        return ""
    
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")

def clean_text(text: str) -> str:
    """Usuwa tagi HTML z tekstu (dla nazwy i short_description)."""
    import re
    if not text:
        return ""
    # Usuń tagi HTML
    text = re.sub(r'<[^>]+>', ' ', text)
    # Zamień encje HTML
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&#8211;', '–').replace('&#8217;', "'").replace('&#038;', '&')
    # Normalizuj whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def sanitize_html(html: str) -> str:
    """Konwertuje HTML na prostszy format bez skomplikowanych tagów."""
    import re
    if not html:
        return ""
    
    # Zamień encje HTML
    html = html.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    html = html.replace('&#8211;', '–').replace('&#8217;', "'").replace('&#038;', '&')
    html = html.replace('&nbsp;', ' ')
    
    # Usuń niebezpieczne tagi (script, style, iframe)
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<iframe[^>]*>.*?</iframe>', '', html, flags=re.DOTALL | re.IGNORECASE)
    
    # Usuń atrybuty onclick, onerror, class, id, style, data-* itp.
    html = re.sub(r'\s+(on\w+|class|id|style|data-\w+)="[^"]*"', '', html, flags=re.IGNORECASE)
    
    # Konwertuj nagłówki h1-h6 na pogrubiony tekst w paragrafie
    html = re.sub(r'<h[1-6][^>]*>(.*?)</h[1-6]>', r'<p><strong>\1</strong></p>', html, flags=re.DOTALL | re.IGNORECASE)
    
    # Usuń zbędne wrappery (article, div, span, section)
    html = re.sub(r'<(article|div|section|span)[^>]*>', '', html, flags=re.IGNORECASE)
    html = re.sub(r'</(article|div|section|span)>', '', html, flags=re.IGNORECASE)
    
    # Zachowaj tylko dozwolone tagi: p, ul, ol, li, strong, b, em, i, br (bez 'a' - zagnieżdżone linki powodują błąd hydracji)
    allowed_tags = ['p', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'br']
    
    def clean_tag(match):
        full_tag = match.group(0)
        tag_name = match.group(1).lower()
        if tag_name in allowed_tags:
            return f'<{tag_name}>'
        return ''
    
    # Wyczyść tagi otwierające
    html = re.sub(r'<([a-zA-Z][a-zA-Z0-9]*)[^>]*>', clean_tag, html)
    
    # Wyczyść tagi zamykające (zachowaj tylko dozwolone)
    def clean_closing_tag(match):
        tag_name = match.group(1).lower()
        if tag_name in allowed_tags:
            return f'</{tag_name}>'
        return ''
    
    html = re.sub(r'</([a-zA-Z][a-zA-Z0-9]*)>', clean_closing_tag, html)
    
    # Normalizuj whitespace
    html = re.sub(r'\n\s*\n', '\n', html)
    html = re.sub(r'  +', ' ', html)
    
    return html.strip()

def import_companies():
    """Główna funkcja importu."""
    print("=" * 60)
    print("Import firm z folderu uslugi/ (z kompresją WebP)")
    print("=" * 60)
    
    if HAS_PIL:
        print(f"✓ Pillow zainstalowane - kompresja WebP aktywna")
        print(f"  Max rozmiar: {MAX_WIDTH}x{MAX_HEIGHT}, jakość: {WEBP_QUALITY}%")
    
    # CZYŚCIMY BAZĘ - zaczynamy od nowa
    print("\n🗑️  Czyszczenie istniejących firm z bazy...")
    companies = []
    existing_slugs = set()
    max_id = 0
    
    # Demo user ID (domyślnie 1)
    demo_user_id = 1
    
    imported = 0
    skipped = 0
    errors = 0
    total_size = 0
    
    # Iteruj po folderach firm
    folders = sorted([d for d in USLUGI_DIR.iterdir() if d.is_dir()])
    total_folders = len(folders)
    
    for idx, company_dir in enumerate(folders, 1):
        dane_file = company_dir / "dane.json"
        if not dane_file.exists():
            continue
        
        try:
            with open(dane_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"❌ [{idx}/{total_folders}] Błąd czytania {dane_file}: {e}")
            errors += 1
            continue
        
        name = data.get("title", "").strip()
        if not name:
            skipped += 1
            continue
        
        # Generuj unikalny slug
        base_slug = generate_slug(name) or f"firma-{max_id + 1}"
        slug = base_slug
        counter = 1
        while slug.lower() in existing_slugs:
            slug = f"{base_slug}-{counter}"
            counter += 1
        existing_slugs.add(slug.lower())
        
        # Pobierz zdjęcia (z kompresją)
        print(f"📁 [{idx}/{total_folders}] {name[:45]}...", end=" ", flush=True)
        main_img = get_main_image(company_dir)
        gallery = get_gallery_images(company_dir, max_images=10)
        
        # Mapuj kategorię
        category_id = get_category_id(data.get("categories", []))
        
        # Pobierz social links
        facebook = ""
        instagram = ""
        for link in (data.get("social_links") or []):
            if link.get("id") == "facebook":
                facebook = link.get("url", "")
            elif link.get("id") == "instagram":
                instagram = link.get("url", "")
        
        # Parsuj koordynaty
        try:
            latitude = float(data.get("latitude") or 0) or None
            longitude = float(data.get("longitude") or 0) or None
        except (ValueError, TypeError):
            latitude = None
            longitude = None
        
        max_id += 1
        
        # Parse city and canton from address
        # Address format: "City, District, Canton, ZIP, Country"
        address = data.get("address", "").strip()
        city = None
        canton = None
        if address:
            parts = [p.strip() for p in address.split(",")]
            if len(parts) >= 3:
                city = parts[0]  # First part is usually city
                canton = parts[-3]  # Third from end is usually canton (before ZIP and Country)
                # Common canton abbreviations
                canton_map = {
                    "St. Gallen": "SG",
                    "Zürich": "ZH",
                    "Bern": "BE",
                    "Luzern": "LU",
                    "Aargau": "AG",
                    "Thurgau": "TG",
                    "Genève": "GE",
                    "Vaud": "VD",
                    "Basel-Stadt": "BS",
                    "Basel-Landschaft": "BL",
                    "Ticino": "TI",
                    "Wallis": "VS",
                    "Graubünden": "GR"
                }
                canton = canton_map.get(canton, canton[:2].upper() if canton else None)
        
        # Merge description and offer into single field (offer removed from separate field)
        description = sanitize_html(data.get("content", "")) or ""
        # Note: offer field removed - description now contains all company info
        
        company = {
            "id": max_id,
            "name": clean_text(name),
            "slug": slug,
            "short_description": clean_text(data.get("yoast_description", ""))[:200] or None,
            "description": description or None,
            "phone": data.get("phone", "").strip() or None,
            "whatsapp": None,
            "email": data.get("email", "").strip() or None,
            "website": data.get("website", "").strip() or None,
            "facebook": facebook or None,
            "instagram": instagram or None,
            "address": address or None,
            "city": city,
            "canton": canton,
            "postal_code": data.get("zip", "").strip() or None,
            "country": "Switzerland",
            "latitude": latitude,
            "longitude": longitude,
            "category_id": category_id,
            "tags": None,
            "img": main_img,
            "photos": gallery if gallery else None,
            "is_active": True,
            "is_verified": False,
            "is_promoted": False,
            "status": "published",
            "owner_id": demo_user_id,
            "edit_token": token_urlsafe(32),
            "views": data.get("views_count", 0) or 0,
            "clicks": 0,
            "created_at": time.time(),
        }
        
        companies.append(company)
        imported += 1
        
        # Oblicz rozmiar danych
        company_size = len(json.dumps(company))
        total_size += company_size
        
        img_status = "✓" if main_img else "✗"
        gal_count = len(gallery) if gallery else 0
        print(f"img:{img_status} gal:{gal_count} ({company_size//1024}KB)")
    
    # Zapisz do pliku
    print("\n" + "=" * 60)
    print(f"Zapisywanie do {COMPANIES_FILE}...")
    
    with open(COMPANIES_FILE, "w", encoding="utf-8") as f:
        json.dump(companies, f, ensure_ascii=False, indent=2)
    
    file_size = COMPANIES_FILE.stat().st_size / (1024 * 1024)
    
    print(f"\n✅ Import zakończony!")
    print(f"   Zaimportowano: {imported}")
    print(f"   Pominięto: {skipped}")
    print(f"   Błędy: {errors}")
    print(f"   Rozmiar pliku: {file_size:.1f} MB")

if __name__ == "__main__":
    import_companies()
