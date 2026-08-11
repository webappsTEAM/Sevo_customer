"""
service_requests/services/address_service.py

AddressService — address-related business logic for the customer address picker.

Slice 2: reverse_geocode(lat, lng) → structured address dict
  - Delegates to the shared Nominatim helper already in accounts/customer_services
  - Caches results keyed by coordinates rounded to 4 decimal places (~11m precision)
  - TTL: 1 hour (3600s) — long enough to eliminate re-calls for repeated drags
  - Cache backend: whatever Django's "default" cache is configured to
    (LocMemCache in dev, Redis in prod via CACHE_URL env var — see settings.py)

No Google Maps API key is required: we use Nominatim / OpenStreetMap, the same
free geocoder already used throughout the CalTrack backend.
"""

import logging
from django.core.cache import cache

from accounts.customer_services import detect_customer_location

logger = logging.getLogger(__name__)

# Cache TTL in seconds (1 hour)
REVERSE_GEOCODE_CACHE_TTL = 3600

# Coordinate precision for cache key: 4 decimal places ≈ 11 m resolution
_COORD_PRECISION = 4


class AddressService:
    # ── Public API ─────────────────────────────────────────────────────────────

    @classmethod
    def reverse_geocode(cls, latitude: float, longitude: float) -> dict | None:
        """
        Reverse geocode (lat, lng) to a structured address dict.

        Returns:
            {
                formatted_address: str,
                locality: str,        # road/suburb/neighbourhood
                city: str,
                state: str,
                pincode: str,
                country: str,
                latitude: float,
                longitude: float,
            }
        or None if geocoding fails.

        Results are cached for REVERSE_GEOCODE_CACHE_TTL seconds keyed by
        coordinates rounded to _COORD_PRECISION decimal places.
        """
        try:
            lat = round(float(latitude), _COORD_PRECISION)
            lng = round(float(longitude), _COORD_PRECISION)
        except (ValueError, TypeError):
            return None

        cache_key = cls._cache_key(lat, lng)

        # ── Cache hit ──────────────────────────────────────────────────────────
        cached = cache.get(cache_key)
        if cached is not None:
            logger.debug("reverse_geocode cache HIT  (%s, %s)", lat, lng)
            return cached

        # ── Cache miss: call Nominatim via shared helper ───────────────────────
        logger.debug("reverse_geocode cache MISS (%s, %s) — calling Nominatim", lat, lng)
        try:
            raw = detect_customer_location(lat, lng, accuracy=None)
        except Exception as exc:
            logger.warning("reverse_geocode: detect_customer_location raised: %s", exc)
            return None

        if not raw:
            return None

        # Normalise into the slice-2 shape
        result = {
            "formatted_address": raw.get("formatted_address", ""),
            "locality":          raw.get("area", ""),
            "city":              raw.get("city", ""),
            "state":             raw.get("state", ""),
            "pincode":           raw.get("pincode", ""),
            "country":           raw.get("country", ""),
            "latitude":          lat,
            "longitude":         lng,
        }

        cache.set(cache_key, result, timeout=REVERSE_GEOCODE_CACHE_TTL)
        return result

    # ── Private helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _cache_key(lat: float, lng: float) -> str:
        return f"addr_revgeo:{lat:.4f}:{lng:.4f}"
