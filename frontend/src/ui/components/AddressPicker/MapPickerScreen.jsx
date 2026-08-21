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

function FixedCenterPin({ lifted, isOutOfZone, isServiceBlocked }) {
  const isAlert = isOutOfZone || isServiceBlocked
  const pinColor = isOutOfZone ? "#DC2626" : isServiceBlocked ? "#D97706" : "#FF5200"

  return (
    <div style={pinStyles.wrapper} aria-hidden>
      {/* Floating Status Warning Popup right above the Pin */}
      {isAlert && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          style={{
            ...pinStyles.warningBubble,
            background: isOutOfZone ? "#dc2626" : "#d97706",
            boxShadow: isOutOfZone ? "0 4px 14px rgba(220,38,38,0.4)" : "0 4px 14px rgba(217,119,6,0.4)",
          }}
        >
          <span style={{ fontSize: 13 }}>⚠️</span>
          <span>{isOutOfZone ? "Outside Service Area" : "Service Unavailable Here"}</span>
        </motion.div>
      )}

      {/* Radar pulse circle */}
      <motion.div
        style={{
          ...pinStyles.radarPulse,
          background: isOutOfZone ? "rgba(220, 38, 38, 0.15)" : isServiceBlocked ? "rgba(217, 119, 6, 0.15)" : "rgba(59, 130, 246, 0.2)",
          border: isOutOfZone ? "1.5px solid rgba(220, 38, 38, 0.4)" : isServiceBlocked ? "1.5px solid rgba(217, 119, 6, 0.4)" : "1.5px solid rgba(59, 130, 246, 0.4)",
        }}
        animate={{ scale: lifted ? 0.8 : [0.9, 1.1, 0.9], opacity: lifted ? 0.2 : [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Live GPS dot */}
      <div style={{
        ...pinStyles.blueDot,
        background: isOutOfZone ? "#dc2626" : isServiceBlocked ? "#d97706" : "#2563eb",
      }} />

      {/* The pin itself */}
      <motion.div
        style={{
          ...pinStyles.pin,
          filter: isOutOfZone ? "drop-shadow(0 6px 12px rgba(220,38,38,0.55))" : isServiceBlocked ? "drop-shadow(0 6px 12px rgba(217,119,6,0.55))" : "drop-shadow(0 6px 12px rgba(255,82,0,0.45))",
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

// ─── Main Unified Component ───────────────────────────────────────────────────

export function MapPickerScreen({
  initialCoords,
  serviceSlug = "",
  onClose,
  onConfirm,
  onCenterChange
}) {
  const [step, setStep]                   = useState("map") // "map" | "details"
  const [selectedAddressData, setSelectedAddressData] = useState(null)
  const [mapReady, setMapReady]           = useState(false)
  const [pinLifted, setPinLifted]         = useState(false)
  const [isDragging, setIsDragging]       = useState(false)
  const [isLocating, setIsLocating]       = useState(false)
  const [serviceZones, setServiceZones]   = useState([])
  const [zoneStatus, setZoneStatus]       = useState({ inZone: true, serviceAllowed: true, zoneName: null, message: "" })
  const [currentCenter, setCurrentCenter] = useState(() => {
    const lat = Number(initialCoords?.lat || initialCoords?.latitude) || 12.754598
    const lng = Number(initialCoords?.lng || initialCoords?.longitude) || 77.834477
    return { lat, lng }
  })
  const mapRef                            = useRef(null)

  // ── Top Search Bar State ───────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching]     = useState(false)
  const [showSearchBox, setShowSearchBox] = useState(false)

  // ── Load active service zones from backend ─────────────────────
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

  // ── Real-time service-specific zone check on pin movement ──────
  useEffect(() => {
    let active = true
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
        if (active && res) {
          setZoneStatus({
            inZone: res.in_zone !== false,
            serviceAllowed: res.service_allowed !== false && res.in_zone !== false,
            zoneName: res.zone?.name || null,
            message: res.message || "",
            errorCode: res.error_code || "",
          })
        }
      } catch {
        if (active) setZoneStatus({ inZone: true, serviceAllowed: true, zoneName: null, message: "" })
      }
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [currentCenter.lat, currentCenter.lng, serviceSlug])

  // ── "Re-center on me" / Live GPS fetch ─────────────────────────
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
            const initLat = Number(initialCoords.lat || initialCoords.latitude)
            const initLng = Number(initialCoords.lng || initialCoords.longitude)
            if (initLat && initLng) {
              mapRef.current.flyTo([initLat, initLng], 17, { animate: true })
              setCurrentCenter({ lat: initLat, lng: initLng })
            }
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }
  }, [initialCoords])

  // ── Select Search Suggestion ───────────────────────────────────
  const handleSelectSearchResult = (result) => {
    if (result.lat && result.lng) {
      setCurrentCenter({ lat: result.lat, lng: result.lng })
      if (mapRef.current) {
        mapRef.current.flyTo([result.lat, result.lng], 17, { animate: true, duration: 1 })
      }
    }
    setSearchResults([])
    setSearchQuery("")
    setShowSearchBox(false)
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

  const handleConfirmLocation = (resolvedAddr) => {
    // If user selected an ALREADY SAVED address (from "SAVED LOCATIONS"),
    // it already has complete details (label, flat/house no, landmark, locality, etc.).
    // Confirm immediately and do NOT show the AddressDetailsForm again!
    if (resolvedAddr && (resolvedAddr.id || resolvedAddr.isSaved || resolvedAddr.is_saved)) {
      const fullDisplay = resolvedAddr.formatted_address || [
        resolvedAddr.address_line1 || resolvedAddr.flat_house_no,
        resolvedAddr.landmark,
        resolvedAddr.locality,
        resolvedAddr.city,
        resolvedAddr.state,
        resolvedAddr.pincode
      ].filter(Boolean).join(", ")

      const confirmedData = {
        ...resolvedAddr,
        formatted_address: fullDisplay,
        address_line1: resolvedAddr.address_line1 || resolvedAddr.flat_house_no || "",
        latitude: Number(resolvedAddr.latitude || resolvedAddr.lat || currentCenter.lat),
        longitude: Number(resolvedAddr.longitude || resolvedAddr.lng || currentCenter.lng),
        zone_id: zoneStatus.zoneName ? 2 : null,
        zone_name: zoneStatus.zoneName || null,
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
      ...resolvedAddr,
      formatted_address: resolvedAddr?.formatted_address || address?.formatted_address || "Custom Location",
      address_line1: resolvedAddr?.address_line1 || address?.address_line1 || address?.locality || "",
      locality: resolvedAddr?.locality || address?.locality || "",
      city: resolvedAddr?.city || address?.city || "",
      state: resolvedAddr?.state || address?.state || "",
      pincode: resolvedAddr?.pincode || address?.pincode || "",
      latitude: currentCenter.lat,
      longitude: currentCenter.lng,
      zone_id: zoneStatus.zoneName ? 2 : null,
      zone_name: zoneStatus.zoneName || null,
    }
    setSelectedAddressData(finalObj)
    setStep("details")
  }

  if (step === "details") {
    return (
      <div style={screenStyles.overlay} onClick={onClose}>
        <div style={screenStyles.modalBox} onClick={e => e.stopPropagation()}>
          <AddressDetailsForm
            addressData={selectedAddressData || {
              ...address,
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

              const confirmedData = {
                ...finalPayload,
                formatted_address: fullDisplay,
                address_line1: [finalPayload.flat_house_no, finalPayload.landmark].filter(Boolean).join(", "),
                latitude: currentCenter.lat,
                longitude: currentCenter.lng,
                zone_id: zoneStatus.zoneName ? 2 : null,
                zone_name: zoneStatus.zoneName || null,
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
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search apartment, street, area, pincode..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={screenStyles.searchInput}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={screenStyles.clearBtn}>
                    <X size={14} color="#64748b" />
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  ...screenStyles.searchPill,
                  borderColor: isOutOfZone ? "#fca5a5" : isServiceBlocked ? "#fde68a" : "#fed7aa",
                  background: isOutOfZone ? "#fef2f2" : isServiceBlocked ? "#fffbeb" : "#fff",
                }}
                onClick={() => setShowSearchBox(true)}
              >
                <MapPin size={16} style={{ color: isOutOfZone ? "#dc2626" : isServiceBlocked ? "#d97706" : "#ff5200" }} />
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
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={screenStyles.searchResultsDropdown}
              >
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(item)}
                    style={screenStyles.searchResultItem}
                  >
                    <div style={screenStyles.resultIconBadge}>
                      <MapPin size={15} color="#ff5200" />
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
            center={[currentCenter?.lat || 12.754598, currentCenter?.lng || 77.834477]}
            zoom={16}
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

        {/* ── Address bottom sheet with unified saved addresses, GPS & confirm ── */}
        <AddressBottomSheet
          address={address}
          loading={geoLoading}
          error={geoError}
          zoneStatus={zoneStatus}
          onConfirm={handleConfirmLocation}
          onManualSearch={() => setShowSearchBox(true)}
          onUseCurrentLocation={handleRecenter}
          onSelectSavedAddress={handleSelectSavedAddress}
          onEditDetails={handleConfirmLocation}
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
    border: "1.5px solid #4f46e5",
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
  searchResultsDropdown: {
    position: "absolute", top: "100%", left: 0, right: 0,
    background: "#fff", borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
    maxHeight: 220, overflowY: "auto",
    zIndex: 999,
  },
  searchResultItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 18px", borderBottom: "1px solid #f8fafc",
    cursor: "pointer",
  },
  resultIconBadge: {
    width: 30, height: 30, borderRadius: "50%",
    background: "#fff7ed", display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  resultName: {
    fontSize: "0.82rem", fontWeight: 800, color: "#0f172a",
  },
  resultSub: {
    fontSize: "0.72rem", color: "#64748b", marginTop: 2,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  searchPill: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "0.625rem 1rem",
    background: "#fff",
    border: "1.5px solid #fed7aa",
    borderRadius: 16,
    boxShadow: "0 2px 8px rgba(255,82,0,0.06)",
    cursor: "pointer",
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
