from fastapi import APIRouter, HTTPException, status, Body, Query
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
    """Add calculated fields like rating to a company dict."""
    rating = _calculate_rating(company["id"])
    return {**company, "rating": rating}


@router.get("/", response_model=list[CompanyRead])
def list_companies(
    limit: int = Query(default=100, le=1000),
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
    if status:
        all_companies = [c for c in all_companies if c.get("status") == status]
    
    # Apply limit
    limited = all_companies[:limit]
    
    # Enrich with ratings
    return [_enrich_company(c.copy()) for c in limited]


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


@router.post("/", response_model=CompanyReadWithToken, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
):
    company = storage_create_company(payload.dict())
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
):
    try:
        updated = storage_update_company(company_id, payload.dict(exclude_unset=True))
        return _enrich_company(updated.copy())
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: int):
    try:
        storage_delete_company(company_id)
        return None
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.get("/{company_id}/edit-token", response_model=CompanyReadWithToken)
def get_company_with_edit_token(company_id: int, token: str):
    """Get company with edit token verification."""
    company = storage_get_company(company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    
    if not storage_verify_edit_token(company_id, token):
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
def confirm_company_activity(body: dict[str, str]) -> dict[str, str]:
    """
    Confirm company activity by email.
    Updates last_confirmed_at to current datetime.
    """
    from datetime import datetime
    
    email = body.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email jest wymagany"
        )
    
    # Find company by email
    all_companies = storage_list_companies()
    company = next((c for c in all_companies if c.get("email") == email), None)
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie ma takiego adresu email w bazie. Skontaktuj się z kontakt@polacyszwajcaria.com"
        )
    
    # Update last_confirmed_at
    company["last_confirmed_at"] = datetime.now().isoformat()
    storage_update_company(company["id"], company)
    
    return {"status": "confirmed", "message": "Dziękujemy! Twoje ogłoszenie zostało potwierdzone."}
