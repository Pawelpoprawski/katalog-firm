from __future__ import annotations

import json
import logging
import re
import threading
import time
import secrets
from pathlib import Path
from typing import Any, Optional
import unicodedata

from .geocoding import geocode_address, build_full_address
from .settings import get_settings

logger = logging.getLogger(__name__)

import time as _time_module


class _Cache:
    """Simple in-memory cache with TTL."""
    def __init__(self):
        self._data: dict[str, tuple[float, Any]] = {}
        self._ttl = 60  # 60 seconds default TTL

    def get(self, key: str) -> Any | None:
        if key in self._data:
            ts, val = self._data[key]
            if _time_module.time() - ts < self._ttl:
                return val
            del self._data[key]
        return None

    def set(self, key: str, value: Any) -> None:
        self._data[key] = (_time_module.time(), value)

    def invalidate(self, *keys: str) -> None:
        for key in keys:
            self._data.pop(key, None)

    def invalidate_all(self) -> None:
        self._data.clear()


_cache = _Cache()


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

USERS_FILE = DATA_DIR / "users.json"
CATEGORIES_FILE = DATA_DIR / "categories.json"
COMPANIES_FILE = DATA_DIR / "companies.json"
REVIEWS_FILE = DATA_DIR / "reviews.json"
REPORTS_FILE = DATA_DIR / "reports.json"
STATS_FILE = DATA_DIR / "stats.json"
ANALYTICS_FILE = DATA_DIR / "analytics.json"

_lock = threading.RLock()  # Reentrant lock - allows nested locks


def _now_ts() -> float:
    return time.time()


