"""
service_requests/services/routing.py

X-10: server-side routing / ETA for live tracking.

Distance and ETA shown to customers and vendors must be computed
server-side -- never trusted from the client -- and must never silently
pretend to be more accurate than they actually are. This module is the
single place that decides how "distance from technician to destination"
and "ETA" get computed for live tracking:

1. If GOOGLE_MAPS_API_KEY is configured (settings.py, sourced from the
   backend .env -- see the comment there) and the Distance Matrix API
   call succeeds, use its real road-network distance/duration.
2. On ANY failure -- no key configured, network error, timeout, a
   non-OK top-level or per-element API status (REQUEST_DENIED,
   OVER_QUERY_LIMIT, ZERO_RESULTS, NOT_FOUND, ...), or a malformed
   response -- fall back to straight-line haversine distance plus an
   assumed urban driving speed.

The result always names which one it used via `source`
("google_maps" vs "straight_line_estimate"), so callers can stay honest
about precision rather than presenting a straight-line guess as if it
were a real route. This mirrors the same principle already applied to
booking flows elsewhere in this codebase: never simulate a success the
backend didn't actually achieve.

Results are cached briefly using the project's existing cache framework
(django.core.cache -- Redis in production with IGNORE_EXCEPTIONS=True
graceful degradation, locmem locally; see CACHES in quicktims/settings.py).
No new caching infrastructure. The cache key rounds coordinates to 5
decimal places (~1.1m) so ordinary GPS jitter of a meter or two doesn't
fragment the cache and doesn't cause a fresh Distance Matrix call on
every single tracking poll.
"""
import logging
import math

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

_ASSUMED_URBAN_SPEED_KMH = 25.0
_CACHE_TTL_SECONDS = 45
_REQUEST_TIMEOUT_SECONDS = 4
_DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


def _haversine_km(lat1, lon1, lat2, lon2):
    try:
        r = 6371.0  # earth radius, km
        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        dphi = math.radians(float(lat2) - float(lat1))
        dlam = math.radians(float(lon2) - float(lon1))
        a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
        return r * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    except (ValueError, TypeError):
        return None


# S-06: Explicit, configurable road curvature factor for estimated fallback.
# When Google Maps API is unreachable or not configured, straight-line distance
# is multiplied by this factor to approximate actual urban road driving distance.
# Defaults to 1.00 (raw straight-line Haversine), or configurable via
# settings.LOGISTICS_ROAD_CURVATURE_FACTOR (e.g. 1.30 for 30% urban detour allowance).
DEFAULT_ROAD_CURVATURE_FACTOR = 1.00


def _straight_line_estimate(origin_lat, origin_lng, dest_lat, dest_lng):
    raw_distance_km = _haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
    if raw_distance_km is None:
        return None
    factor = float(getattr(settings, "LOGISTICS_ROAD_CURVATURE_FACTOR", DEFAULT_ROAD_CURVATURE_FACTOR))
    distance_km = raw_distance_km * factor
    duration_seconds = int(round((distance_km / _ASSUMED_URBAN_SPEED_KMH) * 3600.0))
    return {
        "distance_km": round(distance_km, 2),
        "duration_seconds": max(60, duration_seconds),
        "source": "straight_line_estimate",
        "curvature_factor": factor,
    }


def _cache_key(origin_lat, origin_lng, dest_lat, dest_lng, mode):
    return "gt:route_eta:{}:{:.5f}:{:.5f}:{:.5f}:{:.5f}".format(
        mode, float(origin_lat), float(origin_lng), float(dest_lat), float(dest_lng),
    )


def get_route_eta(origin_lat, origin_lng, dest_lat, dest_lng, mode="driving"):
    """
    Returns:
        {"distance_km": float, "duration_seconds": int,
         "source": "google_maps" | "straight_line_estimate"}
        or None if even the straight-line fallback can't be computed
        (missing/invalid coordinates).

    Never raises: any Google Maps failure (missing key, network error,
    timeout, non-OK status, malformed response) is caught here and
    silently downgrades to the straight-line estimate rather than
    breaking live tracking or bubbling a third-party outage up to the
    customer/vendor.
    """
    if origin_lat is None or origin_lng is None or dest_lat is None or dest_lng is None:
        return None

    fallback = _straight_line_estimate(origin_lat, origin_lng, dest_lat, dest_lng)

    api_key = (getattr(settings, "GOOGLE_MAPS_API_KEY", "") or "").strip()
    if not api_key:
        return fallback

    cache_key = _cache_key(origin_lat, origin_lng, dest_lat, dest_lng, mode)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        resp = requests.get(
            _DISTANCE_MATRIX_URL,
            params={
                "origins": "{:.6f},{:.6f}".format(float(origin_lat), float(origin_lng)),
                "destinations": "{:.6f},{:.6f}".format(float(dest_lat), float(dest_lng)),
                "mode": mode,
                "key": api_key,
            },
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") != "OK":
            logger.warning("Google Maps Distance Matrix top-level status=%r", data.get("status"))
            return fallback

        rows = data.get("rows") or []
        if not rows:
            return fallback
        elements = rows[0].get("elements") or []
        if not elements:
            return fallback
        element = elements[0]
        if element.get("status") != "OK":
            logger.warning("Google Maps Distance Matrix element status=%r", element.get("status"))
            return fallback

        distance_meters = (element.get("distance") or {}).get("value")
        duration_seconds = (element.get("duration") or {}).get("value")
        if distance_meters is None or duration_seconds is None:
            return fallback

        result = {
            "distance_km": round(distance_meters / 1000.0, 2),
            "duration_seconds": int(duration_seconds),
            "source": "google_maps",
        }
        cache.set(cache_key, result, _CACHE_TTL_SECONDS)
        return result

    except requests.RequestException as exc:
        # Do NOT log str(exc) here: requests embeds the full request URL --
        # including the "key=..." query param -- in exception messages for
        # connection/proxy/timeout errors, which would otherwise leak the
        # live Google Maps API key into application logs on every network
        # failure. Log only the exception type; never re-raise a value that
        # might carry the key.
        logger.warning("Google Maps Distance Matrix request failed: %s", type(exc).__name__)
        return fallback
    except (ValueError, KeyError, TypeError) as exc:
        logger.warning("Google Maps Distance Matrix response parse failed: %s", type(exc).__name__)
        return fallback
