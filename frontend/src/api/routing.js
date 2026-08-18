/**
 * routing.js
 * Abstracted road geometry and routing service.
 * Configured via VITE_ROUTING_BASE_URL (defaults to public OSRM for dev).
 * Ensures map components are decoupled from any specific routing engine.
 */
const ROUTING_BASE_URL =
  import.meta.env.VITE_ROUTING_BASE_URL || "https://router.project-osrm.org"

/**
 * Fetch real driving road geometry between origin and destination coordinates.
 * Coordinates are passed as [lng, lat] to OSRM and mapped to [lat, lng] for Leaflet.
 */
export async function fetchRoadRoute(originLng, originLat, destLng, destLat) {
  if (
    originLng == null || originLat == null ||
    destLng == null || destLat == null ||
    isNaN(originLng) || isNaN(originLat) ||
    isNaN(destLng) || isNaN(destLat)
  ) {
    return null
  }

  try {
    const url = `${ROUTING_BASE_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`
    const res = await fetch(url)
    if (!res.ok) return null

    const json = await res.json()
    if (json?.routes && json.routes.length > 0) {
      const route = json.routes[0]
      const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      const distanceKm = (route.distance / 1000).toFixed(1)
      const etaMinutes = Math.max(2, Math.round((route.duration / 60) * 1.15))
      return {
        coordinates,
        distanceKm,
        etaMinutes,
        isRoadRoute: true,
      }
    }
  } catch (err) {
    // Non-blocking fallback to straight-line navigation
  }

  return null
}