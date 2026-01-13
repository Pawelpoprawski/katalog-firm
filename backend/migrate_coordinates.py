"""
One-time migration script to geocode existing companies without coordinates.
Run this script to add latitude/longitude to all companies in the database.

Usage:
    cd backend
    python migrate_coordinates.py
"""
import sys
import os

# Add parent directory to path to import from backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.storage import _read_list, _write_list, COMPANIES_FILE
from backend.geocoding import geocode_address, build_full_address
from backend.settings import get_settings


def migrate_coordinates():
    """Geocode all companies that don't have coordinates."""
    print("🗺️  Starting coordinate migration...")
    print("=" * 60)
    
    settings = get_settings()
    
    if not settings.google_maps_api_key:
        print("❌ Error: GOOGLE_MAPS_API_KEY not set in environment")
        print("Please add it to backend/.env file")
        return
    
    companies = _read_list(COMPANIES_FILE)
    total = len(companies)
    updated = 0
    skipped = 0
    failed = 0
    
    print(f"Found {total} companies in database\n")
    
    for idx, company in enumerate(companies, 1):
        name = company.get('name', 'Unknown')
        
        # Check if already has coordinates
        if company.get('latitude') and company.get('longitude'):
            print(f"[{idx}/{total}] ⏭️  {name} - Already has coordinates")
            skipped += 1
            continue
        
        # Build full address
        full_address = build_full_address(
            address=company.get('address', ''),
            city=company.get('city', ''),
            canton=company.get('canton', ''),
            postal_code=company.get('postal_code', ''),
            country='Switzerland'
        )
        
        if not full_address or len(full_address) < 10:
            print(f"[{idx}/{total}] ⚠️  {name} - Invalid address, skipping")
            failed += 1
            continue
        
        # Geocode
        print(f"[{idx}/{total}] 🔍 {name}")
        print(f"           Address: {full_address}")
        
        coords = geocode_address(full_address, settings.google_maps_api_key)
        
        if coords:
            company['latitude'] = coords[0]
            company['longitude'] = coords[1]
            print(f"           ✅ Success: ({coords[0]:.6f}, {coords[1]:.6f})")
            updated += 1
        else:
            print(f"           ❌ Failed to geocode")
            failed += 1
        
        print()
    
    # Save updated companies
    if updated > 0:
        _write_list(COMPANIES_FILE, companies)
        print("=" * 60)
        print(f"✅ Migration complete!")
        print(f"   Updated: {updated}")
        print(f"   Skipped: {skipped} (already had coordinates)")
        print(f"   Failed:  {failed}")
        print(f"   Total:   {total}")
    else:
        print("=" * 60)
        print("ℹ️  No updates needed")
        print(f"   Skipped: {skipped} (already had coordinates)")
        print(f"   Failed:  {failed}")


if __name__ == "__main__":
    try:
        migrate_coordinates()
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
