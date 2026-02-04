#!/usr/bin/env python3
"""
Skrypt do konwersji wszystkich obrazów w companies.json do formatu WebP.
Zmniejsza rozmiar pliku poprzez:
- Konwersję JPG/PNG do WebP
- Resize do max 1200px
- Kompresję quality=85
"""

import json
import base64
import io
import os
from PIL import Image
from datetime import datetime

def convert_base64_to_webp(base64_str: str, max_size: int = 1200, quality: int = 85) -> str:
    """
    Konwertuje base64 image (JPG/PNG) do WebP.
    
    Args:
        base64_str: Data URI string (data:image/jpeg;base64,...)
        max_size: Maksymalny wymiar obrazka (px)
        quality: Jakość kompresji WebP (0-100)
    
    Returns:
        Nowy data URI z WebP
    """
    try:
        # Sprawdź czy to już WebP
        if "image/webp" in base64_str:
            print("  Already WebP, skipping")
            return base64_str
        
        # Wyciągnij base64 data (po przecinku)
        if ";base64," in base64_str:
            base64_data = base64_str.split(";base64,")[1]
        else:
            print("  Invalid format, skipping")
            return base64_str
        
        # Dekoduj base64
        image_data = base64.b64decode(base64_data)
        original_size = len(image_data)
        
        # Wczytaj obrazek
        img = Image.open(io.BytesIO(image_data))
        
        # Konwertuj do RGB jeśli potrzeba (RGBA/P/LA nie działa z JPEG/WebP)
        if img.mode in ("RGBA", "P", "LA"):
            # Stwórz białe tło dla przezroczystych obrazków
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        
        # Resize jeśli za duże
        if img.width > max_size or img.height > max_size:
            original_dims = (img.width, img.height)
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            print(f"  Resized: {original_dims} -> {img.size}")
        
        # Konwertuj do WebP
        buffer = io.BytesIO()
        img.save(buffer, format="WEBP", quality=quality, method=6)
        webp_data = buffer.getvalue()
        new_size = len(webp_data)
        
        # Statystyki
        reduction = ((original_size - new_size) / original_size) * 100
        print(f"  Size: {original_size//1024}KB -> {new_size//1024}KB ({reduction:.1f}% reduction)")
        
        # Zwróć jako base64
        webp_base64 = base64.b64encode(webp_data).decode()
        return f"data:image/webp;base64,{webp_base64}"
        
    except Exception as e:
        print(f"  ERROR converting image: {e}")
        return base64_str

def migrate_companies_to_webp(input_file: str, output_file: str = None, backup: bool = True):
    """
    Migruje wszystkie obrazy w companies.json do WebP.
    
    Args:
        input_file: Ścieżka do companies.json
        output_file: Ścieżka do nowego pliku (None = nadpisz)
        backup: Czy stworzyć backup oryginalnego pliku
    """
    print(f"🔄 Rozpoczynam migrację obrazków do WebP...")
    print(f"📂 Plik: {input_file}")
    
    # Wczytaj dane
    print("📥 Wczytuję companies.json...")
    with open(input_file, "r", encoding="utf-8") as f:
        companies = json.load(f)
    
    print(f"✅ Wczytano {len(companies)} firm")
    
    # Statystyki
    total_images = 0
    converted_images = 0
    total_size_before = os.path.getsize(input_file)
    
    # Konwertuj obrazy
    print("\n🖼️  Konwertuję obrazy...")
    for i, company in enumerate(companies, 1):
        company_id = company.get("id", "?")
        company_name = company.get("name", "Unknown")
        
        # Main image
        if company.get("img") and company["img"].startswith("data:image"):
            print(f"\n[{i}/{len(companies)}] {company_name} (ID: {company_id}) - Main image:")
            total_images += 1
            original = company["img"]
            company["img"] = convert_base64_to_webp(original)
            if company["img"] != original:
                converted_images += 1
        
        # Additional images (photos array)
        if company.get("photos") and isinstance(company["photos"], list):
            for j, photo in enumerate(company["photos"]):
                if photo and photo.startswith("data:image"):
                    print(f"\n[{i}/{len(companies)}] {company_name} (ID: {company_id}) - Photo {j+1}:")
                    total_images += 1
                    original = photo
                    company["photos"][j] = convert_base64_to_webp(original)
                    if company["photos"][j] != original:
                        converted_images += 1
    
    # Backup oryginalnego pliku
    if backup:
        backup_file = input_file.replace(".json", f"_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        print(f"\n💾 Tworzę backup: {backup_file}")
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump(companies, f, ensure_ascii=False)
    
    # Zapisz nowy plik
    output_path = output_file or input_file
    print(f"\n💾 Zapisuję do: {output_path}")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(companies, f, ensure_ascii=False, indent=2)
    
    # Statystyki końcowe
    total_size_after = os.path.getsize(output_path)
    size_reduction = ((total_size_before - total_size_after) / total_size_before) * 100
    
    print("\n" + "="*60)
    print("✅ MIGRACJA ZAKOŃCZONA!")
    print("="*60)
    print(f"📊 Statystyki:")
    print(f"  - Firm: {len(companies)}")
    print(f"  - Obrazów ogółem: {total_images}")
    print(f"  - Skonwertowanych: {converted_images}")
    print(f"  - Pomiętych (już WebP): {total_images - converted_images}")
    print(f"\n📦 Rozmiar pliku:")
    print(f"  - Przed: {total_size_before / (1024*1024):.2f} MB")
    print(f"  - Po: {total_size_after / (1024*1024):.2f} MB")
    print(f"  - Oszczędność: {(total_size_before - total_size_after) / (1024*1024):.2f} MB ({size_reduction:.1f}%)")
    print("="*60)

if __name__ == "__main__":
    # Ścieżka do pliku
    companies_file = "backend/data/companies.json"
    
    # Uruchom migrację
    migrate_companies_to_webp(
        input_file=companies_file,
        output_file=None,  # Nadpisz oryginalny
        backup=True  # Stwórz backup
    )
