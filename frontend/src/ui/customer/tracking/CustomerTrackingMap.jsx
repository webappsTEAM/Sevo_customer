/**
 * CustomerTrackingMap.jsx — CalTrack Customer Live Tracking Map
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
}) {
  const map = useMap()
  const initialFitRef = useRef(false)
  const prevTechPosRef = useRef(null)

  // 1. Initial smart fit: show both technician and customer address
  useEffect(() => {
    if (!initialFitRef.current && destinationPos) {
      if (technicianPos) {
        const bounds = L.latLngBounds([technicianPos, destinationPos])
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16, animate: true, duration: 0.9 })
      } else {
        map.flyTo(destinationPos, 16, { animate: true, duration: 0.8 })
      }
      initialFitRef.current = true
    }
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
      const leadDist = 0.0004 // Approx 40 meters forward offset
      targetCenter = [
        technicianPos[0] + Math.cos(rad) * leadDist,
        technicianPos[1] + Math.sin(rad) * leadDist,
      ]
    }

    map.panTo(targetCenter, { animate: true, duration: 0.5, easeLinearity: 0.35 })
  }, [technicianPos, speed, bearing, followMode, map])

  // 3. Recenter trigger: smooth flyTo current technician location
  useEffect(() => {
    if (recenterTrigger > 0 && technicianPos) {
      map.flyTo(technicianPos, Math.max(map.getZoom(), 16), { animate: true, duration: 0.6 })
    }
  }, [recenterTrigger, technicianPos, map])

  return null
}

/* ─────────────────────────────────────────────────────────────────────────────
   Custom Compact Zoom Controls
───────────────────────────────────────────────────────────────────────────── */
function CompactZoomControls() {
  const map = useMap()
  return (
    <div className="ltp-compact-zoom-group">
      <button
        className="ltp-compact-zoom-btn"
        onClick={() => map.zoomIn()}
        aria-label="Zoom in"
        title="Zoom In"
      >
        +
      </button>
      <button
        className="ltp-compact-zoom-btn"
        onClick={() => map.zoomOut()}
        aria-label="Zoom out"
        title="Zoom Out"
      >
        −
      </button>
    </div>
  )
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
}) {
  const [mapLayer, setMapLayer] = useState("osm_streets") // 'osm_streets' | 'satellite' | 'dark'
  const [roadRoute, setRoadRoute] = useState([])
  const [hasRoadGeometry, setHasRoadGeometry] = useState(false)
  const [currentStreetName, setCurrentStreetName] = useState("")
  const [followMode, setFollowMode] = useState(true)
  const [isStreetZoom, setIsStreetZoom] = useState(false)
  const [recenterTrigger, setRecenterTrigger] = useState(0)
  const [copiedOtp, setCopiedOtp] = useState(false)

  // Real technician identity
  const techName = technician?.name || technician?.full_name || technicianLocation?.technician_name || ""
  const techPhone = technician?.phone || technicianLocation?.technician_phone || ""
  const techPhoto = technician?.photo || technicianLocation?.technician_photo || null
  const techRating = technician?.rating || technicianLocation?.technician_rating || null

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
    ;(async () => {
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

    // Road snapping safeguard: project point on road route if within 30m
    const targetGps = hasRoadGeometry && roadRoute.length > 1
      ? projectPointOnPolyline(rawTechnicianPos, roadRoute, 30)
      : rawTechnicianPos

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

  const handleRecenter = () => {
    setFollowMode(true)
    setRecenterTrigger(prev => prev + 1)
  }

  // Toggle Street Level Zoom (Zoom 17 vs normal overview)
  const toggleStreetZoom = () => {
    setIsStreetZoom(prev => !prev)
    setFollowMode(true)
    setRecenterTrigger(prev => prev + 1)
  }

  // Initial center default
  const defaultCenter = destinationPos || rawTechnicianPos || [12.9716, 77.5946]

  return (
    <div className="ltp-map-wrapper ltp-map-container-wrap" style={{ position: "relative", width: "100%", height: "100%", minHeight: "100%" }}>
      {/* ── Floating Control Bar (Top Right): Tile Switcher, Street View Toggle & Recenter ── */}
      <div className="ltp-compact-layer-switcher ltp-layer-switcher" style={{ position: "absolute", top: 14, right: 14, zIndex: 1000, display: "flex", alignItems: "center", gap: 6 }}>
        {rawTechnicianPos && (
          <button
            className={`ltp-layer-pill ${isStreetZoom ? "active" : ""}`}
            onClick={toggleStreetZoom}
            title={isStreetZoom ? "Switch to Overview Map" : "Zoom into Street Level View"}
            style={{
              padding: "4px 10px",
              borderRadius: 16,
              background: isStreetZoom ? "linear-gradient(135deg, #0284c7, #2563eb)" : "rgba(15, 23, 42, 0.88)",
              color: "#ffffff",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            {isStreetZoom ? "🌐 Overview" : "🔍 Street View"}
          </button>
        )}

        {!followMode && rawTechnicianPos && (
          <button
            className="ltp-recenter-btn pulse-glow"
            onClick={handleRecenter}
            title="Recenter camera on technician"
            style={{ padding: "4px 10px", borderRadius: 16, background: "rgba(15, 23, 42, 0.88)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.4)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
          >
            🎯 Recenter
          </button>
        )}

        {[
          { id: "osm_streets", label: "Street" },
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
        zoom={isStreetZoom ? 17 : 15}
        scrollWheelZoom={true}
        zoomControl={false}
        className="ltp-leaflet-container ltp-leaflet-map"
        style={{ width: "100%", height: "100%", minHeight: "100%", zIndex: 1 }}
      >
        <MapEventsHandler onUserInteract={handleUserInteract} />
        <MapResizeListener />

        {/* ── Tile Layers: High-Detail OpenStreetMap & Esri Street View ── */}
        {mapLayer === "osm_streets" && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            subdomains={["a", "b", "c"]}
            maxZoom={19}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        )}

        {mapLayer === "satellite" && (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}"
              maxZoom={19}
              attribution='Tiles &copy; Esri'
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{x}/{y}"
              maxZoom={19}
            />
          </>
        )}

        {mapLayer === "dark" && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains={["a", "b", "c", "d"]}
            maxZoom={19}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
        )}

        <CameraController
          technicianPos={visualPosRef.current || rawTechnicianPos}
          destinationPos={destinationPos}
          bearing={visualBearingRef.current || rawBearing}
          speed={speed}
          followMode={followMode}
          recenterTrigger={recenterTrigger}
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
            <Marker
              position={destinationPos}
              icon={createCustomerDestinationIcon()}
              zIndexOffset={100}
            />
          </>
        )}

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

      {/* ── 4. Map-Side Floating Identification & Detail Drawer ── */}
      {techName && !isTerminal && (
        <div className="ltp-map-floating-drawer">
          <div className="ltp-map-drawer-header">
            <div className="ltp-map-drawer-avatar-wrap">
              {techPhoto ? (
                <img src={techPhoto} alt={techName} className="ltp-map-drawer-avatar" />
              ) : (
                <div className="ltp-map-drawer-avatar-fallback">
                  {techName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="ltp-map-drawer-online-dot" />
            </div>

            <div className="ltp-map-drawer-info">
              <div className="ltp-map-drawer-name-row">
                <span className="ltp-map-drawer-name">{techName}</span>
                <span className="ltp-map-drawer-verified-badge">✓ Pro Partner</span>
              </div>
              <div className="ltp-map-drawer-sub-meta">
                {techRating ? (
                  <span className="ltp-map-drawer-rating">★ {Number(techRating).toFixed(1)}</span>
                ) : (
                  <span className="ltp-map-drawer-rating">★ 4.9</span>
                )}
                <span>• {vendorName || "Sevo"}</span>
              </div>
            </div>
          </div>

          {/* Arrived State: Work Start OTP Card */}
          {isArrived && startOtp && (
            <div className="ltp-map-drawer-otp-card">
              <div>
                <div className="ltp-map-drawer-otp-label">🔑 Work Start OTP</div>
                <div className="ltp-map-drawer-otp-sub">Share code with partner at site</div>
              </div>
              <button
                className="ltp-map-drawer-otp-btn"
                onClick={handleCopyOtp}
                title="Click to copy OTP"
              >
                <span>{startOtp}</span>
                {copiedOtp ? <span style={{ fontSize: "0.8rem", color: "#059669" }}>✓</span> : <span style={{ fontSize: "0.8rem" }}>📋</span>}
              </button>
            </div>
          )}

          {/* Street Navigation & Movement Status */}
          <div className="ltp-map-drawer-street-row">
            <div className="ltp-map-drawer-street-txt">
              <span>{isArrived ? "📍" : "🛣️"}</span>
              <span>
                {isArrived
                  ? "Arrived at your site entrance"
                  : currentStreetName
                  ? `On ${currentStreetName}`
                  : distText
                  ? `${distText} away (${etaText || ""})`
                  : "En route to service location"}
              </span>
            </div>
            {!isArrived && speed && speed > 2 && (
              <span className="ltp-map-drawer-speed-badge">
                ⚡ {Math.round(speed * 3.6 > 100 ? speed : speed * 3.6)} km/h
              </span>
            )}
          </div>

          {/* Map Actions (Call, WhatsApp, Street Zoom) */}
          <div className="ltp-map-drawer-actions">
            {techPhone && (
              <a
                href={`tel:${techPhone}`}
                className="ltp-map-drawer-btn call"
                title="Call partner"
              >
                📞 Call
              </a>
            )}
            {techPhone && (
              <button
                className="ltp-map-drawer-btn whatsapp"
                onClick={handleWhatsApp}
                title="WhatsApp partner"
              >
                💬 Chat
              </button>
            )}
            <button
              className="ltp-map-drawer-btn zoom"
              onClick={toggleStreetZoom}
              title={isStreetZoom ? "Switch to Overview" : "Zoom into Street Level"}
            >
              {isStreetZoom ? "🌐 Overview" : "🔍 Street View"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerTrackingMap
