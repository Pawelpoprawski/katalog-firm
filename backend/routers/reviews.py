import logging
from fastapi import APIRouter, HTTPException, status, Request
from typing import Optional

from ..schemas import ReviewCreate, ReviewRead
from ..storage import create_review as storage_create_review
from ..storage import list_reviews as storage_list_reviews
from ..security_middleware import limiter
# REMOVED: from ..ip_blacklist import is_ip_blacklisted - function doesn't exist!

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=list[ReviewRead])
def list_reviews(company_id: Optional[int] = None):
    logger.info("GET /reviews/ company_id=%s", company_id)
    return storage_list_reviews(company_id=company_id)


@router.post("/", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
# TEMPORARY: Rate limiting disabled - caused issues on production
# @limiter.limit("5/minute")  # Max 5 reviews per minute per IP
def create_review(request: Request, payload: ReviewCreate):
    logger.info("POST /reviews/ payload=%s", payload.dict())
    
    # Get client IP address
    client_ip = request.client.host if request.client else "unknown"
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    
    # REMOVED: IP blacklist check - function doesn't exist
    # Will re-implement properly later
    
    try:
        review_data = payload.dict()
        review_data["ip_address"] = client_ip
        result = storage_create_review(review_data)
        logger.info("Created review id=%s company_id=%s ip=%s", result.get("id"), result.get("company_id"), client_ip)
        return result
    except Exception as exc:
        logger.exception("Failed to create review: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Review create failed: {exc}")
