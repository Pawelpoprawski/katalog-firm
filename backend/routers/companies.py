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
from ..storage import increment_profile_view as storage_increment_profile_view
from ..storage import increment_click as storage_increment_click
from ..storage import verify_edit_token as storage_verify_edit_token
from ..storage import get_newsletter_count
from ..storage import track_impressions
from ..security_middleware import limiter, sanitize_html, sanitize_plain_text, validate_url


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
    limit: int = Query(default=1000, ge=1, le=1000),
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


def _build_newsletter_html(enriched: list[dict], cols: int = 3) -> str:
    """Build email-safe HTML for newsletter with N columns per row. Uses URL images instead of base64."""
    base_url = "https://katalog-firm.ch"
    api_url = "https://katalog-firm.ch/api"
    col_width = f"{100 // cols}%"

    rows_html = ""
    for i in range(0, len(enriched), cols):
        row_companies = enriched[i:i + cols]
        cells = ""
        for c in row_companies:
            full_name = c.get("name", "")
            name = full_name[:38] + "..." if len(full_name) > 40 else full_name
            slug = c.get("slug", "")
            cid = c.get("id", 0)
            city = c.get("city", "")
            canton = c.get("canton", "")
            location = ", ".join(filter(None, [city, canton]))
            category = c.get("category", "Uslugi")
            short_desc = (c.get("short_description") or "")[:100]
            if short_desc and len(c.get("short_description", "")) > 100:
                short_desc += "..."

            # Use photo endpoint URL (serves actual image, not base64)
            img_html = f'<img src="{api_url}/companies/{cid}/photo/0" alt="{name}" style="width:100%;height:140px;object-fit:cover;display:block;" />'
            if not c.get("img") and not c.get("photos"):
                img_html = f'<div style="width:100%;height:140px;background:#f1f5f9;text-align:center;line-height:140px;color:#94a3b8;font-size:13px;">Brak zdjecia</div>'

            link = f"{base_url}/firma/{slug}"
            cells += f"""<td width="{col_width}" valign="top" style="padding:6px;">
  <a href="{link}" style="text-decoration:none;color:inherit;display:block;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;height:320px;">
    <tr><td style="height:140px;">{img_html}</td></tr>
    <tr><td style="padding:12px;height:180px;vertical-align:top;">
      <div style="font-size:10px;color:#E30613;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;height:14px;overflow:hidden;">{category}</div>
      <div style="font-size:14px;font-weight:700;color:#1e293b;margin:4px 0;height:36px;overflow:hidden;line-height:18px;">{name}</div>
      <div style="font-size:11px;color:#64748b;height:16px;overflow:hidden;">{location}</div>
      <div style="font-size:12px;color:#475569;margin-top:6px;line-height:1.4;overflow:hidden;height:84px;">{short_desc}</div>
    </td></tr>
  </table>
  </a>
</td>"""

        # Pad empty cells if row not full
        for _ in range(cols - len(row_companies)):
            cells += f'<td width="{col_width}" valign="top" style="padding:6px;"></td>'

        rows_html += f"<tr>{cells}</tr>\n"

    return f"""<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
  <tr><td>
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      {rows_html}
    </table>
  </td></tr>
</table>"""


@router.get("/newsletter-preview")
def get_newsletter_preview(count: int = Query(default=6, ge=1, le=20)):
    """Visual preview page with copy button. Open in browser."""
    from fastapi.responses import HTMLResponse

    all_companies = storage_list_companies()
    published = [c for c in all_companies if c.get("status") == "published"]
    selected = _get_random_companies(published, limit=count)
    enriched = [_enrich_company(c.copy()) for c in selected]

    newsletter_snippet = _build_newsletter_html(enriched, cols=3)
    escaped = newsletter_snippet.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    page_html = f"""<!DOCTYPE html>
<html lang="pl"><head><meta charset="utf-8" /><title>Newsletter Preview</title>
<style>
body {{ font-family: Arial; background: #f8fafc; margin: 0; padding: 20px; }}
.c {{ max-width: 700px; margin: 0 auto; }}
.bar {{ background: #1e293b; color: white; padding: 14px 20px; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between; align-items: center; }}
.bar h1 {{ margin: 0; font-size: 16px; }}
.btn {{ padding: 8px 20px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; font-size: 13px; }}
.bc {{ background: #E30613; color: white; }}
.br {{ background: #334155; color: white; text-decoration: none; margin-right: 8px; display: inline-block; padding: 8px 20px; border-radius: 8px; font-weight: 700; font-size: 13px; }}
.pv {{ background: white; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px; padding: 16px; }}
textarea {{ width: 100%; height: 150px; font-family: monospace; font-size: 10px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-top: 16px; }}
</style></head><body>
<div class="c">
<div class="bar"><h1>Newsletter ({count} firm, 3 kolumny)</h1><div>
<a href="/api/companies/newsletter-preview?count={count}" class="br">Losuj nowe</a>
<button class="btn bc" onclick="copyHTML()">Kopiuj HTML</button>
</div></div>
<div class="pv">{newsletter_snippet}</div>
<textarea id="code">{escaped}</textarea>
</div>
<script>
function copyHTML(){{const t=document.getElementById('code'),d=document.createElement('div');d.innerHTML=t.value;navigator.clipboard.writeText(d.textContent).then(()=>{{const b=document.querySelector('.bc');b.textContent='Skopiowano!';setTimeout(()=>b.textContent='Kopiuj HTML',2000)}})}}
</script></body></html>"""
    return HTMLResponse(content=page_html)