def _ensure_file(path: Path, default_value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(json.dumps(default_value, ensure_ascii=False, indent=2), encoding="utf-8")


def init_storage() -> None:
    """
    Initializes JSON "DB" files in backend/data/.
    This mirrors the idea from the `react` repo (file-based persistence).
    """
    _ensure_file(USERS_FILE, [])
    _ensure_file(COMPANIES_FILE, [])
    _ensure_file(REVIEWS_FILE, [])
    _ensure_file(REPORTS_FILE, [])
    _ensure_file(STATS_FILE, [])

    # Seed categories only if file doesn't exist yet (or is empty)
    _ensure_file(CATEGORIES_FILE, [])
    cats = _read_list(CATEGORIES_FILE)
    if not cats:
        seed = [
            {"id": 1, "name": "Budownictwo", "slug": "budownictwo", "description": "Remonty, wykończenia, budowa."},
            {"id": 2, "name": "Transport", "slug": "transport", "description": "Przeprowadzki, przewozy, logistyka."},
            {"id": 3, "name": "Zdrowie", "slug": "zdrowie", "description": "Lekarze, fizjo, usługi zdrowotne."},
            {"id": 4, "name": "Finanse", "slug": "finanse", "description": "Księgowość, podatki, ubezpieczenia."},
            {"id": 5, "name": "Gastronomia", "slug": "gastronomia", "description": "Restauracje, catering, piekarnie."},
            {"id": 6, "name": "IT", "slug": "it", "description": "Strony www, aplikacje, serwis komputerów."},
            {"id": 7, "name": "Edukacja", "slug": "edukacja", "description": "Korepetycje, kursy językowe, szkolenia."},
            {"id": 8, "name": "Beauty & Wellness", "slug": "beauty-wellness", "description": "Salony fryzjerskie, spa, wellness."},
            {"id": 9, "name": "Nieruchomości", "slug": "nieruchomosci", "description": "Agencje nieruchomości, zarządzanie."},
            {"id": 10, "name": "Prawo", "slug": "prawo", "description": "Kancelarie prawne, doradztwo prawne."},
        ]
        _write_list(CATEGORIES_FILE, seed)

    # seed_companies i seed_reviews zostaly usuniete (24.04.2026) -
    # na produkcji byly juz realne dane; seed tworzyl fikcyjne rekordy
    # przywracajac fake recenzje do realnych firm (patrz: id=15 Bergrestaurant)


def _read_list(path: Path) -> list[dict]:
    _ensure_file(path, [])
    raw = path.read_text(encoding="utf-8")
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.warning("Failed to read %s: %s, returning empty list", path, e)
        return []


def _write_list(path: Path, data: list[dict]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def generate_slug(text: str) -> str:
    """Generate URL-friendly slug from text (lowercase, no Polish chars, dashes)."""
    if not text:
        return ""
    # Normalize unicode (NFD) and remove diacritics
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Convert to lowercase and replace spaces/special chars with dashes
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")


def _next_id(items: list[dict]) -> int:
    max_id = 0
    for it in items:
        try:
            max_id = max(max_id, int(it.get("id") or 0))
        except Exception:
            continue
    return max_id + 1


from datetime import datetime

def _get_today_str():
    return datetime.now().strftime("%Y-%m-%d")

def _update_stats(company_id: int, field: str):
    """Update stats for a specific day and company."""
    if field not in ("views", "clicks"):
        return
    
    today = _get_today_str()
    with _lock:
        stats = _read_list(STATS_FILE)
        
        # Find entry for today and company
        found = False
        for entry in stats:
            if entry.get("date") == today and entry.get("company_id") == company_id:
                entry[field] = (entry.get(field) or 0) + 1
                found = True
                break
        
        if not found:
            stats.append({
                "date": today,
                "company_id": company_id,
                "views": 1 if field == "views" else 0,
                "clicks": 1 if field == "clicks" else 0
            })
            
        _write_list(STATS_FILE, stats)


# ---------- Users ----------
def get_or_create_demo_user() -> dict:
    with _lock:
        users = _read_list(USERS_FILE)
        demo = next((u for u in users if (u.get("email") or "").lower() == "demo@example.com"), None)
        if demo:
            return demo
        user = {
            "id": _next_id(users),
            "email": "demo@example.com",
            "hashed_password": "demo",  # for dev only; real auth later
            "full_name": "Demo User",
            "is_admin": False,
            "created_at": _now_ts(),
        }
        users.append(user)
        _write_list(USERS_FILE, users)
        return user


def find_user_by_email(email: str) -> Optional[dict]:
    if not email:
        return None
    with _lock:
        users = _read_list(USERS_FILE)
        return next((u for u in users if (u.get("email") or "").lower() == email.lower()), None)


def create_user(email: str, hashed_password: str, full_name: Optional[str]) -> dict:
    with _lock:
        users = _read_list(USERS_FILE)
        if any((u.get("email") or "").lower() == email.lower() for u in users):
            raise ValueError("Email exists")
        user = {
            "id": _next_id(users),
            "email": email,
            "hashed_password": hashed_password,
            "full_name": full_name,
            "is_admin": False,
            "created_at": _now_ts(),
        }
        users.append(user)
        _write_list(USERS_FILE, users)
        return user


# ---------- Categories ----------
def list_categories() -> list[dict]:
    cached = _cache.get("categories")
    if cached is not None:
        return cached
    with _lock:
        cats = _read_list(CATEGORIES_FILE)
        _cache.set("categories", cats)
        return cats


def create_category(payload: dict) -> dict:
    with _lock:
        cats = _read_list(CATEGORIES_FILE)
        slug = (payload.get("slug") or "").strip().lower()
        if any((c.get("slug") or "").lower() == slug for c in cats):
            raise ValueError("Slug exists")
        cat = {"id": _next_id(cats), **payload}
        cats.append(cat)
        _write_list(CATEGORIES_FILE, cats)
        _cache.invalidate("categories")
        return cat


def update_category(category_id: int, payload: dict) -> dict:
    """Update an existing category."""
    with _lock:
        cats = _read_list(CATEGORIES_FILE)
        for cat in cats:
            if cat.get("id") == category_id:
                cat.update(payload)
                _write_list(CATEGORIES_FILE, cats)
                _cache.invalidate("categories")
                return cat
        raise KeyError("Category not found")


def delete_category(category_id: int) -> None:
    """Delete a category by ID."""
    with _lock:
        cats = _read_list(CATEGORIES_FILE)
        original_len = len(cats)
        cats = [c for c in cats if c.get("id") != category_id]
        if len(cats) == original_len:
            raise KeyError("Category not found")
        _write_list(CATEGORIES_FILE, cats)
        _cache.invalidate("categories")


# ---------- Companies ----------
def list_companies() -> list[dict]:
    """List all companies, ensuring they have slugs."""
    cached = _cache.get("companies")
    if cached is not None:
        return cached
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        # Ensure all companies have slugs
        updated = False
        for company in companies:
            if not company.get("slug"):
                company["slug"] = generate_slug(company.get("name", "")) or f"firma-{company.get('id')}"
                updated = True
        if updated:
            _write_list(COMPANIES_FILE, companies)
        _cache.set("companies", companies)
        return companies


def get_company(company_id: int) -> Optional[dict]:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        return next((c for c in companies if int(c.get("id") or 0) == company_id), None)


def get_company_by_slug(slug: str) -> Optional[dict]:
    """Get company by slug."""
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        return next((c for c in companies if (c.get("slug") or "").lower() == slug.lower()), None)


def create_company(payload: dict) -> dict:
    from datetime import datetime
    from .image_utils import convert_base64_to_webp, save_image_to_disk
    
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        demo_user = get_or_create_demo_user()
        
        # Generate slug if not provided
        slug = payload.get("slug") or generate_slug(payload.get("name", ""))
        if not slug:
            slug = f"firma-{_next_id(companies)}"

        
        # Ensure unique slug
        base_slug = slug
        counter = 1
        while any((c.get("slug") or "").lower() == slug.lower() for c in companies):
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        # Geocode address if coordinates not provided
        if not payload.get('latitude') or not payload.get('longitude'):
            from .settings import get_settings as get_app_settings
            app_settings = get_app_settings()
            api_key = app_settings.google_maps_api_key
            if api_key:
                full_address = build_full_address(
                    address=payload.get('address', ''),
                    city=payload.get('city', ''),
                    canton=payload.get('canton', ''),
                    postal_code=payload.get('postal_code', ''),
                    country='Switzerland'
                )
                coords = geocode_address(full_address, api_key)
                if coords:
                    payload['latitude'] = coords[0]
                    payload['longitude'] = coords[1]
        
        # Convert images to WebP and save to disk
        company_id_for_img = _next_id(companies)
        if payload.get('img'):
            payload['img'] = save_image_to_disk(payload['img'], company_id_for_img, "main", 0)
        if payload.get('photos') and isinstance(payload['photos'], list):
            payload['photos'] = [save_image_to_disk(photo, company_id_for_img, "photo", idx) for idx, photo in enumerate(payload['photos']) if photo]

        company = {
            **payload,  # Apply payload first
            "id": _next_id(companies),
            "owner_id": int(demo_user["id"]),
            "is_active": True,
            "is_verified": False,
            "slug": slug,  # Ensure calculated slug is used
            "status": payload.get("status", "draft"),  # ✨ NEW: Default to draft status
            "edit_token": secrets.token_urlsafe(32),
            "views": 0,
            "profile_views": 0,
            "clicks": 0,
            "created_at": _now_ts(),
            "last_confirmed_at": datetime.now().isoformat(),  # Data utworzenia
        }
        companies.append(company)
        _write_list(COMPANIES_FILE, companies)
        _cache.invalidate("companies")
        return company


def update_company(company_id: int, updates: dict) -> dict:
    from datetime import datetime
    from .image_utils import save_image_to_disk

    # Convert images to WebP and save to disk
    if updates.get('img'):
        updates['img'] = save_image_to_disk(updates['img'], company_id, "main", 0)
    if updates.get('photos') and isinstance(updates['photos'], list):
        updates['photos'] = [save_image_to_disk(photo, company_id, "photo", idx) for idx, photo in enumerate(updates['photos']) if photo]
    
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        for idx, c in enumerate(companies):
            if int(c.get("id") or 0) != company_id:
                continue
            merged = {**c, **updates, "id": company_id, "updated_at": _now_ts()}
            companies[idx] = merged
            _write_list(COMPANIES_FILE, companies)
            _cache.invalidate("companies")
            return merged
        raise KeyError("Not found")


def delete_company(company_id: int) -> None:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        new_list = [c for c in companies if int(c.get("id") or 0) != company_id]
        if len(new_list) == len(companies):
            raise KeyError("Not found")
        _write_list(COMPANIES_FILE, new_list)
        _cache.invalidate("companies")


# ---------- Stats ----------
def increment_view(company_id: int) -> None:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        for idx, c in enumerate(companies):
            if int(c.get("id") or 0) == company_id:
                c["views"] = (c.get("views") or 0) + 1
                companies[idx] = c
                _write_list(COMPANIES_FILE, companies)
                _cache.invalidate("companies")

                # Update granular stats
                _update_stats(company_id, "views")
                return


def increment_profile_view(company_id: int) -> None:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        for idx, c in enumerate(companies):
            if int(c.get("id") or 0) == company_id:
                c["profile_views"] = (c.get("profile_views") or 0) + 1
                companies[idx] = c
                _write_list(COMPANIES_FILE, companies)
                _cache.invalidate("companies")
                return


def increment_click(company_id: int) -> None:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        for idx, c in enumerate(companies):
            if int(c.get("id") or 0) == company_id:
                c["clicks"] = (c.get("clicks") or 0) + 1
                companies[idx] = c
                _write_list(COMPANIES_FILE, companies)
                _cache.invalidate("companies")

                # Update granular stats
                _update_stats(company_id, "clicks")
                return


def verify_edit_token(token: str, email: str) -> Optional[dict]:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        for c in companies:
            if c.get("edit_token") == token:
                # Basic email check (case insensitive)
                if (c.get("email") or "").strip().lower() == email.strip().lower():
                    return c
        return None
def list_reviews(company_id: Optional[int] = None) -> list[dict]:
    with _lock:
        reviews = _read_list(REVIEWS_FILE)
        if company_id:
            return [r for r in reviews if int(r.get("company_id") or 0) == int(company_id)]
        return reviews


def create_review(payload: dict) -> dict:
    logger.info("storage.create_review called with payload: %s", payload)
    try:
        with _lock:
            reviews = _read_list(REVIEWS_FILE)
            logger.info("Loaded %d reviews from file", len(reviews))
            demo_user = get_or_create_demo_user()
            logger.info("Using demo user id=%s", demo_user.get("id"))

            company_id = payload.get("company_id")
            logger.info("Looking for company_id=%s", company_id)
            company: Optional[dict] = None
            if company_id:
                company = get_company(int(company_id))
            if not company:
                # fallback: first company or create minimal demo
                companies = _read_list(COMPANIES_FILE)
                logger.info("Company not found, checking companies list (len=%d)", len(companies))
                if companies:
                    company = companies[0]
                    logger.info("Using first company id=%s", company.get("id"))
                else:
                    logger.info("No companies, creating demo company")
                    company = create_company({"name": "Demo Company", "country": "Switzerland"})

            review = {
                "id": _next_id(reviews),
                "author_id": int(demo_user["id"]),
                "company_id": int(company["id"]),
                "rating": int(payload.get("rating") or 0),
                "comment": payload.get("comment"),
                "ip_address": payload.get("ip_address", "unknown"),
                "created_at": _now_ts(),
            }
            logger.info("Created review object: %s", review)
            reviews.append(review)
            _write_list(REVIEWS_FILE, reviews)
            logger.info("Saved review to file, total reviews: %d", len(reviews))
            return review
    except Exception as e:
        logger.exception("Error in create_review: %s", e)
        raise


# ---------- Reports (review abuse) ----------
def delete_review(review_id: int) -> None:
    """Delete a review by ID."""
    with _lock:
        reviews = _read_list(REVIEWS_FILE)
        new_list = [r for r in reviews if int(r.get("id") or 0) != review_id]
        if len(new_list) == len(reviews):
            raise KeyError("Review not found")
        _write_list(REVIEWS_FILE, new_list)


def list_reports() -> list[dict]:
    with _lock:
        return _read_list(REPORTS_FILE)


def create_report(payload: dict) -> dict:
    with _lock:
        reports = _read_list(REPORTS_FILE)
        report = {
            "id": _next_id(reports),
            "review_id": int(payload.get("review_id") or 0),
            "reason": (payload.get("reason") or "").strip() or "Brak powodu",
            "created_at": _now_ts(),
        }
        reports.append(report)
        _write_list(REPORTS_FILE, reports)
        return report

def get_daily_stats(days: int = 30) -> list[dict]:
    with _lock:
        stats = _read_list(STATS_FILE)
        # Aggregate by date
        aggregated: dict[str, dict] = {}
        for entry in stats:
            date = entry.get("date", "")
            if date not in aggregated:
                aggregated[date] = {"date": date, "views": 0, "clicks": 0}
            aggregated[date]["views"] += entry.get("views", 0)
            aggregated[date]["clicks"] += entry.get("clicks", 0)
        # Sort by date and return last N days
        sorted_stats = sorted(aggregated.values(), key=lambda x: x["date"])
        return sorted_stats[-days:]


# ---------- Analytics (global daily tracking) ----------

def _read_analytics() -> dict:
    """Read analytics data. Structure: {date: {views, ips: [...], new_companies, new_reviews}}"""
    try:
        if ANALYTICS_FILE.exists():
            with open(ANALYTICS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _write_analytics(data: dict) -> None:
    with open(ANALYTICS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def track_page_view(ip_address: str) -> None:
    """Track a page view and unique IP for today."""
    today = _get_today_str()
    with _lock:
        analytics = _read_analytics()
        if today not in analytics:
            analytics[today] = {"views": 0, "impressions": 0, "ips": [], "new_companies": 0, "new_reviews": 0}
        analytics[today]["views"] = analytics[today].get("views", 0) + 1
        if ip_address and ip_address not in analytics[today].get("ips", []):
            analytics[today].setdefault("ips", []).append(ip_address)
        _write_analytics(analytics)


def track_impressions(count: int = 1) -> None:
    """Track card impressions from scroll views (batch)."""
    today = _get_today_str()
    with _lock:
        analytics = _read_analytics()
        if today not in analytics:
            analytics[today] = {"views": 0, "impressions": 0, "ips": [], "new_companies": 0, "new_reviews": 0}
        analytics[today]["impressions"] = analytics[today].get("impressions", 0) + count
        _write_analytics(analytics)


def track_new_company() -> None:
    """Track a new company added today."""
    today = _get_today_str()
    with _lock:
        analytics = _read_analytics()
        if today not in analytics:
            analytics[today] = {"views": 0, "ips": [], "new_companies": 0, "new_reviews": 0}
        analytics[today]["new_companies"] = analytics[today].get("new_companies", 0) + 1
        _write_analytics(analytics)


def track_new_review() -> None:
    """Track a new review added today."""
    today = _get_today_str()
    with _lock:
        analytics = _read_analytics()
        if today not in analytics:
            analytics[today] = {"views": 0, "ips": [], "new_companies": 0, "new_reviews": 0}
        analytics[today]["new_reviews"] = analytics[today].get("new_reviews", 0) + 1
        _write_analytics(analytics)


def track_confirmation_email_sent(count: int = 1) -> None:
    """Track confirmation-request emails sent today (batch)."""
    today = _get_today_str()
    with _lock:
        analytics = _read_analytics()
        if today not in analytics:
            analytics[today] = {"views": 0, "ips": [], "new_companies": 0, "new_reviews": 0}
        analytics[today]["confirmation_emails_sent"] = analytics[today].get("confirmation_emails_sent", 0) + count
        _write_analytics(analytics)


def track_confirmation_received() -> None:
    """Track a received activity confirmation today."""
    today = _get_today_str()
    with _lock:
        analytics = _read_analytics()
        if today not in analytics:
            analytics[today] = {"views": 0, "ips": [], "new_companies": 0, "new_reviews": 0}
        analytics[today]["confirmations_received"] = analytics[today].get("confirmations_received", 0) + 1
        _write_analytics(analytics)


def get_analytics(days: int = 30) -> list[dict]:
    """Get analytics for the last N days."""
    from datetime import timedelta
    with _lock:
        analytics = _read_analytics()

    today = datetime.now()
    result = []
    for i in range(days - 1, -1, -1):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        day_data = analytics.get(date, {})
        result.append({
            "date": date,
            "views": day_data.get("impressions", 0),  # Scroll impressions = "wyświetlenia"
            "unique_ips": len(day_data.get("ips", [])),
            "new_companies": day_data.get("new_companies", 0),
            "new_reviews": day_data.get("new_reviews", 0),
            "confirmation_emails_sent": day_data.get("confirmation_emails_sent", 0),
            "confirmations_received": day_data.get("confirmations_received", 0),
        })
    return result


# Settings management
SETTINGS_FILE = DATA_DIR / "settings.json"


def get_settings() -> dict:
    """Get application settings including social media links."""
    try:
        if not SETTINGS_FILE.exists():
            # Create default settings
            default_settings = {
                "social_media": {
                    "facebook": "",
                    "youtube": "",
                    "instagram": "",
                    "tiktok": "",
                    "facebook_group": ""
                }
            }
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(default_settings, f, indent=2, ensure_ascii=False)
            return default_settings
        
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading settings: {e}")
        return {"social_media": {}}


def update_social_media(social_media: dict) -> dict:
    """Update social media links (thread-safe)."""
    with _lock:
        settings = get_settings()
        settings["social_media"] = social_media
        tmp = SETTINGS_FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(settings, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(SETTINGS_FILE)
    return settings


def get_newsletter_count() -> int:
    """Get the number of random companies to show in newsletter."""
    settings = get_settings()
    return settings.get("newsletter_count", 5)  # Default to 5


def update_newsletter_count(count: int) -> dict:
    """Update the number of random companies for newsletter (thread-safe)."""
    with _lock:
        settings = get_settings()
        settings["newsletter_count"] = max(1, min(count, 50))  # Clamp between 1 and 50
        tmp = SETTINGS_FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(settings, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(SETTINGS_FILE)
    return settings

def update_sort_order(sort_order: str) -> dict:
    """Update the sort order for homepage company display (thread-safe)."""
    with _lock:
        settings = get_settings()
        settings["sort_order"] = sort_order
        tmp = SETTINGS_FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(settings, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(SETTINGS_FILE)
    return settings
