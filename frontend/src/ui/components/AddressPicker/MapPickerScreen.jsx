/**
 * MapPickerScreen.jsx
 * Slice 2 of 4 — Full-screen map with fixed-center pin + live reverse geocoding
 *
 * Map library: react-leaflet + leaflet (already in project — no new dependency)
 * Tiles: OpenStreetMap (free, no API key required)
 *
 * Key behaviours (Slice 2 additions):
 *  • Reverse geocoding via useReverseGeocode hook (debounced 500ms, AbortController)
 *  • AddressBottomSheet receives live address/loading/error state
 *  • Confirm button enabled only when address is resolved
 *  • Initial GPS coords trigger geocoding immediately on mount
 */

import React, { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapContainer, TileLayer, useMapEvents, Circle, Polygon } from "react-leaflet"
import { ArrowLeft, MapPin, Loader2, Navigation, Target, Plus, Minus, AlertTriangle, CheckCircle2 } from "lucide-react"
import { AddressBottomSheet } from "./AddressBottomSheet"
import { useReverseGeocode } from "./useReverseGeocode"
import { apiRequest } from "../../../api/client.js"
import "leaflet/dist/leaflet.css"

// ─── Internal: map event bridge ───────────────────────────────────────────────

/**
 * Listens to Leaflet map events and notifies parent.
 * Must live inside <MapContainer>.
 */
function MapEventBridge({ onDragStart, onMoveEnd, onMapClick }) {
  useMapEvents({
    dragstart() { onDragStart() },
    moveend(e) {
      const c = e.target.getCenter()
      onMoveEnd(c.lat, c.lng)
    },
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    }
  })
  return null
}

// ─── Fixed-center pin ─────────────────────────────────────────────────────────

/**
 * Absolutely-positioned CSS pin overlaid on the map container.
 * The pin never moves on screen — the map pans beneath it.
 *
 * Animation:
 *  lifted  → pin floats up 10px, shadow grows (drag in progress)
 *  dropped → spring bounce back to rest position (after moveend)
 */
