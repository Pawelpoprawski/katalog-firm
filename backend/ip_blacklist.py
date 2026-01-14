"""
IP Blacklist Middleware

Blocks requests from blacklisted IP addresses.
"""
from pathlib import Path
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

# Path to blacklist file
BLACKLIST_FILE = Path(__file__).parent / "data" / "ip_blacklist.txt"


def load_blacklist() -> set[str]:
    """Load blacklisted IPs from file."""
    if not BLACKLIST_FILE.exists():
        return set()
    
    blacklist = set()
    try:
        with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if line and not line.startswith("#"):
                    blacklist.add(line)
    except Exception as e:
        logger.error(f"Failed to load IP blacklist: {e}")
    
    return blacklist


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    # Check X-Forwarded-For header (for proxies/load balancers)
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0].strip()
    
    # Fall back to direct client IP
    return request.client.host if request.client else "unknown"


async def ip_blacklist_middleware(request: Request, call_next):
    """Middleware to block requests from blacklisted IPs."""
    client_ip = get_client_ip(request)
    blacklist = load_blacklist()
    
    if client_ip in blacklist:
        logger.warning(f"Blocked request from blacklisted IP: {client_ip}")
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Dostęp zablokowany. Skontaktuj się z administratorem."}
        )
    
    response = await call_next(request)
    return response


def add_ip_to_blacklist(ip_address: str) -> bool:
    """Add an IP address to the blacklist file."""
    try:
        # Ensure data directory exists
        BLACKLIST_FILE.parent.mkdir(parents=True, exist_ok=True)
        
        # Check if IP already in blacklist
        blacklist = load_blacklist()
        if ip_address in blacklist:
            return False  # Already exists
        
        # Append to file
        with open(BLACKLIST_FILE, "a", encoding="utf-8") as f:
            f.write(f"\n{ip_address}")
        
        logger.info(f"Added IP to blacklist: {ip_address}")
        return True
    except Exception as e:
        logger.error(f"Failed to add IP to blacklist: {e}")
        return False


def remove_ip_from_blacklist(ip_address: str) -> bool:
    """Remove an IP address from the blacklist file."""
    try:
        blacklist = load_blacklist()
        if ip_address not in blacklist:
            return False  # Not in blacklist
        
        blacklist.remove(ip_address)
        
        # Rewrite file
        with open(BLACKLIST_FILE, "w", encoding="utf-8") as f:
            f.write('"""\nIP Blacklist Management\n\nThis file stores blacklisted IP addresses.\nAdd one IP address per line.\nLines starting with # are comments.\n"""\n\n')
            for ip in sorted(blacklist):
                f.write(f"{ip}\n")
        
        logger.info(f"Removed IP from blacklist: {ip_address}")
        return True
    except Exception as e:
        logger.error(f"Failed to remove IP from blacklist: {e}")
        return False