@router.get("/newsletter")
def get_newsletter_companies(count: int = Query(default=6, ge=1, le=20)):
    """
    Get random published companies for newsletter (3 columns per row).
    Returns JSON + email-safe HTML snippet with URL images.
    """
    all_companies = storage_list_companies()
    published = [c for c in all_companies if c.get("status") == "published"]
    selected = _get_random_companies(published, limit=count)
    enriched = [_enrich_company(c.copy()) for c in selected]

    for c in enriched:
        c.pop("photos", None)
        c.pop("description", None)
        c.pop("offer", None)
        c.pop("edit_token", None)

    newsletter_html = _build_newsletter_html(enriched, cols=3)

    return {
        "companies": enriched,
        "count": len(enriched),
        "html": newsletter_html,
    }


@router.post("/", response_model=CompanyReadWithToken, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
def create_company(
    request: Request,
    payload: CompanyCreate,
):
    data = payload.dict()
    # Sanitize text fields to prevent XSS
    if data.get("name"):
        data["name"] = sanitize_plain_text(data["name"])
    if data.get("description"):
        data["description"] = sanitize_html(data["description"], allowed_tags=["p", "br", "b", "strong", "i", "em", "ul", "ol", "li"])
    if data.get("short_description"):
        data["short_description"] = sanitize_plain_text(data["short_description"])
    if data.get("offer"):
        data["offer"] = sanitize_html(data["offer"], allowed_tags=["p", "br", "b", "strong", "i", "em", "ul", "ol", "li"])
    # Limit liczby zdjęć przychodzących (frontend limituje do 8, ale direct API też musi mieć twardy limit)
    if data.get("photos") and isinstance(data["photos"], list) and len(data["photos"]) > 20:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maksymalnie 20 zdjęć.")
    # Block SSRF: reject private/internal IPs in website field
    if data.get("website") and not validate_url(data["website"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid website URL")
    try:
        company = storage_create_company(data)
    except ValueError as e:
        # Oversized image from image_utils.convert_base64_to_webp
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
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
    storage_increment_profile_view(company_id)
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
            update_data["name"] = sanitize_plain_text(update_data["name"])
        if update_data.get("short_description"):
            update_data["short_description"] = sanitize_plain_text(update_data["short_description"])
        if update_data.get("photos") and isinstance(update_data["photos"], list) and len(update_data["photos"]) > 20:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maksymalnie 20 zdjęć.")
        updated = storage_update_company(company_id, update_data)
        return _enrich_company(updated.copy())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
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

    # Fallback: if requesting photo/0 and photos is empty, use main img field
    if photo_index == 0 and not photos and company.get("img"):
        photo_data = company["img"]
    elif photo_index < 0 or photo_index >= len(photos):
        raise HTTPException(status_code=404, detail="Photo not found")
    else:
        photo_data = photos[photo_index]
    
    # If it's a local file path, read from disk
    if photo_data.startswith("/images/"):
        from ..image_utils import IMAGES_DIR
        filename = photo_data.replace("/images/", "")
        filepath = IMAGES_DIR / filename
        if filepath.exists():
            image_bytes = filepath.read_bytes()
            return Response(content=image_bytes, media_type="image/webp",
                           headers={"Cache-Control": "public, max-age=31536000, immutable"})
        raise HTTPException(status_code=404, detail="Image file not found")

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
        # Track confirmation in analytics (for admin chart)
        try:
            from ..storage import track_confirmation_received
            track_confirmation_received()
        except Exception:
            pass

    # Always return success to prevent email enumeration
    return {"status": "confirmed", "message": "Jeśli podany email istnieje w bazie, ogłoszenie zostało potwierdzone."}


@router.post("/confirm-token")
@limiter.limit("10/minute")
def confirm_company_by_token(request: Request, body: dict[str, str]) -> dict[str, str]:
    """
    Confirm company activity by edit_token (from email link).
    No form input needed - one-click confirmation.
    """
    from datetime import datetime

    token = (body.get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token wymagany")

    all_companies = storage_list_companies()
    company = next((c for c in all_companies if (c.get("edit_token") or "") == token), None)

    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nieprawidłowy token")

    company["last_confirmed_at"] = datetime.now().isoformat()
    storage_update_company(company["id"], company)

    try:
        from ..storage import track_confirmation_received
        track_confirmation_received()
    except Exception:
        pass

    return {
        "status": "confirmed",
        "message": "Dziękujemy! Aktywność Waszej usługi została potwierdzona.",
        "company_name": company.get("name", ""),
    }
