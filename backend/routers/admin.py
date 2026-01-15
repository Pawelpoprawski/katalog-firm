from fastapi import APIRouter, HTTPException, status, Body, Depends, Header
from typing import Any, Optional
from ..storage import (
    list_companies as storage_list_companies, 
    list_reviews as storage_list_reviews, 
    get_daily_stats,
    update_company as storage_update_company,
    delete_review as storage_delete_review
)
from ..settings import get_settings


def verify_admin(authorization: Optional[str] = Header(None)):
    """
    Verify admin password from Authorization header.
    Expected format: "Bearer <password>" or just "<password>"
    """
    settings = get_settings()
    
    # If no admin password is set, allow access (development mode warning)
    if not settings.admin_password:
        import logging
        logging.warning("⚠️ ADMIN_PASSWORD not set! Admin endpoints are OPEN. Set ADMIN_PASSWORD env var for production.")
        return True
    
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Extract password from header
    password = authorization.replace("Bearer ", "").strip()
    
    if password != settings.admin_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return True


router = APIRouter(dependencies=[Depends(verify_admin)])

@router.get("/stats")
def get_stats():
    companies = storage_list_companies()
    reviews = storage_list_reviews()
    daily_stats = get_daily_stats(days=30)
    
    total_companies = len(companies)
    total_reviews = len(reviews)
    total_views = sum((c.get("views") or 0) for c in companies)
    total_clicks = sum((c.get("clicks") or 0) for c in companies)
    
    return {
        "total_companies": total_companies,
        "total_reviews": total_reviews,
        "total_views": total_views,
        "total_clicks": total_clicks,
        "history": daily_stats
    }

@router.get("/companies")
def list_admin_companies():
    """List companies with sensitive data like edit_token and all statuses (draft + published)."""
    companies = storage_list_companies()
    # Sort by ID desc
    companies.sort(key=lambda c: int(c.get("id") or 0), reverse=True)
    return companies

@router.get("/reviews")
def list_admin_reviews():
    """List all reviews for admin with company names."""
    reviews = storage_list_reviews()
    companies = storage_list_companies()
    
    # Enrich reviews with company names
    company_map = {c["id"]: c["name"] for c in companies}
    for review in reviews:
        review["company_name"] = company_map.get(review.get("company_id"), "Unknown")
    
    # Sort by ID desc (newest first)
    reviews.sort(key=lambda r: int(r.get("id") or 0), reverse=True)
    return reviews

@router.delete("/reviews/{review_id}")
def delete_review(review_id: int):
    """Delete a review. Admin only."""
    try:
        storage_delete_review(review_id)
        return {"message": "Review deleted successfully"}
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

@router.patch("/companies/{company_id}/status")
def update_company_status(
    company_id: int,
    status_value: str = Body(..., embed=True, alias="status")
):
    """Update company status (draft/published). Admin only."""
    if status_value not in ["draft", "published"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'draft' or 'published'"
        )
    
    try:
        updated = storage_update_company(company_id, {"status": status_value})
        return {"message": "Status updated", "company": updated}
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

@router.patch("/companies/{company_id}/promote")
def toggle_promotion(
    company_id: int,
    is_promoted: bool = Body(..., embed=True)
):
    """Toggle company promotion status. Admin only."""
    try:
        updated = storage_update_company(company_id, {"is_promoted": is_promoted})
        return {"message": "Promotion status updated", "company": updated}
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

@router.patch("/companies/{company_id}/category")
def update_company_category(
    company_id: int,
    category_id: int = Body(..., embed=True)
):
    """Update company category. Admin only."""
    try:
        updated = storage_update_company(company_id, {"category_id": category_id})
        return {"message": "Category updated", "company": updated}
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")


@router.delete("/companies/{company_id}")
def delete_company(company_id: int):
    """Delete a company. Admin only."""
    from ..storage import delete_company as storage_delete_company
    try:
        storage_delete_company(company_id)
        return {"message": "Company deleted successfully"}
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")


