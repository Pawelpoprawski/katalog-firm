"""
Image processing utilities for converting images to WebP format.
"""

import base64
import hashlib
import io
from pathlib import Path
from PIL import Image

IMAGES_DIR = Path(__file__).resolve().parent / "static" / "images"


def convert_base64_to_webp(
    base64_str: str,
    max_size: int = 1200,
    quality: int = 85,
    max_size_mb: float = 10.0  # Max 10MB per image
) -> str:
    """
    Convert a base64 image (JPG/PNG) to WebP format.
    
    Args:
        base64_str: Data URI string (data:image/jpeg;base64,...)
        max_size: Maximum dimension in pixels (default: 1200)
        quality: WebP compression quality 0-100 (default: 85)
        max_size_mb: Maximum file size in MB (default: 10.0)
    
    Returns:
        New data URI with WebP format
        
    Raises:
        ValueError: If image is too large
    """
    try:
        # Skip if already WebP
        if "image/webp" in base64_str:
            return base64_str
        
        # Skip if not a data URI
        if not base64_str.startswith("data:image"):
            return base64_str
        
        # Extract base64 data (after comma)
        if ";base64," not in base64_str:
            return base64_str
        
        # Check file size BEFORE processing (prevent DoS)
        size_mb = len(base64_str) / (1024 * 1024)
        if size_mb > max_size_mb:
            raise ValueError(
                f"Obraz jest za duży: {size_mb:.1f}MB (maksymalnie {max_size_mb}MB). "
                f"Użyj mniejszego zdjęcia lub zmniejsz rozdzielczość."
            )
        
        base64_data = base64_str.split(";base64,")[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_data)
        
        # Load image
        img = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed (RGBA/P/LA not compatible with JPEG/WebP)
        if img.mode in ("RGBA", "P", "LA"):
            # Create white background for transparent images
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        
        # Resize if too large
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Convert to WebP
        buffer = io.BytesIO()
        img.save(buffer, format="WEBP", quality=quality, method=6)
        webp_data = buffer.getvalue()
        
        # Return as base64 data URI
        webp_base64 = base64.b64encode(webp_data).decode()
        return f"data:image/webp;base64,{webp_base64}"
        
    except ValueError:
        # Size violation — propagate so API can return 400
        raise
    except Exception as e:
        # If conversion fails, return original
        print(f"Warning: Failed to convert image to WebP: {e}")
        return base64_str


def save_image_to_disk(base64_str: str, company_id: int, image_type: str = "main", index: int = 0) -> str:
    """
    Convert base64 image to WebP and save to disk. Returns URL path.
    image_type: "main" or "photo"
    Returns: "/images/company_{id}_{type}_{index}.webp" or original string if not base64
    Raises ValueError on oversized input so caller can return 400.
    """
    if not base64_str or not base64_str.startswith("data:image"):
        return base64_str  # External URL or already processed

    # Already a file path
    if base64_str.startswith("/images/"):
        return base64_str

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # Convert to WebP first — ValueError (too large) propagates to caller.
    webp_data_uri = convert_base64_to_webp(base64_str)

    try:
        if ";base64," not in webp_data_uri:
            return base64_str

        encoded = webp_data_uri.split(";base64,")[1]
        image_bytes = base64.b64decode(encoded)

        filename = f"company_{company_id}_{image_type}_{index}.webp"
        filepath = IMAGES_DIR / filename
        filepath.write_bytes(image_bytes)

        return f"/images/{filename}"
    except Exception as e:
        print(f"Warning: Failed to save image to disk: {e}")
        return base64_str
