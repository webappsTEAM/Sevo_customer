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
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet"
import { ArrowLeft, MapPin, Loader2, Navigation, Target } from "lucide-react"
import { AddressBottomSheet } from "./AddressBottomSheet"
import { useReverseGeocode } from "./useReverseGeocode"
import "leaflet/dist/leaflet.css"

// ─── Internal: map event bridge ───────────────────────────────────────────────

/**
 * Listens to Leaflet map events and notifies parent.
 * Must live inside <MapContainer>.
 */
function MapEventBridge({ onDragStart, onMoveEnd }) {
  useMapEvents({
    dragstart() { onDragStart() },
    moveend(e) {
      const c = e.target.getCenter()
      onMoveEnd(c.lat, c.lng)
    },
  })
  return null
}

/**
 * Re-centers the Leaflet map when initialCoords changes.
 * Must live inside <MapContainer>.
 */
function MapCenterSetter({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (map) {
      setTimeout(() => map.invalidateSize(), 100)
    }
    if (coords && map) map.setView([coords.lat, coords.lng], 17, { animate: true })
  }, [coords, map])
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
function FixedCenterPin({ lifted }) {
  return (
    <div style={pinStyles.wrapper} aria-hidden>
      {/* Blue radar pulse circle */}
      <motion.div
        style={pinStyles.radarPulse}
        animate={{ scale: lifted ? 0.8 : [0.9, 1.1, 0.9], opacity: lifted ? 0.2 : [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Blue live GPS dot */}
      <div style={pinStyles.blueDot} />

      {/* The orange pin itself */}
      <motion.div
        style={pinStyles.pin}
        animate={{ y: lifted ? -14 : 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 280 }}
      >
        <MapPin size={46} fill="#FF5200" color="#ffffff" strokeWidth={1.5} />
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
 * @param {Function} [props.onManualSearch] — stub, wired in prompt 2
 * @param {Function} [props.onCenterChange] — stub (lat, lng) — wired in prompt 2
 */
export function MapPickerScreen({ initialCoords, onClose, onManualSearch, onCenterChange }) {
  const [mapReady, setMapReady]           = useState(false)
  const [pinLifted, setPinLifted]         = useState(false)
  const [isDragging, setIsDragging]       = useState(false)
  const [currentCenter, setCurrentCenter] = useState(initialCoords)
  const mapRef                            = useRef(null)

  // ── Slice 2: reverse geocoding ──────────────────────────────────────────
  // currentCenter drives geocoding; initial GPS coords fire on first render
  const { address, loading: geoLoading, error: geoError } = useReverseGeocode(currentCenter)

  // ── "Re-center on me" / Live GPS fetch ──────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    if (!navigator.geolocation) {
      if (initialCoords && mapRef.current) {
        mapRef.current.setView([initialCoords.lat, initialCoords.lng], 17, { animate: true })
        setCurrentCenter(initialCoords)
      }
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6))
        const lng = parseFloat(pos.coords.longitude.toFixed(6))
        setCurrentCenter({ lat, lng })
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 17, { animate: true })
        }
      },
      (err) => {
        if (initialCoords && mapRef.current) {
          mapRef.current.setView([initialCoords.lat, initialCoords.lng], 17, { animate: true })
          setCurrentCenter(initialCoords)
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }, [initialCoords])

  // Automatically request live GPS position on mount
  useEffect(() => {
    handleRecenter()
  }, [handleRecenter])

  // ── Map event handlers ──────────────────────────────────────────────
  const handleDragStart = useCallback(() => {
    setPinLifted(true)
    setIsDragging(true)
  }, [])

  const handleMoveEnd = useCallback((lat, lng) => {
    setPinLifted(false)
    setIsDragging(false)
    setCurrentCenter({ lat, lng })
    // Notify parent (stub — parent can use for analytics etc.)
    if (typeof onCenterChange === "function") onCenterChange(lat, lng)
  }, [onCenterChange])

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
            <div style={screenStyles.searchPill}>
              <MapPin size={16} style={{ color: "#ff5200" }} />
              <span style={screenStyles.searchPillText}>
                {address?.city ? `${address.city}, ${address.state || "Karnataka"}` : "Bengaluru, Karnataka"}
              </span>
              <button
                style={screenStyles.changeBtn}
                onClick={() => typeof onManualSearch === "function" && onManualSearch()}
              >
                Change
              </button>
            </div>
          </div>
        </div>

        {/* ── Map area ────────────────────────────────────────────────────────── */}
        <div style={screenStyles.mapWrapper}>

          {/* Loading skeleton (shown until map tiles fire whenReady) */}
          {!mapReady && <MapLoadingSkeleton />}

          {/* Fixed-center CSS pin */}
          <FixedCenterPin lifted={pinLifted} />

          {/* "Updating…" pill while dragging */}
          <LocatingPill visible={isDragging} />

          {/* Re-center button */}
          <button
            style={screenStyles.recenterBtn}
            onClick={handleRecenter}
            title="Re-center on my location"
            id="map-recenter-btn"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2.5" fill="#0f172a" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </button>

          {/* Leaflet map */}
          <MapContainer
            center={[initialCoords.lat, initialCoords.lng]}
            zoom={17}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
            attributionControl={false}
            tap={false}
            ref={mapRef}
            whenReady={() => setMapReady(true)}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
              maxZoom={19}
            />
            <MapCenterSetter coords={currentCenter} />
            <MapEventBridge
              onDragStart={handleDragStart}
              onMoveEnd={handleMoveEnd}
            />
          </MapContainer>
        </div>

        {/* ── Address bottom sheet ── */}
        <AddressBottomSheet
          address={address}
          loading={geoLoading}
          error={geoError}
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
    height: "200px", flexShrink: 0, position: "relative", overflow: "hidden",
    background: "#f1f5f9",
  },
  recenterBtn: {
    position: "absolute", right: 14, bottom: 14, zIndex: 820,
    width: 44, height: 44, borderRadius: "50%",
    background: "#ffffff", border: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
}
