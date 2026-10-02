/**
 * CustomerTrackingMap.jsx — sevo Customer Live Tracking Map
 *
 * Production-grade customer live-tracking map:
 *  • Real road map with styled tile layer switcher (Google Streets / Satellite / Dark)
 *  • Smooth requestAnimationFrame vehicle animation (60fps visual movement)
 *  • Shortest-arc heading rotation (prevents 340° backward flips)
 *  • OSRM road route geometry & street snapping with request throttling
 *  • Dynamic service vehicle icons (Bike / Cargo Truck / Service Van)
 *  • Permanent Customer destination marker & arrival geofence
 *  • Auto-follow camera with manual pan/zoom detection & Recenter button
 *  • Automatic map invalidation / resize recovery
 */

import React, { useEffect, useRef, useState, useCallback } from "react"
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Plus, Minus } from "lucide-react"
import {
  createServiceVehicleMarker,
  createCustomerDestinationIcon,
} from "./technicianBikeMarker.js"
import {
  calculateBearing,
  interpolatePosition,
  projectPointOnPolyline,
  haversineDistance,
  formatDistance,
  formatEta,
  getShortestArcAngle,
  getVehicleCategory,
} from "./trackingUtils.js"
import { fetchRoadRoute } from "../../../api/routing.js"

/* ─────────────────────────────────────────────────────────────────────────────
   Map Event Detector — Pauses auto-follow when user manually interacts
───────────────────────────────────────────────────────────────────────────── */
function MapEventsHandler({ onUserInteract }) {
  useMapEvents({
    dragstart() {
      onUserInteract()
    },
    zoomstart() {
      onUserInteract()
    },
    touchmove() {
      onUserInteract()
    },
  })
  return null
}

/* ─────────────────────────────────────────────────────────────────────────────
   Map Resize Listener — Ensures Leaflet container size invalidation
───────────────────────────────────────────────────────────────────────────── */
function MapResizeListener() {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    const container = map.getContainer()

    // Immediate and delayed invalidations for flex/grid layout stabilization
    map.invalidateSize()
    const timer1 = setTimeout(() => map && map.invalidateSize(), 100)
    const timer2 = setTimeout(() => map && map.invalidateSize(), 500)

    let resizeObserver = null
    if (typeof ResizeObserver !== "undefined" && container) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize()
      })
      resizeObserver.observe(container)
    }

    const handleWindowResize = () => {
      map.invalidateSize()
    }
    window.addEventListener("resize", handleWindowResize)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      if (resizeObserver && container) resizeObserver.disconnect()
      window.removeEventListener("resize", handleWindowResize)
    }
  }, [map])
  return null
}

/* ─────────────────────────────────────────────────────────────────────────────
   Camera Controller — Smooth follow with optional lead offset
───────────────────────────────────────────────────────────────────────────── */
function CameraController({
  technicianPos,
  destinationPos,
  bearing = 0,
  speed = 0,
  followMode,
  recenterTrigger,
  stopPoints = [],
}) {
  const map = useMap()
  const initialFitRef = useRef(false)
  const prevTechPosRef = useRef(null)

  // 1. Initial smart fit: show both technician and customer address
  useEffect(() => {
    if (!initialFitRef.current && destinationPos) {
      if (technicianPos) {
        const bounds = L.latLngBounds([technicianPos, destinationPos, ...stopPoints])
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 17, animate: true, duration: 0.9 })
      } else if (stopPoints.length > 0) {
        map.fitBounds(L.latLngBounds([destinationPos, ...stopPoints]), { padding: [70, 70], maxZoom: 17, animate: true, duration: 0.9 })
      } else {
        map.flyTo(destinationPos, 17, { animate: true, duration: 0.8 })
      }
      initialFitRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationPos, technicianPos, map])

  // 2. Smooth follow with camera lead offset
  useEffect(() => {
    if (!followMode || !technicianPos) return
    const prev = prevTechPosRef.current
    if (prev && prev[0] === technicianPos[0] && prev[1] === technicianPos[1]) return
    prevTechPosRef.current = technicianPos

    let targetCenter = technicianPos

    // Forward lead offset when moving
    if (speed > 1.5 && bearing != null) {
      const rad = (bearing * Math.PI) / 180
      const leadDist = 0.0004
      targetCenter = [
        technicianPos[0] + Math.cos(rad) * leadDist,
        technicianPos[1] + Math.sin(rad) * leadDist,
      ]
    }

    map.panTo(targetCenter, { animate: true, duration: 0.5, easeLinearity: 0.35 })
  }, [technicianPos, speed, bearing, followMode, map])

  // 3. Recenter: fit bounds to show technician + customer destination together
  useEffect(() => {
    if (recenterTrigger <= 0) return
    const points = []
    if (technicianPos) points.push(technicianPos)
    if (destinationPos) points.push(destinationPos)
    stopPoints.forEach((p) => points.push(p))
    if (points.length === 0) return
    if (points.length === 1) {
      map.flyTo(points[0], Math.max(map.getZoom(), 17), { animate: true, duration: 0.6 })
    } else {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17, animate: true, duration: 0.7 })
    }
  }, [recenterTrigger, technicianPos, destinationPos, map])

  return null
}

