from fastapi import APIRouter, HTTPException, status, Body, Query, Request
from typing import Any
import random

from ..schemas import CompanyCreate, CompanyRead, CompanyUpdate, CompanyReadWithToken
from ..storage import create_company as storage_create_company
from ..storage import delete_company as storage_delete_company
from ..storage import get_company as storage_get_company
from ..storage import get_company_by_slug as storage_get_company_by_slug
from ..storage import list_companies as storage_list_companies
from ..storage import list_reviews as storage_list_reviews
from ..storage import update_company as storage_update_company
from ..storage import increment_view as storage_increment_view
from ..storage import increment_click as storage_increment_click
from ..storage import verify_edit_token as storage_verify_edit_token
from ..storage import get_newsletter_count
from ..storage import track_impressions
from ..security_middleware import limiter, sanitize_html, validate_url


router = APIRouter()


def _calculate_rating(company_id: int) -> float | None:
    """Calculate average rating from reviews for a company."""
    reviews = storage_list_reviews(company_id=company_id)
    if not reviews:
        return None
    ratings = [r.get("rating") for r in reviews if r.get("rating")]
    if not ratings:
        return None
    return round(sum(ratings) / len(ratings), 1)


def _enrich_company(company: dict) -> dict:
    """Add calculated fields like rating and category name to a company dict."""
    from ..storage import list_categories
    
    rating = _calculate_rating(company["id"])
    
    # Lookup category name from category_id to prevent stale/grayed category names
    category_name = None
    if company.get("category_id"):
        categories = list_categories()
        category = next((cat for cat in categories if cat["id"] == company["category_id"]), None)
        if category:
            category_name = category["name"]
    
    return {**company, "rating": rating, "category": category_name}



@router.get("/", response_model=list[CompanyRead])
def list_companies(
    limit: int = Query(default=100, ge=1, le=100),
    category_id: int | None = None,
    status: str | None = None,
) -> list[dict]:
    """
    List companies.
    
    - **limit**: Maximum number of results (default: 100, max: 1000)
    - **category_id**: Filter by category ID
    - **status**: Filter by status (published, draft, etc.)
    """
    all_companies = storage_list_companies()

    # Apply filters
    if category_id is not None:
        all_companies = [c for c in all_companies if c.get("category_id") == category_id]
    # Default to published-only for public endpoint; admin uses /admin/companies for all
    effective_status = status if status is not None else "published"
    all_companies = [c for c in all_companies if c.get("status") == effective_status]
    
    # Apply limit
    limited = all_companies[:limit]
    
    # Enrich with ratings, strip heavy fields for listing performance
    results = []
    for c in limited:
        enriched = _enrich_company(c.copy())
        enriched.pop("photos", None)  # Remove base64 photos array (~MB each)
        enriched.pop("description", None)  # Remove full HTML description for listing
        enriched.pop("offer", None)  # Remove full offer text for listing
        results.append(enriched)
    return results


def _get_random_promoted_companies(companies: list[dict], limit: int = 5) -> list[dict]:
    """Return random promoted companies (is_promoted=True)."""
    promoted = [c for c in companies if c.get("is_promoted")]
    if not promoted:
        return []
    random.shuffle(promoted)
    return promoted[:limit]


def _get_random_companies(companies: list[dict], limit: int = 20) -> list[dict]:
    """Return random selection of companies."""
    shuffled = companies.copy()
    random.shuffle(shuffled)
    return shuffled[:limit]


def _sort_alphabetically(companies: list[dict]) -> list[dict]:
    """Sort companies alphabetically by name."""
    return sorted(companies, key=lambda c: c.get("name", "").lower())


def _sort_by_newest(companies: list[dict]) -> list[dict]:
    """Sort companies by creation date (newest first)."""
    return sorted(companies, key=lambda c: c.get("created_at", 0), reverse=True)