function FixedCenterPin({ lifted, isOutOfZone }) {
  const pinColor = isOutOfZone ? "#DC2626" : "#FF5200"

  return (
    <div style={pinStyles.wrapper} aria-hidden>
      {/* Floating Status Warning Popup right above the Pin */}
      {isOutOfZone && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          style={pinStyles.warningBubble}
        >
          <span style={{ fontSize: 13 }}>⚠️</span>
          <span>Outside Service Area</span>
        </motion.div>
      )}

      {/* Radar pulse circle */}
      <motion.div
        style={{
          ...pinStyles.radarPulse,
          background: isOutOfZone ? "rgba(220, 38, 38, 0.15)" : "rgba(59, 130, 246, 0.2)",
          border: isOutOfZone ? "1.5px solid rgba(220, 38, 38, 0.4)" : "1.5px solid rgba(59, 130, 246, 0.4)",
        }}
        animate={{ scale: lifted ? 0.8 : [0.9, 1.1, 0.9], opacity: lifted ? 0.2 : [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Live GPS dot */}
      <div style={{
        ...pinStyles.blueDot,
        background: isOutOfZone ? "#dc2626" : "#2563eb",
      }} />

      {/* The pin itself */}
      <motion.div
        style={{
          ...pinStyles.pin,
          filter: isOutOfZone ? "drop-shadow(0 6px 12px rgba(220,38,38,0.55))" : "drop-shadow(0 6px 12px rgba(255,82,0,0.45))",
        }}
        animate={{ y: lifted ? -14 : 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 280 }}
      >
        <MapPin size={46} fill={pinColor} color="#ffffff" strokeWidth={1.5} />
      </motion.div>
    </div>
  )
}

const pinStyles = {
  wrapper: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 800,
  },
  warningBubble: {
    position: "absolute",
    bottom: "calc(50% + 32px)",
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 12px",
    background: "#dc2626",
    color: "#ffffff",
    borderRadius: 20,
    fontSize: "0.74rem",
    fontWeight: 800,
    boxShadow: "0 4px 14px rgba(220,38,38,0.4)",
    whiteSpace: "nowrap",
    zIndex: 850,
  },
  radarPulse: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "rgba(59, 130, 246, 0.2)",
    border: "1.5px solid rgba(59, 130, 246, 0.4)",
    marginTop: 22,
  },
  blueDot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "#2563eb",
    border: "2.5px solid #ffffff",
    boxShadow: "0 2px 6px rgba(37,99,235,0.4)",
    marginTop: 22,
    zIndex: 801,
  },
  pin: {
    marginBottom: -22,
    filter: "drop-shadow(0 6px 12px rgba(255,82,0,0.45))",
    zIndex: 802,
  },
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function MapLoadingSkeleton() {
  return (
    <div style={skeletonStyles.overlay}>
      <div style={skeletonStyles.card}>
        <Loader2 size={28} style={{ color: "#6366f1", animation: "spin 1s linear infinite" }} />
        <p style={skeletonStyles.text}>Getting your location…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const skeletonStyles = {
  overlay: {
    position: "absolute", inset: 0, zIndex: 900,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(248,250,252,0.88)", backdropFilter: "blur(4px)",
  },
  card: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    background: "#fff", borderRadius: 20, padding: "1.5rem 2rem",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  },
  text: {
    margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "#475569",
  },
}

// ─── "Locating…" pill ────────────────────────────────────────────────────────

function LocatingPill({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          style={pillStyle}
        >
          <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
          Updating location…
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const pillStyle = {
  position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
  background: "rgba(255,255,255,0.96)", border: "1px solid #e2e8f0",
  borderRadius: 20, padding: "5px 14px", fontSize: "0.75rem", fontWeight: 700,
  color: "#475569", display: "flex", alignItems: "center", gap: 6,
  zIndex: 850, whiteSpace: "nowrap",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {{ lat: number, lng: number }} props.initialCoords  — GPS fix
 * @param {Function} props.onClose         — navigate back
 * @param {Function} [props.onManualSearch] — search modal opener
 * @param {Function} [props.onCenterChange] — callback (lat, lng, address)
 */
export function MapPickerScreen({ initialCoords, onClose, onManualSearch, onCenterChange }) {
  const [mapReady, setMapReady]           = useState(false)
  const [pinLifted, setPinLifted]         = useState(false)
  const [isDragging, setIsDragging]       = useState(false)
  const [isLocating, setIsLocating]       = useState(false)
  const [serviceZones, setServiceZones]   = useState([])
  const [zoneStatus, setZoneStatus]       = useState({ inZone: true, zoneName: null, message: "" })
  const [currentCenter, setCurrentCenter] = useState(initialCoords || { lat: 12.7409, lng: 77.8253 })
  const mapRef                            = useRef(null)

  // ── Load active service zones ──────────────────────────────────
  useEffect(() => {
    async function loadZones() {
      try {
        const res = await apiRequest("/settings/service-zones/")
        if (Array.isArray(res)) {
          setServiceZones(res)
        }
      } catch {}
    }
    loadZones()
  }, [])

  // ── Reverse geocoding ──────────────────────────────────────────
  const { address, loading: geoLoading, error: geoError } = useReverseGeocode(currentCenter)

  // ── Real-time service zone check on pin movement ───────────────
  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest("/settings/service-zones/check/", {
          method: "POST",
          json: { lat: currentCenter.lat, lng: currentCenter.lng }
        })
        if (active && res) {
          setZoneStatus({
            inZone: res.in_zone !== false,
            zoneName: res.zone?.name || null,
            message: res.message || "",
            errorCode: res.error_code || "",
          })
        }
      } catch {
        if (active) setZoneStatus({ inZone: true, zoneName: null, message: "" })
      }
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [currentCenter.lat, currentCenter.lng])

  // ── "Re-center on me" / Live GPS fetch ──────
  const handleRecenter = useCallback(() => {
    if (navigator.geolocation) {
      setIsLocating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6))
          const lng = parseFloat(pos.coords.longitude.toFixed(6))
          setCurrentCenter({ lat, lng })
          setIsLocating(false)
          if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], 17, { animate: true, duration: 1 })
          }
        },
        (err) => {
          console.warn("Geolocation positioning error:", err)
          setIsLocating(false)
          if (initialCoords && mapRef.current) {
            mapRef.current.flyTo([initialCoords.lat, initialCoords.lng], 17, { animate: true })
            setCurrentCenter(initialCoords)
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }
  }, [initialCoords])

  // Automatically request live GPS location on mount if not already present
  useEffect(() => {
    if (!initialCoords) {
      handleRecenter()
    }
  }, [initialCoords, handleRecenter])

  // ── Map Zoom Handlers ────────────────────────────────────────────────
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut()
    }
  }

  // ── Map event handlers ──────────────────────────────────────────────
  const handleDragStart = useCallback(() => {
    setPinLifted(true)
    setIsDragging(true)
  }, [])

  const handleMoveEnd = useCallback((lat, lng) => {
    setPinLifted(false)
    setIsDragging(false)
    setCurrentCenter({ lat, lng })
    if (typeof onCenterChange === "function") onCenterChange(lat, lng)
  }, [onCenterChange])

  const handleMapClick = useCallback((lat, lng) => {
    if (mapRef.current) {
      mapRef.current.panTo([lat, lng], { animate: true })
    }
  }, [])

  const isOutOfZone = zoneStatus.inZone === false

  return (
    <div style={screenStyles.overlay} onClick={onClose}>
      <div style={screenStyles.modalBox} onClick={e => e.stopPropagation()}>

        {/* ── Top Header & Search Bar ───────────────────────────────────────── */}
        <div style={screenStyles.headerContainer}>
          <div style={screenStyles.topBar}>
            <button style={screenStyles.backBtn} onClick={onClose} id="map-picker-back-btn">
              <ArrowLeft size={18} />
            </button>
            <span style={screenStyles.topBarTitle}>Select delivery location</span>
            <div style={{ width: 36 }} />
          </div>

          <div style={screenStyles.searchBarRow}>
            <div style={{
              ...screenStyles.searchPill,
              borderColor: isOutOfZone ? "#fca5a5" : "#fed7aa",
              background: isOutOfZone ? "#fef2f2" : "#fff",
            }}>
              <MapPin size={16} style={{ color: isOutOfZone ? "#dc2626" : "#ff5200" }} />
              <span style={screenStyles.searchPillText}>
                {address?.city ? [address.city, address.state].filter(Boolean).join(", ") : (address?.formatted_address ? address.formatted_address.split(",").slice(0, 2).join(", ") : "Detecting Location...")}
              </span>
              <button
                style={screenStyles.changeBtn}
                onClick={() => typeof onManualSearch === "function" && onManualSearch()}
              >
                Change
              </button>
            </div>
          </div>

          {/* Out of zone banner beneath search */}
          {isOutOfZone && (
            <div style={screenStyles.topWarningBanner}>
              <AlertTriangle size={14} style={{ color: "#dc2626", flexShrink: 0 }} />
              <span>Location is outside admin-defined service area ({zoneStatus.zoneName || "service boundaries"})</span>
            </div>
          )}
        </div>

        {/* ── Map area ────────────────────────────────────────────────────────── */}
        <div style={screenStyles.mapWrapper}>

          {/* Loading skeleton */}
          {!mapReady && <MapLoadingSkeleton />}

          {/* Fixed-center CSS pin with out-of-zone indicator */}
          <FixedCenterPin lifted={pinLifted} isOutOfZone={isOutOfZone} />

          {/* "Updating…" pill while dragging */}
          <LocatingPill visible={isDragging} />

          {/* Floating Map Controls: Zoom In, Zoom Out, Re-Center */}
          <div style={screenStyles.controlsContainer}>
            {/* Zoom Controls */}
            <div style={screenStyles.zoomGroup}>
              <button
                type="button"
                style={screenStyles.zoomBtn}
                onClick={handleZoomIn}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <Plus size={16} strokeWidth={2.5} color="#0f172a" />
              </button>
              <div style={screenStyles.zoomDivider} />
              <button
                type="button"
                style={screenStyles.zoomBtn}
                onClick={handleZoomOut}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <Minus size={16} strokeWidth={2.5} color="#0f172a" />
              </button>
            </div>

            {/* Re-center button */}
            <button
              type="button"
              style={screenStyles.recenterBtn}
              onClick={handleRecenter}
              title="Re-center on my location"
              id="map-recenter-btn"
            >
              {isLocating ? (
                <Loader2 size={18} style={{ color: "#ff5200", animation: "spin 1s linear infinite" }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="7" />
                  <circle cx="12" cy="12" r="2.5" fill="#0f172a" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                </svg>
              )}
            </button>
          </div>

          {/* Leaflet map */}
          <MapContainer
            center={[currentCenter?.lat || 12.7409, currentCenter?.lng || 77.8253]}
            zoom={17}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
            attributionControl={false}
            tap={false}
            ref={mapRef}
            whenReady={() => setMapReady(true)}
          >
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              attribution="&copy; Google Maps"
              maxZoom={19}
            />

            {/* Admin-defined Service Zone Overlays */}
            {serviceZones.map((zone) => {
              if (zone.zone_type === "circle" && zone.center_lat && zone.center_lng) {
                return (
                  <Circle
                    key={zone.id}
                    center={[zone.center_lat, zone.center_lng]}
                    radius={Number(zone.radius_meters || 5000)}
                    pathOptions={{
                      color: zone.color || "#4F46E5",
                      fillColor: zone.color || "#4F46E5",
                      fillOpacity: 0.12,
                      weight: 2,
                      dashArray: "6, 6",
                    }}
                  />
                )
              }
              if (zone.zone_type === "polygon" && zone.polygon?.coordinates?.[0]) {
                return (
                  <Polygon
                    key={zone.id}
                    positions={zone.polygon.coordinates[0].map(([lng, lat]) => [lat, lng])}
                    pathOptions={{
                      color: zone.color || "#4F46E5",
                      fillColor: zone.color || "#4F46E5",
                      fillOpacity: 0.12,
                      weight: 2,
                      dashArray: "6, 6",
                    }}
                  />
                )
              }
              return null
            })}

            <MapEventBridge
              onDragStart={handleDragStart}
              onMoveEnd={handleMoveEnd}
              onMapClick={handleMapClick}
            />
          </MapContainer>
        </div>

        {/* ── Address bottom sheet with zone validation ── */}
        <AddressBottomSheet
          address={address}
          loading={geoLoading}
          error={geoError}
          zoneStatus={zoneStatus}
          onConfirm={(resolvedAddress) => {
            if (typeof onCenterChange === "function") {
              onCenterChange(currentCenter.lat, currentCenter.lng, resolvedAddress)
            }
          }}
          onManualSearch={onManualSearch}
          onUseCurrentLocation={handleRecenter}
          onEditDetails={() => {
            if (typeof onCenterChange === "function") {
              onCenterChange(currentCenter.lat, currentCenter.lng, address)
            }
          }}
        />

      </div>
    </div>
  )
}

