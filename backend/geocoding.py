"""
Geocoding module for converting addresses to coordinates using Google Maps API.
"""
import googlemaps
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def geocode_address(address: str, api_key: Optional[str] = None) -> Optional[Tuple[float, float]]:
    """
    Geocode address using Google Maps API.
    
    Args:
        address: Full address string to geocode
        api_key: Google Maps API key
    
    Returns:
        Tuple of (latitude, longitude) or None if geocoding failed
    """
    if not api_key:
        logger.warning("No Google Maps API key provided, skipping geocoding")
        return None
    
    if not address or len(address.strip()) < 5:
        logger.warning(f"Invalid address provided: {address}")
        return None
    
    try:
        gmaps = googlemaps.Client(key=api_key)
        result = gmaps.geocode(address)
        
        if result and len(result) > 0:
            location = result[0]['geometry']['location']
            lat = location['lat']
            lng = location['lng']
            
            # Validate coordinates are in reasonable range
            if -90 <= lat <= 90 and -180 <= lng <= 180:
                logger.info(f"Successfully geocoded: {address} -> ({lat}, {lng})")
                return (lat, lng)
            else:
                logger.error(f"Invalid coordinates returned: ({lat}, {lng})")
                return None
        else:
            logger.warning(f"No results found for address: {address}")
            return None
            
    except googlemaps.exceptions.ApiError as e:
        logger.error(f"Google Maps API error: {e}")
        return None
    except Exception as e:
        logger.error(f"Geocoding error for '{address}': {e}")
        return None


def build_full_address(address: str = "", city: str = "", canton: str = "", postal_code: str = "", country: str = "Switzerland") -> str:
    """
    Build full address string from components.
    
    Args:
        address: Street address
        city: City name
        canton: Canton code
        postal_code: Postal code
        country: Country name (default: Switzerland)
    
    Returns:
        Formatted address string
    """
    parts = []
    
    if address:
        parts.append(address.strip())
    if postal_code:
        parts.append(postal_code.strip())
    if city:
        parts.append(city.strip())
    if canton:
        parts.append(canton.strip())
    if country:
        parts.append(country.strip())
    
    return ", ".join(parts)
