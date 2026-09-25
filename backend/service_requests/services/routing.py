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
import hashlib

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

_ASSUMED_URBAN_SPEED_KMH = 25.0
_CACHE_TTL_SECONDS = 90      # Extended from 45s: customers don't need sub-minute ETA freshness
_REQUEST_TIMEOUT_SECONDS = 2  # Reduced from 4s: was the direct cause of 4-5s polling stalls
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


def get_canonical_trip_route(booking):
    """
    Issue #9: Canonical GT Route Engine.
    Produces the single authoritative route representation for a booking.
    Combines:
      - Origin / Pickup (address, coordinates)
      - Intermediate TripStops (ordered by sequence, coordinates, progress timestamps)
      - Destination / Drop (address, coordinates)
      - Polyline / leg distances and ETA durations
      - Cryptographic route_hash
    """
    pickup_lat = getattr(booking, "latitude", None)
    pickup_lng = getattr(booking, "longitude", None)
    pickup_addr = getattr(booking, "address", "")

    drop_lat = getattr(booking, "drop_latitude", None)
    drop_lng = getattr(booking, "drop_longitude", None)
    drop_addr = getattr(booking, "drop_address", "")

    trip_stops = list(booking.trip_stops.all().order_by("sequence")) if hasattr(booking, "trip_stops") else []

    stops_data = []
    points = []
    if pickup_lat is not None and pickup_lng is not None:
        points.append((float(pickup_lat), float(pickup_lng)))

    for s in trip_stops:
        s_data = {
            "id": s.id,
            "sequence": s.sequence,
            "stop_type": s.stop_type,
            "address": s.address,
            "latitude": float(s.latitude) if s.latitude is not None else None,
            "longitude": float(s.longitude) if s.longitude is not None else None,
            "contact_name": s.contact_name,
            "contact_phone": s.contact_phone,
            "notes": s.notes,
            "arrived_at": s.arrived_at.isoformat() if s.arrived_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        stops_data.append(s_data)
        if s.latitude is not None and s.longitude is not None:
            points.append((float(s.latitude), float(s.longitude)))

    if drop_lat is not None and drop_lng is not None:
        points.append((float(drop_lat), float(drop_lng)))

    legs = []
    total_distance_km = 0.0
    total_duration_sec = 0
    all_google = True
    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i + 1]
        leg = get_route_eta(p1[0], p1[1], p2[0], p2[1])
        if leg:
            total_distance_km += leg["distance_km"]
            total_duration_sec += leg["duration_seconds"]
            if leg.get("source") != "google_maps":
                all_google = False
            legs.append(leg)

    source = "google_maps" if (all_google and legs) else "straight_line_estimate"

    route_str = f"{pickup_lat},{pickup_lng}:" + ";".join(f"{s['latitude']},{s['longitude']}" for s in stops_data) + f":{drop_lat},{drop_lng}"
    route_hash = hashlib.sha256(route_str.encode("utf-8")).hexdigest()[:16]

    return {
        "booking_id": getattr(booking, "id", None),
        "pickup": {
            "address": pickup_addr,
            "latitude": float(pickup_lat) if pickup_lat is not None else None,
            "longitude": float(pickup_lng) if pickup_lng is not None else None,
        },
        "stops": stops_data,
        "stop_count": len(stops_data) + (2 if pickup_lat and drop_lat else 0),
        "drop": {
            "address": drop_addr,
            "latitude": float(drop_lat) if drop_lat is not None else None,
            "longitude": float(drop_lng) if drop_lng is not None else None,
        },
        "legs": legs,
        "total_distance_km": round(total_distance_km, 2),
        "total_duration_seconds": total_duration_sec,
        "source": source,
        "route_hash": route_hash,
    }