// ─── Screen styles ────────────────────────────────────────────────────────────

const screenStyles = {
  topWarningBanner: {
    padding: "6px 14px",
    background: "#fef2f2",
    borderTop: "1px solid #fecaca",
    borderBottom: "1px solid #fecaca",
    color: "#991b1b",
    fontSize: "0.74rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  overlay: {
    position: "fixed", inset: 0, zIndex: 10010,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0.75rem",
    background: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(6px)",
    fontFamily: "inherit",
  },
  modalBox: {
    width: "100%", maxWidth: "440px", height: "720px", maxHeight: "92vh",
    display: "flex", flexDirection: "column",
    background: "#fff", borderRadius: "28px", overflow: "hidden",
    boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
    position: "relative",
  },
  headerContainer: {
    background: "#fff",
    borderBottom: "1px solid #f1f5f9",
    flexShrink: 0,
    zIndex: 10,
  },
  topBar: {
    height: 52, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 1.25rem",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: "50%",
    border: "1px solid #e2e8f0", background: "#f8fafc",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#334155", transition: "background 0.15s",
  },
  topBarTitle: {
    fontSize: "1rem", fontWeight: 800, color: "#0f172a",
  },
  searchBarRow: {
    padding: "0 1.25rem 0.75rem",
  },
  searchPill: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "0.625rem 1rem",
    background: "#fff",
    border: "1.5px solid #fed7aa",
    borderRadius: 16,
    boxShadow: "0 2px 8px rgba(255,82,0,0.06)",
  },
  searchPillText: {
    flex: 1, fontSize: "0.88rem", fontWeight: 800, color: "#0f172a",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  changeBtn: {
    fontSize: "0.84rem", fontWeight: 800, color: "#ff5200",
    background: "none", border: "none", cursor: "pointer", flexShrink: 0,
  },
  mapWrapper: {
    height: "230px", flexShrink: 0, position: "relative", overflow: "hidden",
    background: "#f1f5f9",
  },
  controlsContainer: {
    position: "absolute", right: 14, bottom: 14, zIndex: 820,
    display: "flex", flexDirection: "column", gap: 10, alignItems: "center",
  },
  zoomGroup: {
    display: "flex", flexDirection: "column",
    background: "#ffffff", borderRadius: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
    overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)",
  },
  zoomBtn: {
    width: 38, height: 38,
    background: "#ffffff", border: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "background 0.15s",
    padding: 0,
  },
  zoomDivider: {
    height: 1, background: "#f1f5f9", width: "100%",
  },
  recenterBtn: {
    width: 42, height: 42, borderRadius: "50%",
    background: "#ffffff", border: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
}
