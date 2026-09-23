/**
 * trackingUtils.js
 * Comprehensive spatial mathematics and telemetry utilities for sevo Customer Live Tracking.
 */

/**
 * Calculates the great-circle distance between two geographic coordinates in meters.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculates the geographic forward bearing (heading) from position A to position B.
 * Returns a normalized angle in degrees [0, 360).
 */
export function calculateBearing(startLat, startLng, endLat, endLng, previousBearing = 0) {
  if (
    startLat == null ||
    startLng == null ||
    endLat == null ||
    endLng == null
  ) {
    return previousBearing
  }

  // Jitter check: if movement is less than 3 meters, keep previous bearing
  const dist = haversineDistance(startLat, startLng, endLat, endLng)
  if (dist != null && dist < 3.0) {
    return previousBearing
  }

  const φ1 = (startLat * Math.PI) / 180
  const φ2 = (endLat * Math.PI) / 180
  const Δλ = ((endLng - startLng) * Math.PI) / 180

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  const bearing = ((θ * 180) / Math.PI + 360) % 360

  return Math.round(bearing * 10) / 10
}

/**
 * Linear interpolation between two coordinates given progress t [0, 1].
 */
export function interpolatePosition(startPos, endPos, t) {
  if (!startPos) return endPos
  if (!endPos) return startPos
  const clampedT = Math.max(0, Math.min(1, t))
  return [
    startPos[0] + (endPos[0] - startPos[0]) * clampedT,
    startPos[1] + (endPos[1] - startPos[1]) * clampedT,
  ]
}

/**
 * Normalizes a point into [lat, lng] format with float parsing and validation.
 */
export function normalizePoint(pt) {
  if (!pt) return null
  if (Array.isArray(pt) && pt.length >= 2 && pt[0] != null && pt[1] != null) {
    const lat = parseFloat(pt[0])
    const lng = parseFloat(pt[1])
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng]
  }
  if (typeof pt === "object" && (pt.lat != null || pt.latitude != null)) {
    const lat = parseFloat(pt.lat ?? pt.latitude)
    const lng = parseFloat(pt.lng ?? pt.longitude)
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng]
  }
  return null
}

/**
 * Calculates the shortest distance from point P to line segment AB.
 */
function distToSegmentSquared(p, v, w) {
  if (!p || !v || !w) return { distSq: Infinity, projected: p }
  const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2
  if (l2 === 0) return { distSq: (p[0] - v[0]) ** 2 + (p[1] - v[1]) ** 2, projected: v }
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2
  t = Math.max(0, Math.min(1, t))
  const proj = [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])]
  return {
    distSq: (p[0] - proj[0]) ** 2 + (p[1] - proj[1]) ** 2,
    projected: proj,
  }
}

/**
 * Projects a raw GPS point onto the nearest road route polyline segment
 * if it is within a reasonable tolerance (e.g. 45 meters).
 */
export function projectPointOnPolyline(gpsPoint, polyline, maxToleranceMeters = 45) {
  const p = normalizePoint(gpsPoint)
  if (!p || !Array.isArray(polyline) || polyline.length < 2) return gpsPoint

  let closestProj = null
  let minDistanceMeters = Infinity

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = normalizePoint(polyline[i])
    const b = normalizePoint(polyline[i + 1])
    if (!a || !b) continue

    const { projected } = distToSegmentSquared(p, a, b)
    if (!projected || projected[0] == null || projected[1] == null) continue

    const distM = haversineDistance(p[0], p[1], projected[0], projected[1])
    if (distM != null && distM < minDistanceMeters) {
      minDistanceMeters = distM
      closestProj = projected
    }
  }

  if (closestProj && minDistanceMeters <= maxToleranceMeters) {
    return closestProj
  }
  return gpsPoint
}

/**
 * Calculates continuous cumulative angle along the shortest angular arc
 * (e.g. 350° to 10° rotates +20° clockwise rather than -340° backwards).
 */
export function getShortestArcAngle(currentVisualAngle, targetBearing) {
  if (currentVisualAngle == null || targetBearing == null || isNaN(targetBearing)) {
    return targetBearing || 0
  }
  const normalizedTarget = ((targetBearing % 360) + 360) % 360
  const currentMod = ((currentVisualAngle % 360) + 360) % 360
  let diff = normalizedTarget - currentMod
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return currentVisualAngle + diff
}

/**
 * Maps a service category name or issue title to a vehicle type ('bike' | 'truck' | 'van').
 */
