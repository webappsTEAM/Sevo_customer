"""
service_requests/services/address_service.py

AddressService — Production Address Geocoding & Validation Engine.

Strict rules:
- Validates required address parts and 6-digit India pincodes.
- Multi-tier fallback:
    Tier 1: Street + Landmark + City + State + Pincode + Country
    Tier 2: Street + City + State + Pincode + Country
    Tier 3: City + State + Pincode + Country (marked as "approximate")
    Tier 4: None (latitude=None, longitude=None, geocoding_status="failed")
- Coordinates are validated within India bounding box (Lat 6°–38°N, Lng 68°–98°E).
- Zero fake, hardcoded, or default coordinates.
"""

import logging
import os
import re
import json
import urllib.parse
import urllib.request
import hashlib
from decimal import Decimal
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

REVERSE_GEOCODE_CACHE_TTL = 3600
FORWARD_GEOCODE_CACHE_TTL = 86400
_COORD_PRECISION = 4
USER_AGENT = "CalTrack-Services/2.0 (support@caldimproducts.com)"

# India Geographic Bounding Box
INDIA_LAT_MIN = 6.0
INDIA_LAT_MAX = 38.0
INDIA_LNG_MIN = 68.0
INDIA_LNG_MAX = 98.0


class AddressService:
    """Authoritative address geocoding and coordinate validation service."""

    @classmethod
    def is_valid_india_pincode(cls, pincode: str) -> bool:
        """Checks if a pincode is a valid 6-digit Indian postal code."""
        if not pincode:
            return False
        clean = str(pincode).strip()
        return bool(re.match(r"^\d{6}$", clean))

    @classmethod
    def validate_coordinates(cls, lat: float, lng: float, country: str = "India") -> bool:
        """Validates that coordinates are real, non-zero, and within geographic bounds."""
        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            return False

        if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
            return False

        # Reject (0, 0)
        if abs(lat) < 0.0001 and abs(lng) < 0.0001:
            return False

        # Boundary validation for India
        if country and country.strip().lower() == "india":
            if not (INDIA_LAT_MIN <= lat <= INDIA_LAT_MAX and INDIA_LNG_MIN <= lng <= INDIA_LNG_MAX):
                logger.warning("[Geocoding] Coordinates (%s, %s) outside India bounds", lat, lng)
                return False

        return True

    @classmethod
    def resolve_address_coordinates(
        cls,
        street_address: str,
        landmark: str = "",
        city: str = "",
        state: str = "",
        pincode: str = "",
        country: str = "India",
    ) -> dict:
        """
        Geocodes a customer address using a strict multi-tier fallback hierarchy.
        Returns a normalized dict with verified or approximate coordinates, or failed status.
        """
        street = str(street_address or "").strip()
        lmark = str(landmark or "").strip()
        c_city = str(city or "").strip()
        c_state = str(state or "").strip()
        c_pincode = str(pincode or "").strip()
        c_country = str(country or "India").strip()

        # Build clean normalized formatted address
        addr_parts = [street]
        if lmark:
            addr_parts.append(lmark)
        if c_city:
            addr_parts.append(c_city)
        if c_state:
            addr_parts.append(c_state)
        if c_pincode:
            addr_parts.append(c_pincode)
        if c_country:
            addr_parts.append(c_country)

        formatted_address = ", ".join([p for p in addr_parts if p])

        # Validate pincode format for India
        is_india = (c_country.lower() == "india")
        if is_india and c_pincode and not cls.is_valid_india_pincode(c_pincode):
            logger.warning("[Geocoding] Invalid Indian pincode format: '%s'", c_pincode)

        # ── Multi-Tier Fallback Hierarchy ──────────────────────────────────────
        tier_queries = []

        # Tier 1: Street + Landmark + City + State + Pincode + Country
        if street and lmark and c_city and c_state and c_pincode:
            tier_queries.append(("verified", f"{street}, {lmark}, {c_city}, {c_state}, {c_pincode}, {c_country}"))

        # Tier 2: Street + City + State + Pincode + Country
        if street and c_city and c_state and c_pincode:
            tier_queries.append(("verified", f"{street}, {c_city}, {c_state}, {c_pincode}, {c_country}"))

        # Tier 2b: Street + City + State + Country (if pincode omitted or unindexed)
        if street and c_city and c_state:
            tier_queries.append(("verified", f"{street}, {c_city}, {c_state}, {c_country}"))

        # Tier 3: City + State + Pincode + Country (Approximate only)
        if c_city and c_state and c_pincode:
            tier_queries.append(("approximate", f"{c_city}, {c_state}, {c_pincode}, {c_country}"))
        elif c_city and c_state:
            tier_queries.append(("approximate", f"{c_city}, {c_state}, {c_country}"))

        resolved_coords = None
        resolved_status = "failed"

        for status_label, query_str in tier_queries:
            coords = cls._query_geocoder(query_str, country=c_country)
            if coords and cls.validate_coordinates(coords[0], coords[1], country=c_country):
                resolved_coords = coords
                resolved_status = status_label
                break

        if resolved_coords:
            lat = round(float(resolved_coords[0]), 6)
            lng = round(float(resolved_coords[1]), 6)
            return {
                "latitude": lat,
                "longitude": lng,
                "formatted_address": formatted_address,
                "location_source": "geocoding",
                "geocoding_status": resolved_status,
                "location_available": True,
                "geocoded_at": timezone.now(),
                "pincode": c_pincode,
                "city": c_city,
                "state": c_state,
                "country": c_country,
            }

        # Failed state — NEVER use default coordinates
        return {
            "latitude": None,
            "longitude": None,
            "formatted_address": formatted_address,
            "location_source": "geocoding",
            "geocoding_status": "failed",
            "location_available": False,
            "geocoded_at": timezone.now(),
            "pincode": c_pincode,
            "city": c_city,
            "state": c_state,
            "country": c_country,
        }

    @classmethod
    def forward_geocode(cls, address: str) -> tuple[float, float] | None:
        """Forward geocodes an address string with caching and validation."""
        if not address or not address.strip():
            return None

        clean_addr = address.strip()
        coords = cls._query_geocoder(clean_addr, country="India")
        if coords and cls.validate_coordinates(coords[0], coords[1], country="India"):
            return coords
        return None

    @classmethod
    def reverse_geocode(cls, latitude: float, longitude: float) -> dict | None:
        """Reverse geocode (lat, lng) to a structured address dict."""
        try:
            lat = round(float(latitude), _COORD_PRECISION)
            lng = round(float(longitude), _COORD_PRECISION)
        except (ValueError, TypeError):
            return None

        if not cls.validate_coordinates(lat, lng, country=""):
            return None

        cache_key = cls._cache_key(lat, lng)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        from accounts.customer_services import detect_customer_location
        try:
            raw = detect_customer_location(lat, lng, accuracy=None)
        except Exception as exc:
            logger.warning("[AddressService] detect_customer_location failed: %s", exc)
            return None

        if not raw:
            return None

        result = {
            "formatted_address": raw.get("formatted_address", ""),
            "locality":          raw.get("area", ""),
            "city":              raw.get("city", ""),
            "state":             raw.get("state", ""),
            "pincode":           raw.get("pincode", ""),
            "country":           raw.get("country", "India"),
            "latitude":          lat,
            "longitude":         lng,
        }

        cache.set(cache_key, result, timeout=REVERSE_GEOCODE_CACHE_TTL)
        return result

    # ── Internal Geocoder Dispatcher ───────────────────────────────────────────

    @classmethod
    def _query_geocoder(cls, query_str: str, country: str = "India") -> tuple[float, float] | None:
        clean_query = query_str.strip()
        if not clean_query:
            return None

        addr_hash = hashlib.md5(clean_query.lower().encode("utf-8")).hexdigest()
        cache_key = f"addr_fwdgeo_v2:{addr_hash}"

        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        # 1. Google Maps Geocoding API if key configured
        google_api_key = (
            os.environ.get("VITE_GOOGLE_MAPS_KEY")
            or os.environ.get("GOOGLE_MAPS_API_KEY")
            or os.environ.get("VITE_GOOGLE_MAPS_API_KEY")
        )
        if google_api_key:
            try:
                params = {"address": clean_query, "key": google_api_key}
                if country.lower() == "india":
                    params["components"] = "country:IN"
                encoded = urllib.parse.urlencode(params)
                g_url = f"https://maps.googleapis.com/maps/api/geocode/json?{encoded}"
                req = urllib.request.Request(g_url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=4) as resp:
                    g_data = json.loads(resp.read().decode("utf-8"))
                if g_data.get("status") == "OK" and g_data.get("results"):
                    loc = g_data["results"][0]["geometry"]["location"]
                    lat, lng = float(loc["lat"]), float(loc["lng"])
                    cache.set(cache_key, (lat, lng), timeout=FORWARD_GEOCODE_CACHE_TTL)
                    return (lat, lng)
            except Exception as e:
                logger.warning("[AddressService] Google geocoding failed: %s", e)

        # 2. Nominatim (OpenStreetMap)
        try:
            params = {
                "q": clean_query,
                "format": "json",
                "limit": "1",
            }
            if country.lower() == "india":
                params["countrycodes"] = "in"
            encoded = urllib.parse.urlencode(params)
            n_url = f"https://nominatim.openstreetmap.org/search?{encoded}"
            req = urllib.request.Request(n_url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=4) as resp:
                n_data = json.loads(resp.read().decode("utf-8"))
            if n_data and isinstance(n_data, list) and len(n_data) > 0:
                lat = float(n_data[0]["lat"])
                lng = float(n_data[0]["lon"])
                cache.set(cache_key, (lat, lng), timeout=FORWARD_GEOCODE_CACHE_TTL)
                return (lat, lng)
        except Exception as e:
            logger.warning("[AddressService] Nominatim geocoding failed: %s", e)

        return None

    @staticmethod
    def _cache_key(lat: float, lng: float) -> str:
        return f"addr_revgeo_v2:{lat:.4f}:{lng:.4f}"


