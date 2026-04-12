"""Utility to clear nginx proxy cache."""
import subprocess
import logging

logger = logging.getLogger(__name__)

def clear_nginx_cache():
    """Clear nginx proxy cache for companies/categories listing."""
    try:
        subprocess.run(
            ["sudo", "-n", "rm", "-rf", "/var/cache/nginx/katalog/"],
            capture_output=True, timeout=5
        )
        subprocess.run(
            ["sudo", "-n", "mkdir", "-p", "/var/cache/nginx/katalog/"],
            capture_output=True, timeout=5
        )
        logger.info("Nginx cache cleared")
    except Exception as e:
        logger.warning(f"Failed to clear nginx cache: {e}")
