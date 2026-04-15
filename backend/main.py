import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.middleware import SlowAPIMiddleware

# Allow running both as module (`python -m backend.main`) and as script (`python main.py` inside backend/)
import sys
from pathlib import Path

if str(Path(__file__).resolve().parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.settings import get_settings  # type: ignore  # noqa: E402
from backend.routers import auth, companies, categories, reviews, reports, admin  # type: ignore  # noqa: E402
from backend.storage import init_storage  # type: ignore  # noqa: E402
from backend.security_middleware import (  # type: ignore  # noqa: E402
    limiter,
    security_headers_middleware
)
from backend.ip_blacklist import ip_blacklist_middleware  # type: ignore  # noqa: E402
from backend.storage import track_page_view  # type: ignore  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()
app = FastAPI(title=settings.app_name, debug=settings.debug)

# Serve images from static directory
images_dir = os.path.join(os.path.dirname(__file__), "static", "images")
os.makedirs(images_dir, exist_ok=True)
app.mount("/images", StaticFiles(directory=images_dir), name="images")

# Add rate limiting state
app.state.limiter = limiter

# Analytics + caching middleware
async def analytics_middleware(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    # Add Cache-Control for read-only endpoints (5 min browser cache)
    if request.method == "GET" and path in ("/companies/", "/categories/", "/settings"):
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    # Track unique IPs for page-level requests
    if path in ("/companies/", "/categories/", "/settings") or path.startswith("/companies/by-slug/"):
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host if request.client else ""
        if ip:
            try:
                track_page_view(ip)
            except Exception:
                pass
    return response

app.middleware("http")(analytics_middleware)

# Add IP blacklist middleware (FIRST - before other middleware)
app.middleware("http")(ip_blacklist_middleware)

# Add security headers middleware
app.middleware("http")(security_headers_middleware)

# Add SlowAPI middleware for rate limiting
app.add_middleware(SlowAPIMiddleware)

# Add GZIP compression middleware (compress responses > 1KB)
# This reduces JSON payload from ~21MB to ~3-5MB for mobile clients
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS configuration - use settings for production safety
# In production, settings.cors_origins should be set to specific domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    logger.info("Initializing storage...")
    init_storage()
    logger.info("Storage initialized. Backend ready on http://0.0.0.0:8000")


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


@app.get("/settings", tags=["meta"])
def get_public_settings():
    """Get public settings (social media links) - no auth required."""
    from backend.storage import get_settings as storage_get_settings
    settings = storage_get_settings()
    # Return only public fields (social media)
    return {
        "social_media": settings.get("social_media", {}),
        "newsletter_count": settings.get("newsletter_count", 5),
        "sort_order": settings.get("sort_order", "alphabetical")
    }


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(companies.router, prefix="/companies", tags=["companies"])
app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