@router.get("/newsletter-preview")
def get_newsletter_preview(count: int = Query(default=5, ge=1, le=20)):
    """
    Returns a full HTML page with newsletter preview + copy button.
    Open in browser: /api/companies/newsletter-preview?count=5
    """
    from fastapi.responses import HTMLResponse

    all_companies = storage_list_companies()
    published = [c for c in all_companies if c.get("status") == "published"]
    selected = _get_random_companies(published, limit=count)
    enriched = [_enrich_company(c.copy()) for c in selected]

    base_url = "https://katalog-firm.ch"
    cards_html = ""
    for c in enriched:
        name = c.get("name", "")
        slug = c.get("slug", "")
        city = c.get("city", "")
        canton = c.get("canton", "")
        location = ", ".join(filter(None, [city, canton]))
        category = c.get("category", "Usługi")
        short_desc = (c.get("short_description") or "")[:120]
        if short_desc and len(c.get("short_description", "")) > 120:
            short_desc += "..."
        img_html = ""
        if c.get("img"):
            img_html = f'<img src="{c["img"]}" alt="{name}" style="width:100%;height:160px;object-fit:cover;" />'
        else:
            img_html = '<div style="width:100%;height:160px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;">Brak zdjęcia</div>'

        cards_html += f"""<tr><td style="padding:8px;" valign="top">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;">
    <tr><td>{img_html}</td></tr>
    <tr><td style="padding:14px 16px;">
      <div style="font-size:11px;color:#E30613;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">{category}</div>
      <a href="{base_url}/firma/{slug}" style="font-size:16px;font-weight:700;color:#1e293b;text-decoration:none;display:block;margin:6px 0;">{name}</a>
      <div style="font-size:12px;color:#64748b;">📍 {location}</div>
      <div style="font-size:13px;color:#475569;margin-top:8px;line-height:1.5;">{short_desc}</div>
      <a href="{base_url}/firma/{slug}" style="display:inline-block;margin-top:12px;padding:8px 20px;background:#E30613;color:#fff;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">Zobacz firmę →</a>
    </td></tr>
  </table>
</td></tr>
"""

    newsletter_snippet = f"""<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
  <tr><td style="text-align:center;padding:24px 0;">
    <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">🇵🇱 Polecane firmy z katalogu</h2>
    <p style="color:#64748b;font-size:14px;margin:0;">Odkryj polskie usługi w Szwajcarii</p>
  </td></tr>
  {cards_html}
  <tr><td style="text-align:center;padding:24px 0;">
    <a href="{base_url}" style="display:inline-block;padding:14px 36px;background:#E30613;color:#fff;border-radius:10px;font-size:16px;font-weight:700;text-decoration:none;">Zobacz wszystkie firmy →</a>
  </td></tr>
</table>"""

    # Escape for textarea
    escaped = newsletter_snippet.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    page_html = f"""<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<title>Newsletter - Katalog Firm</title>
<style>
body {{ font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }}
.container {{ max-width: 700px; margin: 0 auto; }}
.toolbar {{ background: #1e293b; color: white; padding: 16px 24px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; }}
.toolbar h1 {{ margin: 0; font-size: 18px; }}
.btn {{ padding: 10px 24px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; font-size: 14px; }}
.btn-copy {{ background: #E30613; color: white; }}
.btn-refresh {{ background: #334155; color: white; text-decoration: none; }}
.preview {{ background: white; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; padding: 20px; }}
.code {{ margin-top: 20px; }}
textarea {{ width: 100%; height: 200px; font-family: monospace; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; resize: vertical; }}
.info {{ background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 14px; color: #854d0e; }}
</style>
</head>
<body>
<div class="container">
  <div class="info">
    <strong>Instrukcja:</strong> Kliknij "Kopiuj HTML" → wklej w WordPress newsletter jako blok HTML → wyślij.
    Każde odświeżenie strony = inne losowe firmy.
  </div>
  <div class="toolbar">
    <h1>Newsletter Preview ({count} firm)</h1>
    <div>
      <a href="/api/companies/newsletter-preview?count={count}" class="btn btn-refresh">🔄 Losuj nowe</a>
      <button class="btn btn-copy" onclick="copyHTML()">📋 Kopiuj HTML</button>
    </div>
  </div>
  <div class="preview">
    {newsletter_snippet}
  </div>
  <div class="code">
    <h3>Kod HTML do skopiowania:</h3>
    <textarea id="html-code">{escaped}</textarea>
  </div>
</div>
<script>
function copyHTML() {{
  const ta = document.getElementById('html-code');
  // Decode escaped HTML
  const temp = document.createElement('div');
  temp.innerHTML = ta.value;
  const decoded = temp.textContent;
  navigator.clipboard.writeText(decoded).then(() => {{
    const btn = document.querySelector('.btn-copy');
    btn.textContent = '✅ Skopiowano!';
    setTimeout(() => btn.textContent = '📋 Kopiuj HTML', 2000);
  }});
}}
</script>
</body>
</html>"""

    return HTMLResponse(content=page_html)