export function getVehicleCategory(serviceCategory = "", issueTitle = "") {
  const text = `${serviceCategory} ${issueTitle}`.toLowerCase()
  if (
    text.includes("packer") ||
    text.includes("mover") ||
    text.includes("furniture") ||
    text.includes("transport") ||
    text.includes("heavy appliance") ||
    text.includes("mini truck") ||
    text.includes("truck")
  ) {
    return "truck"
  }
  if (
    text.includes("ac service") ||
    text.includes("refrigeration") ||
    text.includes("deep cleaning") ||
    text.includes("pest control") ||
    text.includes("painting") ||
    text.includes("cleaning") ||
    text.includes("van")
  ) {
    return "van"
  }
  return "bike"
}

/**
 * Formats distance in meters into human-readable metric string.
 */
export function formatDistance(distanceMeters) {
  if (distanceMeters == null || isNaN(distanceMeters)) return null
  if (distanceMeters <= 50) return "At location"
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m away`
  return `${(distanceMeters / 1000.0).toFixed(1)} km away`
}

/**
 * Formats ETA minutes into customer-friendly display.
 */
export function formatEta(etaMinutes, status = "on_the_way") {
  if (etaMinutes == null || isNaN(etaMinutes)) return null
  const normStatus = (status || "").toLowerCase()
  if (etaMinutes <= 0) {
    return normStatus === "arrived" ? "Arrived" : "< 1 min"
  }
  if (etaMinutes === 1 || etaMinutes < 1.5) return "1 min"
  return `${Math.round(etaMinutes)} mins`
}

/**
 * Returns customer-facing status badge metadata based on authoritative telemetry freshness.
 */
export function getFreshnessBadge(freshness, status, hasRoadGeometry = true) {
  const normStatus = (status || "").toLowerCase()
  if (normStatus === "arrived") {
    return {
      text: "Technician has arrived at your location",
      shortText: "At Location",
      live: true,
      pillClass: "ltp-pill-arrived",
      dotClass: "ltp-dot-arrived",
    }
  }
  if (normStatus === "in_progress") {
    return {
      text: "Technician is servicing your request",
      shortText: "In Progress",
      live: true,
      pillClass: "ltp-pill-inprogress",
      dotClass: "ltp-dot-inprogress",
    }
  }
  if (["completed", "closed", "feedback_pending", "feedback_received"].includes(normStatus)) {
    return {
      text: "Service completed successfully",
      shortText: "Completed",
      live: true,
      pillClass: "ltp-pill-completed",
      dotClass: "ltp-dot-completed",
    }
  }
  if (normStatus === "confirmed" || normStatus === "new_request" || normStatus === "reviewed") {
    return {
      text: "Finding your service professional...",
      shortText: "Finding Partner",
      live: false,
      pillClass: "ltp-pill-finding",
      dotClass: "ltp-dot-finding",
    }
  }
  if (freshness === "WAITING_FOR_LOCATION" || (["assigned", "accepted"].includes(normStatus) && freshness !== "LIVE")) {
    return {
      text: "Technician assigned • Waiting for location",
      shortText: "Waiting for GPS",
      live: false,
      pillClass: "ltp-pill-waiting-location",
      dotClass: "ltp-dot-waiting-location",
    }
  }
  if (freshness === "LIVE") {
    return {
      text: hasRoadGeometry
        ? "Technician is on the way • Live Road GPS"
        : "Technician is on the way • Live GPS",
      shortText: "Live Road GPS",
      live: true,
      pillClass: "ltp-pill-live",
      dotClass: "ltp-dot-live",
    }
  }
  if (freshness === "UPDATING") {
    return {
      text: "Updating technician location...",
      shortText: "Updating...",
      live: true,
      pillClass: "ltp-pill-updating",
      dotClass: "ltp-dot-updating",
    }
  }
  if (freshness === "DELAYED") {
    return {
      text: "Tracking update in progress...",
      shortText: "Delayed",
      live: false,
      pillClass: "ltp-pill-delayed",
      dotClass: "ltp-dot-delayed",
    }
  }
  if (freshness === "STALE") {
    return {
      text: "Technician location hasn't updated recently",
      shortText: "Low Signal",
      live: false,
      pillClass: "ltp-pill-stale",
      dotClass: "ltp-dot-stale",
    }
  }
  if (freshness === "LOCATION_LOST") {
    return {
      text: "Technician location is temporarily unavailable",
      shortText: "Location Unavailable",
      live: false,
      pillClass: "ltp-pill-lost",
      dotClass: "ltp-dot-lost",
    }
  }
  return {
    text: "Waiting for technician location",
    shortText: "Waiting for GPS",
    live: false,
    pillClass: "ltp-pill-locating",
    dotClass: "ltp-dot-locating",
  }
}
