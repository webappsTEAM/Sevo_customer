/**
 * routing.js
 * High-reliability road geometry and street routing service.
 * Supports multiple public and self-hosted OSRM endpoints with fallback and local in-memory caching.
 */

const ROUTING_SERVERS = [
  import.meta.env.VITE_ROUTING_BASE_URL,
  "https://routing.openstreetmap.de/routed-car",
  "https://router.project-osrm.org",
  "https://routing.openstreetmap.de/routed-bike",
].filter(Boolean)

// In-memory cache for recent route queries to reduce latency and prevent rate-limiting
const routeCache = new Map()

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

  // Cache key rounded to ~10 meters precision
  const cacheKey = `${originLng.toFixed(4)},${originLat.toFixed(4)}->${destLng.toFixed(4)},${destLat.toFixed(4)}`
  const cached = routeCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.data
  }

  for (const serverUrl of ROUTING_SERVERS) {
    try {
      const url = `${serverUrl}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500)

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!res.ok) continue

      const json = await res.json()
      if (json?.routes && json.routes.length > 0) {
        const route = json.routes[0]
        const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        const distanceKm = (route.distance / 1000).toFixed(1)
        const etaMinutes = Math.max(1, Math.round((route.duration / 60) * 1.15))

        // Extract street / leg names if available
        let currentStreetName = ""
        if (route.legs?.[0]?.steps?.length > 0) {
          const firstStep = route.legs[0].steps.find(s => s.name && s.name.trim().length > 0)
          if (firstStep) currentStreetName = firstStep.name
        }

        const result = {
          coordinates,
          distanceKm: parseFloat(distanceKm),
          etaMinutes,
          currentStreetName,
          isRoadRoute: true,
        }

        routeCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      }
    } catch {
      // Try next server
    }
  }

  return null
}