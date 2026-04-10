"""
Security middleware and utilities for the application.
Includes rate limiting, input sanitization, and security headers.
"""
import re
from typing import Callable
import bleach
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


# Security headers middleware
async def security_headers_middleware(request: Request, call_next: Callable) -> Response:
    """Add security headers to all responses."""
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # HSTS - enforce HTTPS
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Content Security Policy - allows Google Maps and necessary inline styles
    csp_policy = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: https:; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "connect-src 'self' https://maps.googleapis.com; "
        "frame-ancestors 'none';"
    )
    response.headers["Content-Security-Policy"] = csp_policy
    
    return response


# Input sanitization utilities
def sanitize_html(text: str, allowed_tags: list[str] | None = None) -> str:
    """
    Sanitize HTML content to prevent XSS attacks.
    
    Args:
        text: The HTML text to sanitize
        allowed_tags: List of allowed HTML tags (default: none for plain text)
    
    Returns:
        Sanitized text
    """
    if allowed_tags is None:
        # By default, strip all HTML tags
        allowed_tags = []
    
    return bleach.clean(
        text,
        tags=allowed_tags,
        strip=True
    )


def validate_slug(slug: str) -> bool:
    """
    Validate slug format (alphanumeric, hyphens, underscores only).
    
    Args:
        slug: The slug to validate
    
    Returns:
        True if valid, False otherwise
    """
    pattern = r'^[a-zA-Z0-9_-]+$'
    return bool(re.match(pattern, slug))


def validate_phone(phone: str) -> bool:
    """
    Validate phone number format.
    
    Args:
        phone: The phone number to validate
    
    Returns:
        True if valid, False otherwise
    """
    # Allow + and digits, spaces, hyphens, parentheses
    pattern = r'^\+?[0-9\s\-\(\)]{7,20}$'
    return bool(re.match(pattern, phone))


def validate_url(url: str) -> bool:
    """
    Validate URL format and block private/reserved IP ranges (SSRF prevention).
    """
    pattern = r'^https?://[a-zA-Z0-9\-._~:/?#\[\]@!$&\'()*+,;=]+$'
    if not re.match(pattern, url):
        return False
    # Block private/reserved IPs to prevent SSRF
    from urllib.parse import urlparse
    try:
        hostname = urlparse(url).hostname or ""
    except Exception:
        return False
    blocked = ["localhost", "127.", "10.", "192.168.", "172.16.", "172.17.",
               "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.",
               "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
               "172.30.", "172.31.", "169.254.", "0.0.0.0", "[::1]"]
    for prefix in blocked:
        if hostname.startswith(prefix) or hostname == prefix.rstrip("."):
            return False
    return True


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal attacks.
    
    Args:
        filename: The filename to sanitize
    
    Returns:
        Sanitized filename
    """
    # Remove directory components
    filename = filename.split('/')[-1].split('\\')[-1]
    
    # Remove dangerous characters
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Prevent hidden files
    if filename.startswith('.'):
        filename = '_' + filename[1:]
    
    return filename


# Rate limit configurations
RATE_LIMITS = {
    "default": "100/minute",
    "auth": "5/minute",
    "create": "20/minute",
    "admin": "10/minute",
}


def get_rate_limit(endpoint_type: str = "default") -> str:
    """Get rate limit configuration for endpoint type."""
    return RATE_LIMITS.get(endpoint_type, RATE_LIMITS["default"])
