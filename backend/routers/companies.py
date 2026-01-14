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


def _enrich_company(company: dict[str, Any]) -> dict[str, Any]:
    """Add computed fields like rating to company dict."""
    rating = _calculate_rating(company.get("id"))
    if rating is not None:
        company["rating"] = rating
    return company


@router.get("/random", response_model=list[CompanyRead])
def get_random_companies(count: int = Query(None, ge=1, le=50, description="Number of random companies to return")):
    """
    Get X random published companies for newsletter.
    If count is not provided, uses the value from admin settings (default 5).
    """
    companies = storage_list_companies()
    published_companies = [c for c in companies if c.get("status") == "published"]
    
    # Use provided count or default from settings
    num_to_return = count if count is not None else get_newsletter_count()
    
    # Shuffle and take N companies
    if len(published_companies) <= num_to_return:
        selected = published_companies
    else:
        selected = random.sample(published_companies, num_to_return)
    
    return [_enrich_company(c.copy()) for c in selected]


@router.get("/")
def list_companies(
    limit: int = Query(50, ge=1, le=200, description="Number of companies per page"),
    offset: int = Query(0, ge=0, description="Number of companies to skip")
):
    """
    Get list of published companies (without images for performance).
    Images are loaded only when viewing individual company details.
    Supports pagination with limit/offset.
    """
    companies = storage_list_companies()
    # Filter only published companies
    published_companies = [c for c in companies if c.get("status") == "published"]
    
    # Apply pagination
    total = len(published_companies)
    paginated = published_companies[offset:offset + limit]
    
    # Strip heavy image data for list view (keep main img, remove gallery)
    lightweight_companies = []
    for c in paginated:
        company = _enrich_company(c.copy())
        # Keep main img for thumbnails, remove photos gallery
        company.pop("photos", None)  # Gallery loaded only on detail page
        lightweight_companies.append(company)
    
    return {
        "companies": lightweight_companies,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < total
    }


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
        return storage_update_company(company_id, payload.dict(exclude_unset=True))
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.post("/verify-edit")
def verify_edit_access(token: str = Body(..., embed=True), email: str = Body(..., embed=True)):
    """Verify if token matches email for editing."""
    company = storage_verify_edit_token(token, email)
    if not company:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"status": "ok", "company": _enrich_company(company.copy())}


@router.put("/by-token/{token}", response_model=CompanyRead)
def update_company_by_token(
    token: str,
    payload: CompanyUpdate,
):
    companies = storage_list_companies()
    company = next((c for c in companies if c.get("edit_token") == token), None)
    
    if not company:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    
    try:
        return storage_update_company(int(company["id"]), payload.dict(exclude_unset=True))
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: int):
    try:
        storage_delete_company(company_id)
        return None
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


from fastapi.responses import Response
import base64

@router.get("/{company_id}/photo")
def get_company_photo(company_id: int):
    """
    Get main photo for a company as an image.
    Useful for newsletters where you need direct image URLs.
    Returns the image as image/jpeg or image/png.
    Checks 'img' field first (main photo), then 'photos' array.
    """
    company = storage_get_company(company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    # First try the 'img' field (main photo)
    photo_data = company.get("img")
    
    # If no 'img', try photos array
    if not photo_data:
        photos = company.get("photos", [])
        if photos and len(photos) > 0:
            photo_data = photos[0]
    
    if not photo_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No photos available")
    
    # Handle base64 data URLs
    if photo_data.startswith("data:"):
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