# IP Blacklist Management
from ..ip_blacklist import add_ip_to_blacklist, remove_ip_from_blacklist, load_blacklist

@router.get("/ip-blacklist")
def get_ip_blacklist():
    """Get list of blacklisted IPs. Admin only."""
    return {"blacklist": list(load_blacklist())}


# Settings endpoints
@router.get("/settings")
def get_settings_endpoint():
    """Get application settings."""
    from ..storage import get_settings
    return get_settings()


@router.put("/settings/social-media")
def update_social_media_endpoint(social_media: dict):
    """Update social media links."""
    from ..storage import update_social_media
    
    # Validate structure
    expected_keys = {"facebook", "youtube", "instagram", "tiktok", "facebook_group"}
    if not all(key in social_media for key in expected_keys):
        raise HTTPException(status_code=400, detail="Missing required social media fields")
    
    settings = update_social_media(social_media)
    return settings


@router.put("/settings/newsletter-count")
def update_newsletter_count_endpoint(count: int = Body(..., embed=True)):
    """Update the number of random companies for newsletter."""
    from ..storage import update_newsletter_count
    if count < 1 or count > 50:
        raise HTTPException(status_code=400, detail="Count must be between 1 and 50")
    settings = update_newsletter_count(count)
    return {"message": f"Newsletter count updated to {settings.get('newsletter_count')}", "settings": settings}

@router.put("/settings/sort-order")
def update_sort_order_endpoint(sort_order: str = Body(..., embed=True)):
    """Update the sort order for homepage company display."""
    from ..storage import update_sort_order
    if sort_order not in ['newest', 'random', 'alphabetical']:
        raise HTTPException(status_code=400, detail="Sort order must be 'newest', 'random', or 'alphabetical'")
    settings = update_sort_order(sort_order)
    return {"message": f"Sort order updated to {sort_order}", "settings": settings}

@router.post("/ip-blacklist/add")
def add_ip_blacklist(ip_address: str = Body(..., embed=True)):
    """Add IP to blacklist. Admin only."""
    if add_ip_to_blacklist(ip_address):
        return {"message": f"IP {ip_address} added to blacklist"}
    else:
        return {"message": f"IP {ip_address} already in blacklist"}

@router.delete("/ip-blacklist/remove")
def remove_ip_blacklist(ip_address: str = Body(..., embed=True)):
    """Remove IP from blacklist. Admin only."""
    if remove_ip_from_blacklist(ip_address):
        return {"message": f"IP {ip_address} removed from blacklist"}
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP not in blacklist")


# Category Management
from ..storage import list_categories, create_category, update_category, delete_category

@router.get("/categories")
def list_admin_categories():
    """List all categories. Admin only."""
    return list_categories()

@router.post("/categories")
def add_category(
    name: str = Body(..., embed=False),
    slug: str = Body(..., embed=False),
    description: str = Body("", embed=False),
    emoji: str = Body("🏢", embed=False)
):
    """Add a new category. Admin only."""
    try:
        # Include emoji in description if provided
        desc_with_emoji = f"{emoji} {description}" if emoji and description else description
        category = create_category({
            "name": name,
            "slug": slug.lower().replace(" ", "-"),
            "description": desc_with_emoji
        })
        return {"message": "Category created", "category": category}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/categories/{category_id}")
def edit_category(
    category_id: int,
    name: str = Body(None, embed=False),
    slug: str = Body(None, embed=False),
    description: str = Body(None, embed=False)
):
    """Update an existing category. Admin only."""
    try:
        payload = {}
        if name is not None:
            payload["name"] = name
        if slug is not None:
            payload["slug"] = slug.lower().replace(" ", "-")
        if description is not None:
            payload["description"] = description
        
        if not payload:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
        
        category = update_category(category_id, payload)
        return {"message": "Category updated", "category": category}
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

@router.delete("/categories/{category_id}")
def remove_category(category_id: int):
    """Delete a category. Admin only."""
    try:
        delete_category(category_id)
        return {"message": "Category deleted"}
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

