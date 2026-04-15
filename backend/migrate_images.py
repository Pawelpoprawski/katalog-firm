"""
Migration script: Extract base64 images from companies.json to disk files.
Run once to migrate existing data. Safe to re-run (skips already migrated).

Usage: python -m backend.migrate_images
"""
import json
import base64
import sys
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
IMAGES_DIR = BASE_DIR / "static" / "images"
COMPANIES_FILE = DATA_DIR / "companies.json"


def extract_image(base64_str: str, company_id: int, image_type: str, index: int) -> str:
    """Extract base64 image to disk file. Returns new URL path or original string."""
    if not base64_str:
        return base64_str

    # Already migrated or external URL
    if base64_str.startswith("/images/") or not base64_str.startswith("data:image"):
        return base64_str

    try:
        if ";base64," not in base64_str:
            return base64_str

        header, encoded = base64_str.split(";base64,", 1)
        image_bytes = base64.b64decode(encoded)

        # Determine extension from mime type
        mime = header.replace("data:", "")
        ext = "webp" if "webp" in mime else "jpg" if "jpeg" in mime or "jpg" in mime else "png"

        filename = f"company_{company_id}_{image_type}_{index}.{ext}"
        filepath = IMAGES_DIR / filename
        filepath.write_bytes(image_bytes)

        return f"/images/{filename}"
    except Exception as e:
        print(f"  WARNING: Failed to extract image for company {company_id}: {e}")
        return base64_str


def migrate():
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Reading {COMPANIES_FILE}...")
    with open(COMPANIES_FILE, "r", encoding="utf-8") as f:
        companies = json.load(f)

    original_size = COMPANIES_FILE.stat().st_size
    print(f"Original size: {original_size / 1024 / 1024:.1f} MB, {len(companies)} companies")

    migrated_count = 0
    images_saved = 0

    for company in companies:
        cid = company.get("id", 0)
        changed = False

        # Migrate main image
        if company.get("img") and company["img"].startswith("data:image"):
            new_path = extract_image(company["img"], cid, "main", 0)
            if new_path != company["img"]:
                company["img"] = new_path
                changed = True
                images_saved += 1

        # Migrate photos
        if company.get("photos") and isinstance(company["photos"], list):
            new_photos = []
            for idx, photo in enumerate(company["photos"]):
                if photo and photo.startswith("data:image"):
                    new_path = extract_image(photo, cid, "photo", idx)
                    if new_path != photo:
                        images_saved += 1
                    new_photos.append(new_path)
                else:
                    new_photos.append(photo)
            if new_photos != company["photos"]:
                company["photos"] = new_photos
                changed = True

        if changed:
            migrated_count += 1
            print(f"  Migrated company {cid}: {company.get('name', '?')}")

    # Write updated JSON
    print(f"\nWriting updated companies.json...")
    with open(COMPANIES_FILE, "w", encoding="utf-8") as f:
        json.dump(companies, f, ensure_ascii=False, indent=2)

    new_size = COMPANIES_FILE.stat().st_size
    print(f"\nDone!")
    print(f"  Companies migrated: {migrated_count}")
    print(f"  Images saved to disk: {images_saved}")
    print(f"  JSON size: {original_size / 1024 / 1024:.1f} MB -> {new_size / 1024 / 1024:.1f} MB")
    if original_size > 0:
        print(f"  Reduction: {(original_size - new_size) / 1024 / 1024:.1f} MB ({(1 - new_size/original_size)*100:.0f}%)")


if __name__ == "__main__":
    migrate()