/* ─────────────────────────────────────────────────────────────────────────────
   Custom Compact Zoom Controls — Modern, Tactile & User-Friendly
───────────────────────────────────────────────────────────────────────────── */
function CompactZoomControls() {
  const map = useMap()
  const controlRef = useRef(null)

  useEffect(() => {
    if (controlRef.current) {
      L.DomEvent.disableClickPropagation(controlRef.current)
      L.DomEvent.disableScrollPropagation(controlRef.current)
    }
  }, [])

  const handleZoomIn = (e) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (map) {
      map.zoomIn(1, { animate: true })
    }
  }

  const handleZoomOut = (e) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (map) {
      map.zoomOut(1, { animate: true })
    }
  }

  return (
    <div
      ref={controlRef}
      className="leaflet-control ltp-compact-zoom-group"
      style={{
        position: "absolute",
        bottom: 22,
        right: 14,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(10px)",
        borderRadius: 10,
        boxShadow: "0 4px 18px rgba(0, 0, 0, 0.22), 0 1px 3px rgba(0, 0, 0, 0.1)",
        border: "1px solid rgba(226, 232, 240, 0.9)",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      <button
        type="button"
        className="ltp-compact-zoom-btn"
        onClick={handleZoomIn}
        aria-label="Zoom in"
        title="Zoom In (+)"
        style={{
          width: 38,
          height: 38,
          border: "none",
          background: "transparent",
          color: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.15s, color 0.15s, transform 0.1s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "#f1f5f9"
          e.currentTarget.style.color = "#0284c7"
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "transparent"
          e.currentTarget.style.color = "#0f172a"
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = "scale(0.92)"
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "none"
        }}
      >
        <Plus size={18} strokeWidth={2.4} />
      </button>

      <div style={{ height: 1, background: "#e2e8f0", width: "100%" }} />

      <button
        type="button"
        className="ltp-compact-zoom-btn"
        onClick={handleZoomOut}
        aria-label="Zoom out"
        title="Zoom Out (−)"
        style={{
          width: 38,
          height: 38,
          border: "none",
          background: "transparent",
          color: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.15s, color 0.15s, transform 0.1s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "#f1f5f9"
          e.currentTarget.style.color = "#0284c7"
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "transparent"
          e.currentTarget.style.color = "#0f172a"
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = "scale(0.92)"
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "none"
        }}
      >
        <Minus size={18} strokeWidth={2.4} />
      </button>
    </div>
  )
}

/* Small labelled pin for logistics pickup ("P") / drop ("D") points. */
function createRoutePointIcon(label, color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};color:#fff;font:700 12px/26px system-ui,sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

function toLatLng(loc) {
  const lat = loc?.latitude == null ? NaN : Number(loc.latitude)
  const lng = loc?.longitude == null ? NaN : Number(loc.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main CustomerTrackingMap Component
───────────────────────────────────────────────────────────────────────────── */
export function CustomerTrackingMap({
  technician,
  technicianLocation,
  destination,
  serviceCategory = "",
  issueTitle = "",
  status = "on_the_way",
  freshness = "LIVE",
  etaMinutes = null,
  distanceKm = null,
  startOtp = null,
  vendorName = "",
  requestId = "",
  // Logistics only: { pickup: {latitude, longitude, address}, drop: {...},
  // stops: [{latitude, longitude, address, completed_at, arrived_at}, ...] }.
  // stops is optional -- older callers that only pass {pickup, drop} keep
  // working exactly as before. Null/undefined for non-logistics bookings ->
  // nothing extra is drawn.
  routePoints = null,
}) {
  const [mapLayer, setMapLayer] = useState("google_streets")
  const [roadRoute, setRoadRoute] = useState([])
  const [hasRoadGeometry, setHasRoadGeometry] = useState(false)
  const [currentStreetName, setCurrentStreetName] = useState("")
  const [followMode, setFollowMode] = useState(true)
  const [isStreetZoom, setIsStreetZoom] = useState(false)
  const [recenterTrigger, setRecenterTrigger] = useState(0)
  const [copiedOtp, setCopiedOtp] = useState(false)

  // Real technician identity — never fake names or ratings
  const rawTechName = technician?.name || technician?.full_name || technicianLocation?.technician_name || ""
  const techName = rawTechName && rawTechName !== "pest_control" && rawTechName !== "home_cleaning"
    ? rawTechName
    : ["assigned", "accepted", "on_the_way", "arrived", "in_progress"].includes(status)
      ? "Assigned Service Professional"
      : ""
  const techPhone = technician?.phone || technicianLocation?.technician_phone || ""
  const techPhoto = technician?.photo || technicianLocation?.technician_photo || null
  const techRating = technician?.rating ?? technicianLocation?.technician_rating ?? null

  const handleCopyOtp = () => {
    if (!startOtp || !navigator.clipboard) return
    navigator.clipboard.writeText(startOtp)
    setCopiedOtp(true)
    setTimeout(() => setCopiedOtp(false), 2000)
  }

  const handleCall = () => {
    if (techPhone) window.location.href = `tel:${techPhone}`
  }

  const handleWhatsApp = () => {
    if (!techPhone) return
    const msg = encodeURIComponent(
      `Hi ${techName || "Partner"}, following up on Sevo booking #${requestId || ""}.`
    )
    window.open(`https://wa.me/91${techPhone.replace(/\D/g, "")}?text=${msg}`, "_blank")
  }

  // Determine service vehicle visual category ('bike' | 'truck' | 'van')
  const vehicleCategory = getVehicleCategory(serviceCategory, issueTitle)

  // rAF Animation Refs — Bypasses React state overhead for silky 60fps movement
  const bikeMarkerRef = useRef(null)
  const visualPosRef = useRef(null)
  const visualBearingRef = useRef(0)
  const animFrameRef = useRef(null)
  const animStartTimeRef = useRef(null)
  const animStartPosRef = useRef(null)
  const animTargetPosRef = useRef(null)
  const animStartBearingRef = useRef(0)
  const animTargetBearingRef = useRef(0)
  const lastRouteFetchTimeRef = useRef(0)
  const lastRouteFetchPosRef = useRef(null)

  const isArrived = status === "arrived"
  const isInProgress = status === "in_progress"
  const isTerminal = ["completed", "closed", "cancelled", "rejected", "feedback_pending", "feedback_received"].includes(status)

  // Extract authoritative coordinates
  const destLat = destination?.latitude != null ? parseFloat(destination.latitude) : null
  const destLng = destination?.longitude != null ? parseFloat(destination.longitude) : null
  const destinationPos = destLat != null && destLng != null && !isNaN(destLat) && !isNaN(destLng) ? [destLat, destLng] : null
  // Logistics (GT / Packers & Movers): pickup, drop, and any intermediate
  // TripStop waypoints are drawn as distinct pins, so the generic single
  // destination pin is hidden and the camera fits all of them.
  // Bug found: this used to only include pickup/drop -- intermediate stops
  // (routePoints.stops, e.g. a multi-stop GT trip) were never factored into
  // the camera's fitBounds, so the map could crop a stop right off screen
  // even though it's rendered as a marker (see the stop-marker loop below,
  // also added by this fix) and listed in the address panel.
  const logisticsStopPoints = routePoints
    ? [
        toLatLng(routePoints.pickup),
        toLatLng(routePoints.drop),
        ...(Array.isArray(routePoints.stops) ? routePoints.stops.map(toLatLng) : []),
      ].filter(Boolean)
    : []

  const rawTechLat = technicianLocation?.latitude ?? technician?.latitude
  const rawTechLng = technicianLocation?.longitude ?? technician?.longitude
  const techLat = rawTechLat != null ? parseFloat(rawTechLat) : null
  const techLng = rawTechLng != null ? parseFloat(rawTechLng) : null
  const rawTechnicianPos = techLat != null && techLng != null && !isNaN(techLat) && !isNaN(techLng) ? [techLat, techLng] : null

  const rawBearing = technicianLocation?.heading ?? technician?.heading ?? 0
  const speed = technicianLocation?.speed ?? technician?.speed ?? 0

  const etaText = formatEta(etaMinutes, status)
  const distText = formatDistance(distanceKm ? distanceKm * 1000 : null)

  /* ── 1. Throttled Road Route Fetch (Origin: Real Tech GPS, Destination: Customer Location) ── */
  useEffect(() => {
    if (!rawTechnicianPos || !destinationPos || isTerminal) {
      setRoadRoute([])
      setHasRoadGeometry(false)
      setCurrentStreetName("")
      return
    }

    const now = Date.now()
    const lastFetchPos = lastRouteFetchPosRef.current

    let shouldFetch = !lastFetchPos || lastRouteFetchTimeRef.current === 0
    if (!shouldFetch) {
      const movedM = haversineDistance(
        lastFetchPos[0], lastFetchPos[1],
        rawTechnicianPos[0], rawTechnicianPos[1]
      )
      const elapsedSec = (now - lastRouteFetchTimeRef.current) / 1000
      if (movedM >= 30 && elapsedSec >= 10) shouldFetch = true
    }

    if (!shouldFetch && roadRoute.length > 0) return

    let cancelled = false
      ; (async () => {
        try {
          const res = await fetchRoadRoute(
            rawTechnicianPos[1], rawTechnicianPos[0],
            destinationPos[1], destinationPos[0]
          )
          if (cancelled) return
          if (res?.coordinates && res.coordinates.length > 1) {
            setRoadRoute(res.coordinates)
            setHasRoadGeometry(true)
            if (res.currentStreetName) {
              setCurrentStreetName(res.currentStreetName)
            }
            lastRouteFetchTimeRef.current = Date.now()
            lastRouteFetchPosRef.current = rawTechnicianPos
          } else {
            setRoadRoute([])
            setHasRoadGeometry(false)
          }
        } catch {
          if (!cancelled) {
            setRoadRoute([])
            setHasRoadGeometry(false)
          }
        }
      })()

    return () => { cancelled = true }
  }, [rawTechnicianPos?.[0], rawTechnicianPos?.[1], destinationPos?.[0], destinationPos?.[1], isTerminal])

  /* ── 2. Authoritative Position Animation & Shortest-Arc Rotation ── */
  useEffect(() => {
    if (!rawTechnicianPos || isTerminal || isArrived) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (rawTechnicianPos) {
        visualPosRef.current = rawTechnicianPos
        if (bikeMarkerRef.current) {
          bikeMarkerRef.current.setLatLng(rawTechnicianPos)
          bikeMarkerRef.current.setIcon(createServiceVehicleMarker({
            category: vehicleCategory,
            bearing: visualBearingRef.current || rawBearing,
            status,
            techName,
            techPhoto,
            speed,
            etaText,
            distText,
            freshness,
            showTag: true,
          }))
        }
      }
      return
    }

    // Exact database coordinates
    const targetGps = rawTechnicianPos

    // First position hydration
    if (!visualPosRef.current) {
      visualPosRef.current = targetGps
      let initBearing = rawBearing || 0
      if (initBearing === 0 && destinationPos) {
        initBearing = calculateBearing(
          targetGps[0], targetGps[1],
          destinationPos[0], destinationPos[1]
        )
      }
      visualBearingRef.current = initBearing
      animStartBearingRef.current = initBearing
      animTargetBearingRef.current = initBearing

      if (bikeMarkerRef.current) {
        bikeMarkerRef.current.setLatLng(targetGps)
        bikeMarkerRef.current.setIcon(createServiceVehicleMarker({
          category: vehicleCategory,
          bearing: initBearing,
          status,
          techName,
          techPhoto,
          speed,
          etaText,
          distText,
          freshness,
          showTag: true,
        }))
      }
      return
    }

    // Set up smooth 60fps interpolation to new target GPS fix
    const startPos = visualPosRef.current
    const distM = haversineDistance(startPos[0], startPos[1], targetGps[0], targetGps[1])

    if (distM < 0.5) {
      return
    }

    // Compute bearing heading to target
    let targetBearing = rawBearing
    if (!targetBearing || targetBearing === 0) {
      targetBearing = calculateBearing(
        startPos[0], startPos[1],
        targetGps[0], targetGps[1],
        visualBearingRef.current
      )
    }

    // Shortest angular arc rotation (prevents 340° backward flips across 0°/360°)
    const startBearing = visualBearingRef.current
    const targetArcBearing = getShortestArcAngle(startBearing, targetBearing)

    animStartPosRef.current = startPos
    animTargetPosRef.current = targetGps
    animStartBearingRef.current = startBearing
    animTargetBearingRef.current = targetArcBearing
    animStartTimeRef.current = performance.now()

    // Smooth animation duration (0.8s to 1.2s depending on distance)
    const animDuration = Math.min(1200, Math.max(700, distM * 25))

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    const stepAnimation = (now) => {
      if (!animStartTimeRef.current) return
      const elapsed = now - animStartTimeRef.current
      const progress = Math.min(1.0, elapsed / animDuration)

      // Cubic ease-out for natural gliding vehicle motion
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      const currPos = interpolatePosition(
        animStartPosRef.current,
        animTargetPosRef.current,
        easeProgress
      )
      const currBearing = animStartBearingRef.current + (animTargetBearingRef.current - animStartBearingRef.current) * easeProgress

      visualPosRef.current = currPos
      visualBearingRef.current = currBearing

      // Update Leaflet marker directly without React state re-render loop
      if (bikeMarkerRef.current) {
        bikeMarkerRef.current.setLatLng(currPos)

        bikeMarkerRef.current.setIcon(createServiceVehicleMarker({
          category: vehicleCategory,
          bearing: currBearing,
          status,
          techName,
          techPhoto,
          speed,
          etaText,
          distText,
          freshness,
          showTag: true,
        }))
      }

      if (progress < 1.0) {
        animFrameRef.current = requestAnimationFrame(stepAnimation)
      } else {
        animFrameRef.current = null
      }
    }

    animFrameRef.current = requestAnimationFrame(stepAnimation)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [
    rawTechnicianPos?.[0],
    rawTechnicianPos?.[1],
    rawBearing,
    vehicleCategory,
    status,
    techName,
    techPhoto,
    speed,
    freshness,
    etaText,
    distText,
    destinationPos,
    hasRoadGeometry,
    roadRoute,
    isTerminal,
    isArrived,
  ])

  // Handle User Manual Map Control (Pause auto-follow)
  const handleUserInteract = useCallback(() => {
    setFollowMode(false)
  }, [])

  // Recenter: fit map to show both technician and customer destination
  const handleRecenter = useCallback(() => {
    setFollowMode(true)
    setRecenterTrigger(prev => prev + 1)
  }, [])

  // Toggle Street Level Zoom
  const toggleStreetZoom = () => {
    setIsStreetZoom(prev => !prev)
    setFollowMode(true)
    setRecenterTrigger(prev => prev + 1)
  }

  // Initial center default — prefer destination (customer's booking address)
  const defaultCenter = destinationPos || rawTechnicianPos || [12.9716, 77.5946]

  return (
    <div
      className="ltp-map-wrapper ltp-map-container-wrap"
      style={{ position: "relative", width: "100%", height: "100%", minHeight: "100%" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Floating Control Bar ── */}
      <div className="ltp-compact-layer-switcher ltp-layer-switcher" style={{ position: "absolute", top: 14, right: 14, zIndex: 1000, display: "flex", alignItems: "center", gap: 6 }}>

        {/* Recenter button — fits technician + customer destination */}
        <button
          id="ltp-recenter-btn"
          onClick={handleRecenter}
          title="Show technician & your location"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: followMode ? "linear-gradient(135deg,#2563eb,#0284c7)" : "rgba(15,23,42,0.88)",
            color: "#fff",
            border: followMode ? "none" : "1.5px solid rgba(56,189,248,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: followMode ? "0 2px 12px rgba(37,99,235,0.45)" : "0 2px 8px rgba(0,0,0,0.3)",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="9" strokeOpacity="0.35" />
          </svg>
        </button>

        {[
          { id: "google_streets", label: "Street" },
          { id: "satellite", label: "Satellite" },
          { id: "dark", label: "Dark" },
        ].map(l => (
          <button
            key={l.id}
            className={`ltp-layer-pill ltp-layer-btn ${mapLayer === l.id ? "active" : ""}`}
            onClick={() => setMapLayer(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={17}
        minZoom={4}
        maxZoom={20}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        zoomControl={false}
        attributionControl={false}
        className="ltp-leaflet-container ltp-leaflet-map"
        style={{ width: "100%", height: "100%", minHeight: "100%", zIndex: 1 }}
      >
        <MapEventsHandler onUserInteract={handleUserInteract} />
        <MapResizeListener />

        {/* ── Tile Layers: Google Maps Standard Streets / Google Satellite Hybrid / CartoDB Dark ── */}
        {(mapLayer === "google_streets" || mapLayer === "osm_streets") && (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains={["mt0", "mt1", "mt2", "mt3"]}
            maxZoom={20}
            attribution="&copy; Google Maps"
          />
        )}

        {mapLayer === "satellite" && (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            subdomains={["mt0", "mt1", "mt2", "mt3"]}
            maxZoom={20}
            attribution="&copy; Google Maps Satellite"
          />
        )}

        {mapLayer === "dark" && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains={["a", "b", "c", "d"]}
            maxZoom={19}
            attribution="&copy; CartoDB &copy; OpenStreetMap"
          />
        )}

        <CameraController
          technicianPos={visualPosRef.current || rawTechnicianPos}
          destinationPos={destinationPos}
          bearing={visualBearingRef.current || rawBearing}
          speed={speed}
          followMode={followMode}
          recenterTrigger={recenterTrigger}
          stopPoints={logisticsStopPoints}
        />

        <CompactZoomControls />

        {/* ── 1. Road Route Polyline (Multi-layered Glowing Highway Navigation Track) ── */}
        {hasRoadGeometry && roadRoute.length > 1 && !isTerminal && (
          <>
            {/* Outer Ambient Glow Shadow */}
            <Polyline
              positions={roadRoute}
              pathOptions={{
                color: isArrived ? "#10b981" : "#0284c7",
                weight: 14,
                opacity: 0.35,
                lineCap: "round",
                lineJoin: "round",
                className: "ltp-route-glow",
              }}
            />
            {/* Dark Outline Casing */}
            <Polyline
              positions={roadRoute}
              pathOptions={{
                color: "#0f172a",
                weight: 8,
                opacity: 0.85,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Core Solid Navigation Line */}
            <Polyline
              positions={roadRoute}
              pathOptions={{
                color: isArrived ? "#10b981" : "#38bdf8",
                weight: 5,
                opacity: 1,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Animated Flowing Navigation Direction Pulses */}
            {!isArrived && !isInProgress && (
              <Polyline
                positions={roadRoute}
                pathOptions={{
                  color: "#ffffff",
                  weight: 3,
                  opacity: 0.95,
                  dashArray: "8, 16",
                  lineCap: "round",
                  lineJoin: "round",
                  className: "ltp-route-flow",
                }}
              />
            )}
          </>
        )}

        {/* Straight-line Fallback if OSRM is offline or not yet computed */}
        {!hasRoadGeometry && rawTechnicianPos && destinationPos && !isTerminal && (
          <>
            <Polyline
              positions={[rawTechnicianPos, destinationPos]}
              pathOptions={{
                color: isArrived ? "#10b981" : "#0284c7",
                weight: 10,
                opacity: 0.25,
                lineCap: "round",
              }}
            />
            <Polyline
              positions={[rawTechnicianPos, destinationPos]}
              pathOptions={{
                color: isArrived ? "#10b981" : "#2563eb",
                weight: 4,
                opacity: 0.9,
                dashArray: "8, 10",
                lineCap: "round",
                className: "ltp-route-flow",
              }}
            />
          </>
        )}

        {/* ── 2. Customer Destination Marker & Arrival Geofence (35m Radius) ── */}
        {destinationPos && (
          <>
            <Circle
              center={destinationPos}
              radius={35}
              pathOptions={{
                color: "#10b981",
                fillColor: "#10b981",
                fillOpacity: 0.18,
                weight: 2,
                dashArray: "6, 6",
              }}
            />
            {logisticsStopPoints.length === 0 && (
              <Marker
                position={destinationPos}
                icon={createCustomerDestinationIcon()}
                zIndexOffset={100}
              />
            )}
          </>
        )}

        {/* ── 2b. Logistics pickup (P) & drop (D) points, always both visible ── */}
        {routePoints && [
          ["pickup", "P", "#059669", "Pickup"],
          ["drop", "D", "#dc2626", "Drop"],
        ].map(([key, label, color, title]) => {
          const pos = toLatLng(routePoints[key])
          if (!pos) return null
          return (
            <Marker
              key={`route-${key}`}
              position={pos}
              icon={createRoutePointIcon(label, color)}
              title={`${title}${routePoints[key]?.address ? `: ${routePoints[key].address}` : ""}`}
              zIndexOffset={150}
            />
          )
        })}

        {/* ── 2c. Intermediate stop markers (multi-stop GT trips) ──
            Bug found: these were never rendered -- only pickup/drop had
            markers, so a customer on a multi-stop trip saw the stop listed
            in the address panel (CustomerTrackingPage.jsx) but not on the
            map at all. */}
        {routePoints && Array.isArray(routePoints.stops) && routePoints.stops.map((stop, idx) => {
          const pos = toLatLng(stop)
          if (!pos) return null
          const done = !!(stop.completed_at || stop.arrived_at)
          return (
            <Marker
              key={`route-stop-${stop.id || idx}`}
              position={pos}
              icon={createRoutePointIcon(String(idx + 1), done ? "#64748b" : "#f59e0b")}
              title={`Stop ${idx + 1}${stop.address ? `: ${stop.address}` : ""}${done ? " (completed)" : ""}`}
              zIndexOffset={140}
            />
          )
        })}

        {/* ── 3. Live Technician Vehicle Marker with Real Name & Live Telemetry ── */}
        {rawTechnicianPos && !isTerminal && (
          <Marker
            ref={bikeMarkerRef}
            position={visualPosRef.current || rawTechnicianPos}
            icon={createServiceVehicleMarker({
              category: vehicleCategory,
              bearing: visualBearingRef.current || rawBearing,
              status,
              techName,
              techPhoto,
              speed,
              etaText,
              distText,
              freshness,
              showTag: true,
            })}
            zIndexOffset={1000}
          />
        )}

      </MapContainer>
    </div>
  )
}

export default CustomerTrackingMap

