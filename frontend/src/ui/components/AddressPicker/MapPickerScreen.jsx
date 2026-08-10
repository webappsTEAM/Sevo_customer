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
import { ArrowLeft, MapPin, Loader2, Navigation } from "lucide-react"
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
      {/* Shadow dot on the ground */}
      <motion.div
        style={pinStyles.shadow}
        animate={{ scale: lifted ? 0.6 : 1, opacity: lifted ? 0.3 : 0.55 }}
        transition={{ type: "spring", damping: 20, stiffness: 280 }}
      />

      {/* The pin itself */}
      <motion.div
        style={pinStyles.pin}
        animate={{ y: lifted ? -14 : 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 280 }}
      >
        <MapPin size={44} fill="#6366f1" color="#fff" strokeWidth={1.5} />
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
  pin: {
    // Offset upward so the pin tip aligns with the true center point
    marginBottom: -22,
    filter: "drop-shadow(0 6px 12px rgba(99,102,241,0.45))",
  },
  shadow: {
    width: 14,
    height: 8,
    borderRadius: "50%",
    background: "rgba(99,102,241,0.4)",
    marginTop: 22,
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

  // ── "Re-center on me" button ──────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView(
        [initialCoords.lat, initialCoords.lng], 17, { animate: true }
      )
      // Also reset geocoding to GPS coords
      setCurrentCenter(initialCoords)
    }
  }, [initialCoords])

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
    <div style={screenStyles.root}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={screenStyles.topBar}>
        <button style={screenStyles.backBtn} onClick={onClose} id="map-picker-back-btn">
          <ArrowLeft size={20} />
        </button>
        <span style={screenStyles.topBarTitle}>Choose location</span>
        <div style={{ width: 40 }} />
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
          <Navigation size={18} style={{ color: "#6366f1" }} />
        </button>

        {/* Leaflet map */}
        <MapContainer
          center={[initialCoords.lat, initialCoords.lng]}
          zoom={17}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
          attributionControl={false}
          // Disable POI info windows (Leaflet doesn't show them by default,
          // but we disable tap to be safe on mobile)
          tap={false}
          ref={mapRef}
          whenReady={() => setMapReady(true)}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            maxZoom={19}
          />
          {/* Re-center the map when initialCoords changes */}
          <MapCenterSetter coords={initialCoords} />
          {/* Drag/move event bridge */}
          <MapEventBridge
            onDragStart={handleDragStart}
            onMoveEnd={handleMoveEnd}
          />
        </MapContainer>
      </div>

      {/* ── Address bottom sheet — Slice 2: receives live geocoding state ───────── */}
      <AddressBottomSheet
        address={address}
        loading={geoLoading}
        error={geoError}
        onConfirm={(resolvedAddress) => {
          // Stub: Slice 3 wires this to the address details form
          if (typeof onCenterChange === "function") {
            onCenterChange(currentCenter.lat, currentCenter.lng, resolvedAddress)
          }
        }}
        onManualSearch={onManualSearch}
      />

    </div>
  )
}

// ─── Screen styles ────────────────────────────────────────────────────────────

const screenStyles = {
  root: {
    position: "fixed", inset: 0, zIndex: 10010,
    display: "flex", flexDirection: "column",
    background: "#fff", fontFamily: "inherit",
  },
  topBar: {
    height: 56, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 1rem",
    background: "#fff",
    borderBottom: "1px solid #f1f5f9",
    zIndex: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: "50%",
    border: "1px solid #e2e8f0", background: "#f8fafc",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#334155", transition: "background 0.15s",
  },
  topBarTitle: {
    fontSize: "1rem", fontWeight: 800, color: "#0f172a",
  },
  mapWrapper: {
    flex: 1, position: "relative", overflow: "hidden",
    background: "#f1f5f9",
  },
  recenterBtn: {
    position: "absolute", right: 14, top: 14, zIndex: 820,
    width: 44, height: 44, borderRadius: "50%",
    background: "#fff", border: "1.5px solid #e2e8f0",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    transition: "box-shadow 0.15s",
  },
}