@router.get("/newsletter")
def get_newsletter_companies(count: int = Query(default=5, ge=1, le=20)):
    """
    Get random published companies for newsletter embedding.
    Returns JSON data + ready-to-use HTML snippet.
    """
    all_companies = storage_list_companies()
    published = [c for c in all_companies if c.get("status") == "published"]
    selected = _get_random_companies(published, limit=count)
    enriched = [_enrich_company(c.copy()) for c in selected]

    # Strip heavy fields
    for c in enriched:
        c.pop("photos", None)
        c.pop("description", None)
        c.pop("offer", None)

    # Generate HTML snippet
    base_url = "https://katalog-firm.ch"
    cards_html = ""
    for c in enriched:
        name = c.get("name", "")
        slug = c.get("slug", "")
        city = c.get("city", "")
        canton = c.get("canton", "")
        location = ", ".join(filter(None, [city, canton]))
        category = c.get("category", "Usługi")
        short_desc = (c.get("short_description") or "")[:120]
        img_html = ""
        if c.get("img") and c["img"].startswith("http"):
            img_html = f'<img src="{c["img"]}" alt="{name}" style="width:100%;height:140px;object-fit:cover;border-radius:8px 8px 0 0;" />'
        elif c.get("img") and c["img"].startswith("data:"):
            img_html = f'<img src="{c["img"]}" alt="{name}" style="width:100%;height:140px;object-fit:cover;border-radius:8px 8px 0 0;" />'

        cards_html += f"""
    <div style="width:100%;max-width:280px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;font-family:Arial,sans-serif;">
      {img_html}
      <div style="padding:12px 16px;">
        <div style="font-size:11px;color:#E30613;font-weight:700;text-transform:uppercase;margin-bottom:4px;">{category}</div>
        <a href="{base_url}/firma/{slug}" style="font-size:15px;font-weight:700;color:#1e293b;text-decoration:none;display:block;margin-bottom:6px;">{name}</a>
        <div style="font-size:12px;color:#64748b;margin-bottom:8px;">{location}</div>
        <div style="font-size:13px;color:#475569;line-height:1.4;">{short_desc}</div>
        <a href="{base_url}/firma/{slug}" style="display:inline-block;margin-top:10px;padding:6px 16px;background:#E30613;color:#fff;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;">Zobacz firmę</a>
      </div>
    </div>
"""

    newsletter_html = f"""<div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;">
  <div style="text-align:center;padding:20px 0;">
    <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Polecane firmy z katalogu</h2>
    <p style="color:#64748b;font-size:14px;margin:0;">Odkryj polskie usługi w Szwajcarii</p>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">
    {cards_html}
  </div>
  <div style="text-align:center;padding:24px 0;">
    <a href="{base_url}" style="display:inline-block;padding:12px 32px;background:#E30613;color:#fff;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">Zobacz wszystkie firmy</a>
  </div>
</div>"""

    return {
        "companies": enriched,
        "count": len(enriched),
        "html": newsletter_html,
    }


