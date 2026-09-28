import React, { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapContainer, TileLayer, useMapEvents, Circle, Polygon } from "react-leaflet"
import { ArrowLeft, MapPin, Loader2, Navigation, Target, Plus, Minus, AlertTriangle, CheckCircle2, Search, X } from "lucide-react"
import { AddressBottomSheet } from "./AddressBottomSheet"
import { AddressDetailsForm } from "./AddressDetailsForm"
import { useReverseGeocode } from "./useReverseGeocode"
import { apiRequest } from "../../../api/client.js"
import { searchPlaces } from "../../../services/locationService.js"
import "leaflet/dist/leaflet.css"

// ─── Internal: map event bridge ───────────────────────────────────────────────

/**
 * Listens to Leaflet map events and notifies parent.
 * Must live inside <MapContainer>.
 */
function MapEventBridge({ onDragStart, onMoveEnd, onMapClick }) {
  useMapEvents({
    movestart() { onDragStart() },
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

// ─── Compact Premium 3D Delivery Pin ─────────────────────────────────────────

// ─── Compact Premium 3D Delivery Pin ─────────────────────────────────────────

function Premium3DPinSvg({ isOutOfZone, isServiceBlocked }) {
  const gradId = isOutOfZone ? "pinGradRed" : isServiceBlocked ? "pinGradAmber" : "pinGradGreen"
  const glossId = isOutOfZone ? "pinGlossRed" : isServiceBlocked ? "pinGlossAmber" : "pinGlossGreen"
  const darkStop = isOutOfZone ? "#7F1D1D" : isServiceBlocked ? "#78350F" : "#023B25"
  const midStop = isOutOfZone ? "#DC2626" : isServiceBlocked ? "#D97706" : "#00875A"
  const lightStop = isOutOfZone ? "#F87171" : isServiceBlocked ? "#FBBF24" : "#10B981"
  const brightStop = isOutOfZone ? "#FCA5A5" : isServiceBlocked ? "#FDE68A" : "#34D399"

  return (
    <svg
      viewBox="0 0 44 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        overflow: "visible",
        filter: "drop-shadow(0 6px 12px rgba(0, 40, 25, 0.35))",
      }}
    >
      <defs>
        {/* Main 3D body gradient */}
        <linearGradient id={gradId} x1="4" y1="2" x2="40" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={brightStop} />
          <stop offset="25%" stopColor={lightStop} />
          <stop offset="65%" stopColor={midStop} />
          <stop offset="100%" stopColor={darkStop} />
        </linearGradient>

        {/* 3D radial gloss lighting */}
        <radialGradient id={glossId} cx="32%" cy="26%" r="62%" fx="28%" fy="20%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.2" />
          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        {/* Rim border lighting */}
        <linearGradient id="pinRimGrad" x1="22" y1="2" x2="22" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.2" />
          <stop offset="85%" stopColor="rgba(0,0,0,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </linearGradient>

        {/* Center hole depth bevel */}
        <radialGradient id="holeDepth" cx="45%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="75%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </radialGradient>
      </defs>

      {/* Pin 3D Body */}
      <path
        d="M 22 2 C 11.5 2, 3 10.5, 3 21 C 3 34.5, 19.4 52.8, 21.4 54.8 C 21.75 55.15, 22.25 55.15, 22.6 54.8 C 24.6 52.8, 41 34.5, 41 21 C 41 10.5, 32.5 2, 22 2 Z"
        fill={`url(#${gradId})`}
        stroke="url(#pinRimGrad)"
        strokeWidth="1.2"
      />

      {/* Gloss lighting overlay */}
      <path
        d="M 22 3 C 12.1 3, 4 11.1, 4 21 C 4 33.8, 19.6 51.5, 21.5 53.4 C 21.8 53.7, 22.2 53.7, 22.5 53.4 C 24.4 51.5, 40 33.8, 40 21 C 40 11.1, 31.9 3, 22 3 Z"
        fill={`url(#${glossId})`}
      />

      {/* Top-left specular crescent reflection */}
      <path
        d="M 9.5 18 C 9.5 12.5, 14 7.5, 20.5 6.6 C 18.5 7.2, 13.2 9.5, 11.2 14.8 C 10.4 17.2, 10.8 20.2, 11.6 22 C 10.3 20.9, 9.5 19.5, 9.5 18 Z"
        fill="#FFFFFF"
        fillOpacity="0.45"
      />

      {/* Center cutout hole outer shadow/depth ring */}
      <circle
        cx="22"
        cy="21"
        r="7.5"
        fill="rgba(0, 35, 20, 0.25)"
      />

      {/* Center cutout white circle */}
      <circle
        cx="22"
        cy="20.5"
        r="6.8"
        fill="url(#holeDepth)"
        stroke="rgba(255, 255, 255, 0.95)"
        strokeWidth="0.8"
      />
    </svg>
  )
}

function FixedCenterPin({ lifted, isOutOfZone, isServiceBlocked }) {
  const isAlert = isOutOfZone || isServiceBlocked

  return (
    <div style={pinStyles.wrapper} aria-hidden>
      {/* ── Exact Center Anchor Point (50% 50%) ── */}
      <div style={pinStyles.centerAnchor}>

        {/* Ground Radar & Contact Shadow (centered at 0, 0) */}
        <div style={pinStyles.groundArea}>
          {/* Outer subtle concentric radar circle */}
          <motion.div
            style={{
              ...pinStyles.radarOuter,
              background: isOutOfZone ? "rgba(220, 38, 38, 0.1)" : isServiceBlocked ? "rgba(217, 119, 6, 0.1)" : "rgba(0, 135, 90, 0.12)",
              borderColor: isOutOfZone ? "rgba(220, 38, 38, 0.32)" : isServiceBlocked ? "rgba(217, 119, 6, 0.32)" : "rgba(0, 135, 90, 0.3)",
            }}
            animate={{
              scale: lifted ? 0.92 : [0.94, 1.05, 0.94],
              opacity: lifted ? 0.25 : [0.45, 0.75, 0.45],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Inner concentric radar ring */}
          <motion.div
            style={{
              ...pinStyles.radarInner,
              borderColor: isOutOfZone ? "rgba(220, 38, 38, 0.45)" : isServiceBlocked ? "rgba(217, 119, 6, 0.45)" : "rgba(0, 135, 90, 0.42)",
            }}
            animate={{
              scale: lifted ? 0.88 : [0.96, 1.04, 0.96],
              opacity: lifted ? 0.3 : [0.55, 0.85, 0.55],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
          />

          {/* Direct ground contact anchor shadow dot */}
          <motion.div
            style={{
              ...pinStyles.contactShadow,
              background: isOutOfZone ? "rgba(153, 27, 27, 0.6)" : isServiceBlocked ? "rgba(146, 64, 14, 0.6)" : "rgba(3, 69, 45, 0.65)",
            }}
            animate={{
              scale: lifted ? 0.55 : 1,
              opacity: lifted ? 0.3 : 0.85,
            }}
            transition={{ type: "spring", damping: 18, stiffness: 280 }}
          />
        </div>

        {/* The 3D Pin Motion Wrapper (sitting directly above 0, 0) */}
        <motion.div
          style={pinStyles.pinMotionWrap}
          animate={{
            y: lifted ? -18 : 0,
            scale: lifted ? 1.05 : 1,
          }}
          transition={{
            type: "spring",
            damping: lifted ? 14 : 18,
            stiffness: lifted ? 320 : 280,
            mass: 0.8,
          }}
        >
          {/* Floating Status Warning Popup right above the Pin */}
          {isAlert && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              style={{
                ...pinStyles.warningBubble,
                background: isOutOfZone ? "#dc2626" : "#d97706",
                boxShadow: isOutOfZone ? "0 4px 14px rgba(220,38,38,0.4)" : "0 4px 14px rgba(217,119,6,0.4)",
              }}
            >
              <span style={{ fontSize: 12 }}>⚠️</span>
              <span>{isOutOfZone ? "Outside Service Area" : "Service Unavailable Here"}</span>
            </motion.div>
          )}

          {/* 3D Pin SVG Box */}
          <div style={pinStyles.pinBox}>
            <Premium3DPinSvg isOutOfZone={isOutOfZone} isServiceBlocked={isServiceBlocked} />
          </div>
        </motion.div>

      </div>
    </div>
  )
}

const pinStyles = {
  wrapper: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 800,
  },
  centerAnchor: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 0,
    height: 0,
    pointerEvents: "none",
  },
  groundArea: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 84,
    height: 52,
    marginLeft: -42,
    marginTop: -26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  radarOuter: {
    position: "absolute",
    width: 80,
    height: 48,
    borderRadius: "50%",
    border: "1px solid rgba(0, 135, 90, 0.3)",
    pointerEvents: "none",
  },
  radarInner: {
    position: "absolute",
    width: 48,
    height: 28,
    borderRadius: "50%",
    border: "1.2px solid rgba(0, 135, 90, 0.42)",
    pointerEvents: "none",
  },
  contactShadow: {
    position: "absolute",
    width: 14,
    height: 6,
    borderRadius: "50%",
    filter: "blur(1px)",
    pointerEvents: "none",
  },
  pinMotionWrap: {
    position: "absolute",
    bottom: -1,
    left: -22,
    width: 44,
    height: 56,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transformOrigin: "bottom center",
    willChange: "transform",
    pointerEvents: "none",
    zIndex: 802,
  },
  pinBox: {
    width: 44,
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  warningBubble: {
    position: "absolute",
    bottom: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "4px 10px",
    color: "#ffffff",
    borderRadius: 20,
    fontSize: "0.72rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
    zIndex: 850,
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

// ─── Main Unified Component ───────────────────────────────────────────────────

export function MapPickerScreen({
  initialCoords,
  initialLocation = null,
  serviceSlug = "",
  onClose,
  onConfirm,
  onCenterChange,
  initialFlat = "",
  initialLandmark = ""
}) {
  const [step, setStep] = useState("map") // "map" | "details"
  const [selectedAddressData, setSelectedAddressData] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [pinLifted, setPinLifted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [serviceZones, setServiceZones] = useState([])
  // Fail CLOSED: until the backend has answered for the current pin the
  // location is "checking", not "available". Previously the initial state and
  // any request error (429 throttle, 5xx, network) showed "Service available
  // in your area (Active Zone)" and enabled Confirm for ANY location.
  const [zoneStatus, setZoneStatus] = useState({ inZone: null, serviceAllowed: null, zoneName: null, message: "", checking: true })
  const [currentCenter, setCurrentCenter] = useState(() => {
    const lat = Number(initialLocation?.latitude || initialLocation?.lat || initialCoords?.lat || initialCoords?.latitude) || 12.754598
    const lng = Number(initialLocation?.longitude || initialLocation?.lng || initialCoords?.lng || initialCoords?.longitude) || 77.834477
    return { lat, lng }
  })
  const mapRef = useRef(null)

  // ── Sync with initialLocation when passed ───────────────────────
  useEffect(() => {
    if (initialLocation?.latitude && initialLocation?.longitude) {
      const lat = Number(initialLocation.latitude)
      const lng = Number(initialLocation.longitude)
      if (!isNaN(lat) && !isNaN(lng)) {
        setCurrentCenter({ lat, lng })
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 17, { animate: true, duration: 1 })
        }
      }
    }
  }, [initialLocation])

  // ── Top Search Bar State ───────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchBox, setShowSearchBox] = useState(false)

  // ── Load active service zones from backend ─────────────────────
  // Only draw the zones configured for THIS booking's service. Without the
  // filter every active zone (e.g. a home-services radius circle) was drawn
  // on top of / instead of the Goods & Transport polygon coverage.
  useEffect(() => {
    let active = true
    async function loadZones() {
      const slug = String(serviceSlug || "").trim()
      const isScopedService = /^(goods_transport_|packers_movers)/.test(slug)
      try {
        let res = await apiRequest(
          slug && slug !== "general"
            ? `/settings/service-zones/?services=${encodeURIComponent(slug)}`
            : "/settings/service-zones/"
        )
        // Non-GT flows whose slug is not a zone service slug keep the old
        // "show all zones" behaviour rather than showing nothing.
        if (Array.isArray(res) && res.length === 0 && slug && slug !== "general" && !isScopedService) {
          res = await apiRequest("/settings/service-zones/")
        }
        if (active && Array.isArray(res)) {
          setServiceZones(res)
        }
      } catch { }
    }
    loadZones()
    return () => { active = false }
  }, [serviceSlug])

  // ── Live Geocoding Search Auto-suggest ─────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    let active = true
    setIsSearching(true)
    const searchTimer = setTimeout(async () => {
      try {
        const places = await searchPlaces(searchQuery)
        if (active) {
          setSearchResults(places || [])
        }
      } catch {
        if (active) setSearchResults([])
      } finally {
        if (active) setIsSearching(false)
      }
    }, 350)

    return () => {
      active = false
      clearTimeout(searchTimer)
    }
  }, [searchQuery])

  // ── Reverse geocoding of current map center ────────────────────
  const { address, loading: geoLoading, error: geoError } = useReverseGeocode(currentCenter)

  // ── Real-time service-specific zone check on pin movement (Debounced 600ms & Race Condition Protected) ──────
  const zoneCheckReqIdRef = useRef(0)

  useEffect(() => {
    if (isDragging) return

    const currentReqId = ++zoneCheckReqIdRef.current
    let active = true
    setZoneStatus({ inZone: null, serviceAllowed: null, zoneId: null, zoneName: null, message: "", checking: true })

    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest("/settings/service-zones/check/", {
          method: "POST",
          json: {
            lat: currentCenter.lat,
            lng: currentCenter.lng,
            service_slug: serviceSlug || ""
          }
        })
        if (active && currentReqId === zoneCheckReqIdRef.current && res) {
          setZoneStatus({
            inZone: res.in_zone !== false,
            serviceAllowed: res.service_allowed !== false && res.in_zone !== false,
            zoneId: res.zone?.id || res.zone_id || null,
            zoneName: res.zone?.name || res.zone_name || null,
            message: res.message || "",
            errorCode: res.error_code || "",
            checking: false,
          })
        }
      } catch {
        if (active && currentReqId === zoneCheckReqIdRef.current) {
          setZoneStatus({
            inZone: null,
            serviceAllowed: null,
            zoneId: null,
            zoneName: null,
            checking: false,
            checkFailed: true,
            message: "We couldn't verify service availability for this location. Please move the pin slightly or try again.",
          })
        }
      }
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [currentCenter.lat, currentCenter.lng, serviceSlug, isDragging])

  // ── "Re-center on me" / Live GPS fetch ─────────────────────────
  const handleRecenter = useCallback(() => {
    if (navigator.geolocation) {
      setIsLocating(true)
      const onPos = (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6))
        const lng = parseFloat(pos.coords.longitude.toFixed(6))
        setCurrentCenter({ lat, lng })
        setIsLocating(false)
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 17, { animate: true, duration: 0.8 })
        }
      }

      navigator.geolocation.getCurrentPosition(
        onPos,
        (err) => {
          navigator.geolocation.getCurrentPosition(
            onPos,
            (err2) => {
              setIsLocating(false)
              if (initialCoords && mapRef.current) {
                const initLat = Number(initialCoords.lat || initialCoords.latitude)
                const initLng = Number(initialCoords.lng || initialCoords.longitude)
                if (initLat && initLng) {
                  mapRef.current.flyTo([initLat, initLng], 17, { animate: true, duration: 0.8 })
                  setCurrentCenter({ lat: initLat, lng: initLng })
                }
              }
            },
            { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
          )
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 120000 }
      )
    }
  }, [initialCoords])

  // ── Select Search Suggestion & Fly Map ─────────────────────────
  const handleSelectSearchResult = (result) => {
    if (result && result.lat && result.lng) {
      const lat = parseFloat(result.lat)
      const lng = parseFloat(result.lng)
      if (!isNaN(lat) && !isNaN(lng)) {
        setCurrentCenter({ lat, lng })
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1.2 })
        }
        if (typeof onCenterChange === "function") {
          onCenterChange(lat, lng)
        }
      }
    }
    setSearchResults([])
    setSearchQuery("")
    setShowSearchBox(false)
  }

  // ── Execute Direct Search on Enter or Go Button ────────────────
  const handleSearchSubmit = async (queryText) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim()
    if (!q) return
    if (searchResults.length > 0) {
      handleSelectSearchResult(searchResults[0])
      return
    }
    setIsSearching(true)
    try {
      const places = await searchPlaces(q)
      if (places && places.length > 0) {
        handleSelectSearchResult(places[0])
      }
    } catch (err) {
      console.warn("Search submit error:", err)
    } finally {
      setIsSearching(false)
    }
  }

  // ── Select Saved Address ───────────────────────────────────────
  const handleSelectSavedAddress = (savedItem) => {
    const lat = Number(savedItem.latitude || savedItem.lat)
    const lng = Number(savedItem.longitude || savedItem.lng)
    if (lat && lng) {
      setCurrentCenter({ lat, lng })
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 17, { animate: true, duration: 1 })
      }
    }
  }

  // ── Map Zoom Handlers ──────────────────────────────────────────
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

  // ── Map event handlers ────────────────────────────────────────
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
  const isServiceBlocked = zoneStatus.inZone === true && zoneStatus.serviceAllowed === false
  // Only a completed, successful backend check may mark a location serviceable.
  const isZoneVerified = zoneStatus.inZone === true && !zoneStatus.checking && !zoneStatus.checkFailed

  const handleConfirmLocation = (resolvedAddr) => {
    const targetAddr = resolvedAddr || address || initialLocation || {}
    const fullDisplay = targetAddr.formatted_address || [
      targetAddr.flat_house_no || targetAddr.house_number || initialFlat,
      targetAddr.address_line1 || targetAddr.street_address,
      targetAddr.landmark || initialLandmark,
      targetAddr.locality,
      targetAddr.city,
      targetAddr.state,
      targetAddr.pincode
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ")

    const streetAddress = targetAddr.address_line1 || targetAddr.street_address || [targetAddr.flat_house_no || initialFlat, targetAddr.landmark || initialLandmark].filter(Boolean).join(", ") || fullDisplay.split(",")[0]

    // If user selected an ALREADY SAVED address or explicitly confirms without needing full details form
    if (resolvedAddr && (resolvedAddr.id || resolvedAddr.isSaved || resolvedAddr.is_saved || initialLocation?.id)) {
      const rawType = resolvedAddr.address_type || resolvedAddr.label || resolvedAddr.tag || initialLocation?.address_type || "Home"
      const confirmedData = {
        id: resolvedAddr.id || resolvedAddr.saved_address_id || initialLocation?.address_id || initialLocation?.saved_address_id || initialLocation?.id || `addr_${Date.now()}`,
        address_type: rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase(),
        label: rawType.toLowerCase(),
        flat_house_no: resolvedAddr.flat_house_no || resolvedAddr.house_number || initialLocation?.flat_house_no || initialFlat || "",
        address_line1: streetAddress,
        street_address: streetAddress,
        landmark: resolvedAddr.landmark || initialLocation?.landmark || initialLandmark || "",
        locality: resolvedAddr.locality || address?.locality || "",
        city: resolvedAddr.city || address?.city || initialLocation?.city || "Hosur",
        state: resolvedAddr.state || address?.state || initialLocation?.state || "Tamil Nadu",
        pincode: resolvedAddr.pincode || address?.pincode || initialLocation?.pincode || "635109",
        formatted_address: fullDisplay,
        latitude: Number(currentCenter.lat),
        longitude: Number(currentCenter.lng),
        location_source: initialLocation?.location_source || resolvedAddr.location_source || (resolvedAddr.id ? "saved_address" : "map_pin"),
        geocoding_status: "verified",
        serviceable: isZoneVerified && zoneStatus.serviceAllowed !== false,
        zone_id: zoneStatus.zoneId || resolvedAddr.zone_id || null,
        zone_name: zoneStatus.zoneName || resolvedAddr.zone_name || "Hosur City",
        confirmed_at: new Date().toISOString()
      }

      if (typeof onConfirm === "function") {
        onConfirm(confirmedData)
      }
      if (typeof onCenterChange === "function") {
        onCenterChange(confirmedData.latitude, confirmedData.longitude, confirmedData)
      }
      if (typeof onClose === "function") {
        onClose()
      }
      return
    }

    const finalObj = {
      ...initialLocation,
      ...resolvedAddr,
      formatted_address: fullDisplay || "Custom Location",
      address_line1: streetAddress,
      street_address: streetAddress,
      locality: resolvedAddr?.locality || address?.locality || "",
      city: resolvedAddr?.city || address?.city || initialLocation?.city || "Hosur",
      state: resolvedAddr?.state || address?.state || initialLocation?.state || "Tamil Nadu",
      pincode: resolvedAddr?.pincode || address?.pincode || initialLocation?.pincode || "635109",
      latitude: Number(currentCenter.lat),
      longitude: Number(currentCenter.lng),
      zone_id: zoneStatus.zoneId || resolvedAddr?.zone_id || null,
      zone_name: zoneStatus.zoneName || resolvedAddr?.zone_name || "Hosur City",
      flat_house_no: selectedAddressData?.flat_house_no || initialLocation?.flat_house_no || initialFlat || "",
      landmark: selectedAddressData?.landmark || initialLocation?.landmark || initialLandmark || "",
      location_source: initialLocation?.location_source || "map_pin",
      geocoding_status: "verified",
      address_type: initialLocation?.address_type || "Home"
    }

    // If initialLocation had mode === 'details' or isNew or isEditing
    if (initialLocation?.isNew || initialLocation?.isEditing || initialLocation?.mode === 'details') {
      setSelectedAddressData(finalObj)
      setStep("details")
      return
    }

    // Direct confirm without requiring redundant form if address is already rich
    const rawType = finalObj.address_type || finalObj.label || "Home"
    const confirmedData = {
      id: finalObj.id || finalObj.saved_address_id || `addr_${Date.now()}`,
      address_type: rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase(),
      label: rawType.toLowerCase(),
      flat_house_no: finalObj.flat_house_no || "",
      address_line1: finalObj.address_line1 || finalObj.street_address || "",
      street_address: finalObj.address_line1 || finalObj.street_address || "",
      landmark: finalObj.landmark || "",
      locality: finalObj.locality || "",
      city: finalObj.city || "Hosur",
      state: finalObj.state || "Tamil Nadu",
      pincode: finalObj.pincode || "635109",
      formatted_address: finalObj.formatted_address,
      latitude: Number(currentCenter.lat),
      longitude: Number(currentCenter.lng),
      location_source: finalObj.location_source || "map_pin",
      geocoding_status: "verified",
      serviceable: isZoneVerified && zoneStatus.serviceAllowed !== false,
      zone_id: zoneStatus.zoneId || null,
      zone_name: zoneStatus.zoneName || "Hosur City",
      confirmed_at: new Date().toISOString()
    }

    if (typeof onConfirm === "function") {
      onConfirm(confirmedData)
    }
    if (typeof onCenterChange === "function") {
      onCenterChange(confirmedData.latitude, confirmedData.longitude, confirmedData)
    }
    if (typeof onClose === "function") {
      onClose()
    }
  }

  // ── Open AddressDetailsForm for doorstep edits (Flat/House No, Landmark, Label, Receiver) ──
  const handleOpenDetailsForm = (resolvedAddr) => {
    const targetAddr = resolvedAddr || address || initialLocation || {}
    const fullDisplay = targetAddr.formatted_address || [
      targetAddr.flat_house_no || targetAddr.house_number || initialFlat,
      targetAddr.address_line1 || targetAddr.street_address,
      targetAddr.landmark || initialLandmark,
      targetAddr.locality,
      targetAddr.city,
      targetAddr.state,
      targetAddr.pincode
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ")

    const streetAddress = targetAddr.address_line1 || targetAddr.street_address || [targetAddr.flat_house_no || initialFlat, targetAddr.landmark || initialLandmark].filter(Boolean).join(", ") || fullDisplay.split(",")[0]

    const detailsObj = {
      ...initialLocation,
      ...targetAddr,
      id: targetAddr.id || initialLocation?.id || null,
      address_id: targetAddr.id || initialLocation?.id || null,
      saved_address_id: targetAddr.id || initialLocation?.id || null,
      formatted_address: fullDisplay || "Custom Location",
      address_line1: streetAddress,
      street_address: streetAddress,
      locality: targetAddr.locality || address?.locality || "",
      city: targetAddr.city || address?.city || initialLocation?.city || "Hosur",
      state: targetAddr.state || address?.state || initialLocation?.state || "Tamil Nadu",
      pincode: targetAddr.pincode || address?.pincode || initialLocation?.pincode || "635109",
      latitude: Number(currentCenter.lat),
      longitude: Number(currentCenter.lng),
      zone_id: zoneStatus.zoneId || targetAddr.zone_id || null,
      zone_name: zoneStatus.zoneName || targetAddr.zone_name || "Hosur City",
      flat_house_no: targetAddr.flat_house_no || targetAddr.house_number || initialLocation?.flat_house_no || initialFlat || "",
      landmark: targetAddr.landmark || initialLocation?.landmark || initialLandmark || "",
      location_source: initialLocation?.location_source || "map_pin",
      geocoding_status: "verified",
      address_type: targetAddr.address_type || targetAddr.label || initialLocation?.address_type || "Home",
      label: (targetAddr.label || targetAddr.address_type || initialLocation?.label || "home").toLowerCase(),
      receiver_name: targetAddr.receiver_name || initialLocation?.receiver_name || "",
      receiver_phone: targetAddr.receiver_phone || initialLocation?.receiver_phone || ""
    }

    setSelectedAddressData(detailsObj)
    setStep("details")
  }

  if (step === "details") {
    return (
      <div style={screenStyles.overlay} onClick={onClose}>
        <div style={screenStyles.modalBox} onClick={e => e.stopPropagation()}>
          <AddressDetailsForm
            addressData={selectedAddressData || {
              ...address,
              ...initialLocation,
              latitude: currentCenter.lat,
              longitude: currentCenter.lng,
            }}
            onBack={() => setStep("map")}
            onSubmit={(finalPayload) => {
              const fullDisplay = [
                finalPayload.flat_house_no,
                finalPayload.landmark,
                finalPayload.formatted_address || [finalPayload.locality, finalPayload.city, finalPayload.state, finalPayload.pincode].filter(Boolean).join(", ")
              ].filter(Boolean).join(", ")

              const rawType = finalPayload.address_type || finalPayload.label || initialLocation?.address_type || "Home"
              const confirmedData = {
                id: finalPayload.id || finalPayload.saved_address_id || finalPayload.address_id || `addr_${Date.now()}`,
                address_type: rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase(),
                label: rawType.toLowerCase(),
                flat_house_no: finalPayload.flat_house_no || "",
                address_line1: finalPayload.address_line1 || finalPayload.street_address || [finalPayload.flat_house_no, finalPayload.landmark].filter(Boolean).join(", "),
                street_address: [finalPayload.flat_house_no, finalPayload.landmark].filter(Boolean).join(", "),
                landmark: finalPayload.landmark || "",
                locality: finalPayload.locality || "",
                city: finalPayload.city || "Hosur",
                state: finalPayload.state || "Tamil Nadu",
                pincode: finalPayload.pincode || "635109",
                formatted_address: fullDisplay,
                latitude: Number(currentCenter.lat),
                longitude: Number(currentCenter.lng),
                location_source: initialLocation?.location_source || "add_new",
                geocoding_status: "verified",
                serviceable: isZoneVerified && zoneStatus.serviceAllowed !== false,
                zone_id: zoneStatus.zoneId || finalPayload.zone_id || null,
                zone_name: zoneStatus.zoneName || finalPayload.zone_name || "Hosur City",
                confirmed_at: new Date().toISOString()
              }
              if (typeof onConfirm === "function") {
                onConfirm(confirmedData)
              }
              if (typeof onCenterChange === "function") {
                onCenterChange(currentCenter.lat, currentCenter.lng, confirmedData)
              }
              if (typeof onClose === "function") {
                onClose()
              }
            }}
            onClose={onClose}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={screenStyles.overlay} onClick={onClose}>
      <div style={screenStyles.modalBox} onClick={e => e.stopPropagation()}>

        {/* ── Top Header & Search Bar ───────────────────────────────────────── */}
        <div style={screenStyles.headerContainer}>
          <div style={screenStyles.topBar}>
            <button style={screenStyles.backBtn} onClick={onClose} id="map-picker-back-btn" title="Back">
              <ArrowLeft size={18} />
            </button>
            <span style={screenStyles.topBarTitle}>Select Delivery Location</span>
            <button
              style={screenStyles.searchToggleBtn}
              onClick={() => setShowSearchBox(!showSearchBox)}
              title="Search Location"
            >
              <Search size={18} color="#0f172a" />
            </button>
          </div>

          {/* Search Input Row */}
          <div style={screenStyles.searchBarRow}>
            {showSearchBox ? (
              <div style={screenStyles.searchInputContainer}>
                {isSearching ? (
                  <Loader2 size={16} style={{ color: "#4f46e5", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                ) : (
                  <Search size={16} color="#64748b" onClick={() => handleSearchSubmit()} style={{ cursor: "pointer", flexShrink: 0 }} />
                )}
                <input
                  type="text"
                  placeholder="Search city, area, street, pincode..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearchSubmit()
                    }
                  }}
                  style={screenStyles.searchInput}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSearchResults([]) }} style={screenStyles.clearBtn} title="Clear">
                    <X size={14} color="#64748b" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  style={screenStyles.goSearchBtn}
                  title="Search location"
                >
                  Search
                </button>
              </div>
            ) : (
              <div
                style={{
                  ...screenStyles.searchPill,
                  border: `1.5px solid ${isOutOfZone ? "#fca5a5" : isServiceBlocked ? "#fde68a" : "#a7f3d0"}`,
                  background: isOutOfZone ? "#fef2f2" : isServiceBlocked ? "#fffbeb" : "#fff",
                }}
                onClick={() => setShowSearchBox(true)}
              >
                <MapPin size={16} style={{ color: isOutOfZone ? "#dc2626" : isServiceBlocked ? "#d97706" : "#00875A" }} />
                <span style={screenStyles.searchPillText}>
                  {address?.city ? [address.city, address.state].filter(Boolean).join(", ") : (address?.formatted_address ? address.formatted_address.split(",").slice(0, 2).join(", ") : "Detecting Location...")}
                </span>
                <span style={screenStyles.changeBtn}>
                  Search
                </span>
              </div>
            )}
          </div>

          {/* Auto-suggest Search Results Dropdown */}
          <AnimatePresence>
            {showSearchBox && (searchResults.length > 0 || isSearching || searchQuery.trim().length >= 2) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={screenStyles.searchResultsDropdown}
              >
                {isSearching && searchResults.length === 0 && (
                  <div style={screenStyles.searchingPlaceholder}>
                    <Loader2 size={15} style={{ animation: "spin 1s linear infinite", color: "#00875A", flexShrink: 0 }} />
                    <span>Searching for "{searchQuery}"...</span>
                  </div>
                )}
                {!isSearching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                  <div style={screenStyles.noResultsPlaceholder}>
                    <span>Press Enter or Search to find "{searchQuery}"</span>
                  </div>
                )}
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(item)}
                    style={screenStyles.searchResultItem}
                  >
                    <div style={screenStyles.resultIconBadge}>
                      <MapPin size={15} color="#00875A" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={screenStyles.resultName}>{item.name}</div>
                      <div style={screenStyles.resultSub}>{item.subtitle || item.fullAddress}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Out of zone / blocked service warning banner */}
          {isOutOfZone && (
            <div style={screenStyles.topWarningBanner}>
              <AlertTriangle size={14} style={{ color: "#dc2626", flexShrink: 0 }} />
              <span>Services are not available at this location yet ({zoneStatus.zoneName || "Outside active boundaries"})</span>
            </div>
          )}

          {isServiceBlocked && (
            <div style={screenStyles.topAmberBanner}>
              <AlertTriangle size={14} style={{ color: "#d97706", flexShrink: 0 }} />
              <span>Selected service is currently not available at this location</span>
            </div>
          )}
        </div>

        {/* ── Map area ────────────────────────────────────────────────────────── */}
        <div style={screenStyles.mapWrapper}>

          {/* Loading skeleton */}
          {!mapReady && <MapLoadingSkeleton />}

          {/* Fixed-center CSS pin with out-of-zone & blocked indicator */}
          <FixedCenterPin
            lifted={pinLifted}
            isOutOfZone={isOutOfZone}
            isServiceBlocked={isServiceBlocked}
          />

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
                <Loader2 size={18} style={{ color: "#00875A", animation: "spin 1s linear infinite" }} />
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
            center={[currentCenter?.lat || 12.754598, currentCenter?.lng || 77.834477]}
            zoom={16}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
            attributionControl={false}
            preferCanvas={true}
            inertia={true}
            inertiaDeceleration={2400}
            inertiaMaxSpeed={2000}
            easeLinearity={0.25}
            wheelPxPerZoomLevel={60}
            wheelDebounceTime={25}
            zoomAnimation={true}
            fadeAnimation={true}
            markerZoomAnimation={true}
            tap={false}
            ref={mapRef}
            whenReady={() => setMapReady(true)}
          >
            <TileLayer
              url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={["0", "1", "2", "3"]}
              keepBuffer={8}
              updateWhenIdle={false}
              updateInterval={60}
              maxNativeZoom={19}
              maxZoom={19}
              attribution="&copy; Google Maps"
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
                      color: zone.color || "#00875A",
                      fillColor: zone.color || "#00875A",
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
                      color: zone.color || "#00875A",
                      fillColor: zone.color || "#00875A",
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

        {/* ── Address bottom sheet with unified saved addresses, GPS & confirm ── */}
        <AddressBottomSheet
          address={address}
          initialLocation={initialLocation}
          loading={geoLoading}
          error={geoError}
          zoneStatus={zoneStatus}
          onConfirm={handleConfirmLocation}
          onManualSearch={() => setShowSearchBox(true)}
          onUseCurrentLocation={handleRecenter}
          onSelectSavedAddress={handleSelectSavedAddress}
          onEditDetails={handleOpenDetailsForm}
        />

        <style>{`
          .leaflet-container {
            touch-action: pan-x pan-y !important;
            cursor: grab !important;
            -webkit-tap-highlight-color: transparent;
          }
          .leaflet-container:active {
            cursor: grabbing !important;
          }
          .leaflet-tile-container img {
            will-change: transform;
          }
        `}</style>
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
  topAmberBanner: {
    padding: "6px 14px",
    background: "#fffbeb",
    borderTop: "1px solid #fde68a",
    borderBottom: "1px solid #fde68a",
    color: "#92400e",
    fontSize: "0.74rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  overlay: {
    position: "fixed", inset: 0, zIndex: 10200,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0.75rem",
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(2px)",
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
    zIndex: 20,
    position: "relative",
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
  searchToggleBtn: {
    width: 36, height: 36, borderRadius: "50%",
    border: "1px solid #e2e8f0", background: "#f8fafc",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  topBarTitle: {
    fontSize: "1rem", fontWeight: 800, color: "#0f172a",
  },
  searchBarRow: {
    padding: "0 1.25rem 0.75rem",
  },
  searchInputContainer: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "0.5rem 0.85rem",
    background: "#f8fafc",
    border: "1.5px solid #00875A",
    borderRadius: 14,
  },
  searchInput: {
    flex: 1, border: "none", background: "transparent",
    outline: "none", fontSize: "0.84rem", fontWeight: 600,
    color: "#0f172a",
  },
  clearBtn: {
    background: "none", border: "none", cursor: "pointer",
    padding: 2, display: "flex", alignItems: "center",
  },
  goSearchBtn: {
    padding: "4px 10px",
    background: "#00875A",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontSize: "0.76rem",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: "0 2px 6px rgba(0, 135, 90, 0.3)",
  },
  searchResultsDropdown: {
    position: "absolute", top: "100%", left: 0, right: 0,
    background: "#ffffff", borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 16px 36px rgba(0,0,0,0.22)",
    maxHeight: 280, overflowY: "auto",
    zIndex: 11000,
  },
  searchingPlaceholder: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "14px 18px", color: "#64748b", fontSize: "0.82rem", fontWeight: 600,
  },
  noResultsPlaceholder: {
    padding: "14px 18px", color: "#64748b", fontSize: "0.82rem", fontWeight: 500,
  },
  searchResultItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 18px", borderBottom: "1px solid #f1f5f9",
    cursor: "pointer",
    transition: "background 0.12s ease",
  },
  resultIconBadge: {
    width: 32, height: 32, borderRadius: "50%",
    background: "#ecfdf5", display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  resultName: {
    fontSize: "0.84rem", fontWeight: 800, color: "#0f172a",
  },
  resultSub: {
    fontSize: "0.74rem", color: "#64748b", marginTop: 2,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  searchPill: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "0.625rem 1rem",
    background: "#fff",
    border: "1.5px solid #a7f3d0",
    borderRadius: 16,
    boxShadow: "0 2px 8px rgba(0, 135, 90, 0.08)",
    cursor: "pointer",
  },
  searchPillText: {
    flex: 1, fontSize: "0.88rem", fontWeight: 800, color: "#0f172a",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  changeBtn: {
    fontSize: "0.84rem", fontWeight: 800, color: "#00875A",
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