@router.post("/", response_model=CompanyReadWithToken, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")
def create_company(
    request: Request,
    payload: CompanyCreate,
):
    data = payload.dict()
    # Sanitize text fields to prevent XSS
    if data.get("name"):
        data["name"] = sanitize_html(data["name"])
    if data.get("description"):
        data["description"] = sanitize_html(data["description"], allowed_tags=["p", "br", "b", "strong", "i", "em", "ul", "ol", "li"])
    if data.get("short_description"):
        data["short_description"] = sanitize_html(data["short_description"])
    if data.get("offer"):
        data["offer"] = sanitize_html(data["offer"], allowed_tags=["p", "br", "b", "strong", "i", "em", "ul", "ol", "li"])
    # Block SSRF: reject private/internal IPs in website field
    if data.get("website") and not validate_url(data["website"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid website URL")
    company = storage_create_company(data)
    from ..storage import track_new_company
    track_new_company()
    # Clear nginx cache so new company appears immediately
    from ..clear_cache import clear_nginx_cache
    clear_nginx_cache()
    # Send email with edit link
    if company.get("email") and company.get("edit_token"):
        try:
            from ..email_service import send_company_created_email
            send_company_created_email(
                email=company["email"],
                company_name=company.get("name", ""),
                edit_token=company["edit_token"],
                company_slug=company.get("slug", ""),
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to send email: {e}")
    return _enrich_company(company.copy())


@router.get("/by-slug/{slug}", response_model=CompanyRead)
def get_company_by_slug(slug: str):
    """Get company by slug (SEO-friendly URL)."""
    company = storage_get_company_by_slug(slug)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _enrich_company(company.copy())


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(company_id: int):
    company = storage_get_company(company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _enrich_company(company.copy())


@router.post("/batch-view", status_code=status.HTTP_204_NO_CONTENT)
def batch_increment_views(company_ids: list[int] = Body(...)):
    """Batch increment views for multiple companies (from scroll impressions)."""
    limited = company_ids[:50]  # Limit to 50 per request
    for cid in limited:
        storage_increment_view(cid)
    # Track scroll impressions in analytics (for admin chart)
    if limited:
        track_impressions(len(limited))
    return None


@router.post("/{company_id}/view", status_code=status.HTTP_204_NO_CONTENT)
def increment_view(company_id: int):
    storage_increment_view(company_id)
    return None


@router.post("/{company_id}/click", status_code=status.HTTP_204_NO_CONTENT)
def increment_click(company_id: int):
    storage_increment_click(company_id)
    return None


@router.put("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    edit_token: str = Body(..., embed=True),  # Require token in request body
):
    # Verify edit token
    company = storage_get_company(company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Firma nie znaleziona")
    
    if company.get("edit_token") != edit_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nieprawidłowy token edycji. Użyj linku z emaila."
        )
    
    try:
        update_data = payload.dict(exclude_unset=True)
        # Sanitize HTML fields on update to prevent XSS
        if update_data.get("description"):
            update_data["description"] = sanitize_html(update_data["description"], allowed_tags=["p", "br", "b", "strong", "i", "em", "ul", "ol", "li"])
        if update_data.get("offer"):
            update_data["offer"] = sanitize_html(update_data["offer"], allowed_tags=["p", "br", "b", "strong", "i", "em", "ul", "ol", "li"])
        if update_data.get("name"):
            update_data["name"] = sanitize_html(update_data["name"])
        if update_data.get("short_description"):
            update_data["short_description"] = sanitize_html(update_data["short_description"])
        updated = storage_update_company(company_id, update_data)
        return _enrich_company(updated.copy())
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    edit_token: str = Body(..., embed=True),  # Require token in request body
):
    # Verify edit token
    company = storage_get_company(company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Firma nie znaleziona")
    
    if company.get("edit_token") != edit_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nieprawidłowy token edycji. Nie możesz usunąć tej firmy."
        )
    
    try:
        storage_delete_company(company_id)
        return None
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")



@router.get("/by-token/{token}")
def get_company_by_edit_token(token: str):
    """Get company by edit token (no email verification needed - token is unique)."""
    companies = storage_list_companies()
    for c in companies:
        if c.get("edit_token") == token:
            return _enrich_company(c.copy())
    
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired token")


@router.get("/{company_id}/edit-token", response_model=CompanyReadWithToken)
def get_company_with_edit_token(company_id: int, token: str):
    """Get company with edit token verification."""
    company = storage_get_company(company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    
    if company.get("edit_token") != token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token")
    
    return _enrich_company(company.copy())


@router.get("/{company_id}/photo/{photo_index}")
def get_company_photo(company_id: int, photo_index: int):
    """Get a specific photo for a company."""
    from fastapi.responses import Response
    import base64
    
    company = storage_get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    photos = company.get("photos") or []
    if photo_index < 0 or photo_index >= len(photos):
        raise HTTPException(status_code=404, detail="Photo not found")
    
    photo_data = photos[photo_index]
    
    # If it's a base64 data URL, decode and return
    if photo_data.startswith("data:image"):
        # Format: data:image/jpeg;base64,/9j/4AAQ...
        try:
            header, encoded = photo_data.split(",", 1)
            mime_type = header.split(";")[0].replace("data:", "")
            image_bytes = base64.b64decode(encoded)
            return Response(content=image_bytes, media_type=mime_type)
        except Exception:
            raise HTTPException(status_code=500, detail="Invalid photo format")
    
    # If it's a URL, redirect to it
    if photo_data.startswith("http"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=photo_data)
    
    raise HTTPException(status_code=500, detail="Unknown photo format")

@router.post("/confirm")
@limiter.limit("5/minute")
def confirm_company_activity(request: Request, body: dict[str, str]) -> dict[str, str]:
    """
    Confirm company activity by email.
    Updates last_confirmed_at to current datetime.
    Returns same response regardless of whether email exists (prevents enumeration).
    """
    from datetime import datetime

    email = body.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email jest wymagany"
        )

    # Find company by email (case-insensitive)
    all_companies = storage_list_companies()
    company = next(
        (c for c in all_companies if (c.get("email") or "").strip().lower() == email.strip().lower()),
        None,
    )

    if company:
        # Update last_confirmed_at
        company["last_confirmed_at"] = datetime.now().isoformat()
        storage_update_company(company["id"], company)

    # Always return success to prevent email enumeration
    return {"status": "confirmed", "message": "Jeśli podany email istnieje w bazie, ogłoszenie zostało potwierdzone."}
