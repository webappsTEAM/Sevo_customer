import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
  X,
  Phone,
  MessageSquare,
  Navigation,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  RefreshCw,
  Sparkles,
  ChevronRight,
  User,
  KeyRound,
  Shield,
  Bike,
  Home as HomeIcon,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Ban,
  AlertTriangle,
  Wrench,
  Radio
} from "lucide-react"
import { API_BASE_URL } from "../../api/client.js"
import { BookingCancellationModal } from "./BookingCancellationModal.jsx"
import { fetchRoadRoute } from "../../api/routing.js"

// Swiggy/Uber-style Custom HTML DivIcons
const createCustomerHomeIcon = () => {
  return L.divIcon({
    className: "swiggy-customer-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="background: #0f172a; color: white; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); white-space: nowrap; margin-bottom: 5px; display: flex; align-items: center; gap: 4px; border: 1.5px solid rgba(255,255,255,0.25);">
          <span>🏠</span> <span>Your Delivery Address</span>
        </div>
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">
          <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background: rgba(16, 185, 129, 0.3); animation: swiggyPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #10B981, #059669); border: 3px solid white; box-shadow: 0 4px 16px rgba(5,150,105,0.5); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [100, 78],
    iconAnchor: [50, 72],
    popupAnchor: [0, -72],
  })
}

const createTechnicianBikeIcon = (techName) => {
  const shortName = techName ? techName.split(" ")[0] : "Partner"
  return L.divIcon({
    className: "swiggy-rider-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="background: linear-gradient(135deg, #FC8019, #E23744); color: white; font-size: 11px; font-weight: 900; padding: 3px 10px; border-radius: 8px; box-shadow: 0 6px 16px rgba(226,55,68,0.4); white-space: nowrap; margin-bottom: 5px; display: flex; align-items: center; gap: 4px; text-transform: uppercase; letter-spacing: 0.5px; border: 1.5px solid rgba(255,255,255,0.3);">
          <span>🛵</span> <span>${shortName}</span>
        </div>
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 54px; height: 54px;">
          <div style="position: absolute; width: 54px; height: 54px; border-radius: 50%; background: rgba(252, 128, 25, 0.4); animation: swiggyPulse 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #FC8019, #FF5200); border: 3.5px solid white; box-shadow: 0 6px 20px rgba(252,128,25,0.6); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="15" cy="5" r="1"/>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
            </svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [90, 82],
    iconAnchor: [45, 76],
    popupAnchor: [0, -76],
  })
}

// Controller to auto-fit bounds on initial load & recenter
function MapBoundsController({ points, trigger }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    const validPoints = points.filter(p => p && p[0] && p[1])
    if (validPoints.length === 1) {
      map.flyTo(validPoints[0], 15, { duration: 1.2 })
    } else if (validPoints.length > 1) {
      const bounds = L.latLngBounds(validPoints)
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16, duration: 1.2 })
    }
  }, [points, trigger, map])
  return null
}

export default function CustomerLiveTrackingModal({ booking, onClose }) {
  const [loading, setLoading] = useState(true)
  const [liveData, setLiveData] = useState(null)
  const [roadRoute, setRoadRoute] = useState([])
  const [roadDistanceKm, setRoadDistanceKm] = useState(null)
  const [roadEtaMins, setRoadEtaMins] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const [recenterTrigger, setRecenterTrigger] = useState(0)
  const [copiedOtp, setCopiedOtp] = useState(false)
  const [tileLayerType, setTileLayerType] = useState("osm") // 'osm' (CartoDB Voyager) | 'dark' (CartoDB Dark)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const bookingId = booking?.id

  // Real-Time WebSocket Connection + Resilient 4-second Polling Backup
  // In-flight guard: skips a cycle if previous request is still running
  // Terminal guard: stops REST polling after booking reaches a final state
  useEffect(() => {
    if (!bookingId) return

    let ws = null
    let pollTimer = null
    let isMounted = true
    let isFetching = false
    const TERMINAL = new Set(["completed", "closed", "cancelled", "feedback_pending", "feedback_received", "rejected"])

    const tokenQuery = booking?.tracking_token ? `?token=${encodeURIComponent(booking.tracking_token)}` : ""
    const fetchLiveLocation = async () => {
      if (isFetching) return           // skip cycle if previous request still in-flight
      isFetching = true
      try {
        const res = await fetch(`${API_BASE_URL}/booking/${bookingId}/live-location/${tokenQuery}`, {
          credentials: "include"
        })
        if (res.ok) {
          const json = await res.json()
          if (json?.data && isMounted) {
            setLiveData(json.data)
            setLastRefreshed(new Date())
            // Stop polling once booking reaches a terminal state
            if (json.data.status && TERMINAL.has(json.data.status.toLowerCase())) {
              clearInterval(pollTimer)
            }
          }
        }
      } catch (err) {
        console.warn("Live location fetch failed:", err)
      } finally {
        isFetching = false
        if (isMounted) setLoading(false)
      }
    }

    // 1. Immediate fetch
    fetchLiveLocation()

    // 2. Open WebSocket channel
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const host = window.location.hostname === "localhost" ? "localhost:8000" : window.location.host
      const rid = booking?.request_id || bookingId
      const wsUrl = `${protocol}//${host}/ws/live/booking/${encodeURIComponent(rid)}/`

      ws = new WebSocket(wsUrl)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg?.data && isMounted) {
            setLiveData(msg.data)
            setLastRefreshed(new Date())
          }
        } catch (err) {}
      }
    } catch (err) {}

    // 3. Keep 4-second background polling active as reliable backup
    pollTimer = setInterval(fetchLiveLocation, 4000)

    return () => {
      isMounted = false
      if (ws) ws.close()
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [bookingId, booking?.request_id, booking?.tracking_token])


  // Resolve Coordinates strictly from live backend data (No synthetic offsets)
  const destLat = liveData?.destination?.latitude != null ? parseFloat(liveData.destination.latitude) : (booking?.latitude ? parseFloat(booking.latitude) : null)
  const destLng = liveData?.destination?.longitude != null ? parseFloat(liveData.destination.longitude) : (booking?.longitude ? parseFloat(booking.longitude) : null)

  const currentStatus = (liveData?.status || booking?.status || "confirmed").toLowerCase()
  const isArrived = currentStatus === "arrived"
  const isInProgress = currentStatus === "in_progress"
  const isCompleted = currentStatus === "completed" || currentStatus === "closed"
  const isCancelled = currentStatus === "cancelled"

  const empLocation = liveData?.technician_location || liveData?.employee_live_location || liveData?.technician
  const rawTechName = liveData?.technician?.name || liveData?.technician_name || empLocation?.technician_name || empLocation?.name || empLocation?.employee_name || booking?.technician_name || booking?.assigned_employee?.full_name || null
  const rawTechPhone = liveData?.technician?.phone || liveData?.technician_phone || empLocation?.technician_phone || empLocation?.phone || booking?.technician_phone || booking?.assigned_employee?.phone || ""

  // Strict Real Workflow Rule:
  // Employee Accepts/Assigned with actual name -> isAccepted is TRUE
  const isAccepted = Boolean(
    (rawTechName || liveData?.is_accepted) &&
    ["accepted", "on_the_way", "arrived", "in_progress", "completed", "assigned"].includes(currentStatus) &&
    Boolean(rawTechName)
  )

  const isAssignedOnly = (currentStatus === "assigned" || currentStatus === "reviewed") && !isAccepted
  const isOnTheWay = isAccepted && (currentStatus === "on_the_way" || currentStatus === "accepted")

  const rawEmpLat = isAccepted && (
    (empLocation?.latitude != null && !isNaN(parseFloat(empLocation.latitude)))
      ? parseFloat(empLocation.latitude)
      : (liveData?.technician?.latitude != null && !isNaN(parseFloat(liveData.technician.latitude)))
        ? parseFloat(liveData.technician.latitude)
        : (booking?.technician_latitude != null && !isNaN(parseFloat(booking.technician_latitude)))
          ? parseFloat(booking.technician_latitude)
          : null
  )

  const rawEmpLng = isAccepted && (
    (empLocation?.longitude != null && !isNaN(parseFloat(empLocation.longitude)))
      ? parseFloat(empLocation.longitude)
      : (liveData?.technician?.longitude != null && !isNaN(parseFloat(liveData.technician.longitude)))
        ? parseFloat(liveData.technician.longitude)
        : (booking?.technician_longitude != null && !isNaN(parseFloat(booking.technician_longitude)))
          ? parseFloat(booking.technician_longitude)
          : null
  )

  const hasValidTechnicianGPS = Boolean(
    rawEmpLat != null && !isNaN(rawEmpLat) &&
    rawEmpLng != null && !isNaN(rawEmpLng)
  )

  const empLat = hasValidTechnicianGPS ? rawEmpLat : null
  const empLng = hasValidTechnicianGPS ? rawEmpLng : null

  const hasCustomerCoords = destLat != null && !isNaN(destLat) && destLng != null && !isNaN(destLng)
  const hasEmpCoords = isAccepted && hasValidTechnicianGPS && !isCompleted
  const waitingForGps = isAccepted && !hasValidTechnicianGPS && !isArrived && !isInProgress && !isCompleted

  const techName = isAccepted ? rawTechName : null
  const techPhone = isAccepted ? rawTechPhone : ""
  const techPhoto = isAccepted ? (liveData?.technician?.photo || liveData?.technician_photo || booking?.technician_photo || empLocation?.technician_photo || null) : null
  const techRating = isAccepted ? (liveData?.technician?.rating || liveData?.technician_rating || booking?.technician_rating || empLocation?.technician_rating || null) : null
  const techJobs = isAccepted ? (empLocation?.jobs_completed || liveData?.technician?.jobs_completed || null) : null
  const startOtp = isAccepted ? (liveData?.start_otp || booking?.start_otp || booking?.otp || "") : ""

  // Fetch real road navigation geometry via resilient multi-endpoint routing engine
  useEffect(() => {
    if (!hasCustomerCoords || !hasEmpCoords) return

    let cancelled = false
    const fetchRoadGeometry = async () => {
      try {
        const res = await fetchRoadRoute(empLng, empLat, destLng, destLat)
        if (cancelled) return
        if (res?.coordinates && res.coordinates.length > 0) {
          setRoadRoute(res.coordinates)
          setRoadDistanceKm(res.distanceKm)
          setRoadEtaMins(res.etaMinutes)
          return
        }
      } catch (e) {
        console.warn("Road routing fallback:", e)
      }
      if (!cancelled) {
        setRoadRoute([[empLat, empLng], [destLat, destLng]])
      }
    }

    fetchRoadGeometry()
    return () => { cancelled = true }
  }, [empLat, empLng, destLat, destLng, hasCustomerCoords, hasEmpCoords])

  const finalDistance = roadDistanceKm || liveData?.distance_km || null
  const finalEta = roadEtaMins || liveData?.eta_minutes || null

  const mapCenter = hasEmpCoords && hasCustomerCoords
    ? [(destLat + empLat) / 2, (destLng + empLng) / 2]
    : hasCustomerCoords
    ? [destLat, destLng]
    : hasEmpCoords
    ? [empLat, empLng]
    : [12.7409, 77.8253]

  const points = roadRoute.length > 0
    ? roadRoute
    : [
        hasCustomerCoords ? [destLat, destLng] : null,
        hasEmpCoords ? [empLat, empLng] : null,
      ].filter(Boolean)

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(startOtp)
    setCopiedOtp(true)
    setTimeout(() => setCopiedOtp(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, y: 25 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 25 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        style={{
          background: "#ffffff",
          borderRadius: 24,
          width: "100%",
          maxWidth: 1080,
          height: "90vh",
          maxHeight: 760,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 30px 80px -15px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          fontFamily: "inherit",
          position: "relative",
        }}
      >
        <style>{`
          @keyframes swiggyPulse {
            0% { transform: scale(0.95); opacity: 0.85; }
            50% { transform: scale(1.4); opacity: 0.2; }
            100% { transform: scale(1.65); opacity: 0; }
          }
          @keyframes pulseBadge {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
          .custom-swiggy-scroll::-webkit-scrollbar {
            width: 5px;
          }
          .custom-swiggy-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 99px;
          }
        `}</style>

        {/* Top Header Bar */}
        <div style={{
          padding: "1rem 1.6rem",
          background: "linear-gradient(135deg, #111827, #1e293b)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, #FC8019, #FF5200)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(252, 128, 25, 0.45)",
            }}>
              <Bike size={24} color="white" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
                  Live Professional Tracking
                </h3>
                <span style={{
                  fontSize: "0.72rem",
                  fontWeight: 900,
                  fontFamily: "monospace",
                  background: "rgba(255,255,255,0.16)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  color: "#fdba74",
                  border: "1px solid rgba(253, 186, 116, 0.3)",
                }}>
                  {booking?.request_id || (booking?.id ? `SR-${booking.id}` : "SR-JOB")}
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#9ca3af", display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 8px #10b981", animation: "pulseBadge 2s infinite" }} />
                <span style={{ fontWeight: 700, color: "#e5e7eb" }}>Live GPS Turn-by-Turn Feed</span>
                <span>•</span>
                <span>Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => {
                fetchLiveLocation()
                setRecenterTrigger(prev => prev + 1)
              }}
              title="Refresh GPS Route"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: 10,
                padding: "9px 14px",
                color: "#e5e7eb",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                fontWeight: 700,
                transition: "all 0.2s",
              }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: 10,
                padding: "9px",
                color: "#e5e7eb",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.4)"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Workspace: Split Screen Layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          flex: 1,
          height: "calc(100% - 74px)",
          overflow: "hidden",
        }}>
          {/* Left Column: Interactive Swiggy Turn-by-Turn Road Map */}
          <div style={{ position: "relative", width: "100%", height: "100%", background: "#f1f5f9" }}>
            <MapContainer
              center={mapCenter}
              zoom={15}
              style={{ width: "100%", height: "100%", zIndex: 1 }}
              zoomControl={false}
            >
              {tileLayerType === "osm" ? (
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  subdomains={["a", "b", "c"]}
                  maxZoom={19}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
              ) : (
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  subdomains={["a", "b", "c", "d"]}
                  maxZoom={19}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
              )}

              <MapBoundsController points={points} trigger={recenterTrigger} />

              {/* Road Routing Outer Glow (Swiggy Orange Shadow) */}
              {roadRoute.length > 0 && (
                <Polyline
                  positions={roadRoute}
                  color="#FC8019"
                  weight={10}
                  opacity={0.35}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              {/* Road Routing Solid Inner Line (Turn-by-turn navigation line) */}
              {roadRoute.length > 0 && (
                <Polyline
                  positions={roadRoute}
                  color="#E23744"
                  weight={5}
                  opacity={0.95}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              {/* Customer Home Destination Pin */}
              {hasCustomerCoords && (
                <Marker position={[destLat, destLng]} icon={createCustomerHomeIcon()}>
                  <Popup>
                    <div style={{ padding: "4px 8px", fontSize: "0.85rem", maxWidth: 220 }}>
                      <strong style={{ color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                        🏠 Your Home Location
                      </strong>
                      <div style={{ color: "#475569", fontSize: "0.78rem", marginTop: 4, lineHeight: 1.4 }}>
                        {liveData?.destination?.address || booking?.address || "Service Location Address"}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Technician Delivery Bike Pin */}
              {hasEmpCoords && (
                <Marker position={[empLat, empLng]} icon={createTechnicianBikeIcon(techName)}>
                  <Popup>
                    <div style={{ padding: "4px 8px", fontSize: "0.85rem", maxWidth: 220 }}>
                      <strong style={{ color: "#FC8019", display: "flex", alignItems: "center", gap: 4 }}>
                        🛵 {techName} (On The Way)
                      </strong>
                      <div style={{ color: "#334155", fontSize: "0.8rem", fontWeight: 700, marginTop: 4 }}>
                        ETA: ~{finalEta} mins ({finalDistance} km road distance)
                      </div>
                      <div style={{ color: "#64748b", fontSize: "0.72rem", marginTop: 2 }}>
                        Verified Sevo Professional
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Top-Left Floating ETA & Arrival Banner */}
            <div style={{
              position: "absolute",
              top: 18,
              left: 18,
              zIndex: 1000,
              background: isArrived || isCompleted
                ? "rgba(236, 253, 245, 0.98)"
                : isInProgress
                ? "rgba(239, 246, 255, 0.98)"
                : waitingForGps
                ? "rgba(245, 243, 255, 0.98)"
                : "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(14px)",
              padding: "12px 18px",
              borderRadius: 18,
              boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
              border: isArrived || isCompleted
                ? "1px solid rgba(16, 185, 129, 0.4)"
                : isInProgress
                ? "1px solid rgba(59, 130, 246, 0.4)"
                : waitingForGps
                ? "1px solid rgba(124, 58, 237, 0.3)"
                : "1px solid rgba(226, 232, 240, 0.95)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <div style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: isArrived || isCompleted
                  ? "linear-gradient(135deg, #10B981, #059669)"
                  : isInProgress
                  ? "linear-gradient(135deg, #3B82F6, #1D4ED8)"
                  : waitingForGps
                  ? "linear-gradient(135deg, #7C3AED, #6D28D9)"
                  : "linear-gradient(135deg, #FC8019, #EA580C)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: isArrived || isCompleted
                  ? "0 4px 14px rgba(16,185,129,0.4)"
                  : isInProgress
                  ? "0 4px 14px rgba(59,130,246,0.4)"
                  : waitingForGps
                  ? "0 4px 14px rgba(124,58,237,0.4)"
                  : "0 4px 14px rgba(252,128,25,0.4)",
              }}>
                {isArrived || isCompleted ? (
                  <CheckCircle2 size={24} />
                ) : isInProgress ? (
                  <Wrench size={22} className="animate-spin" />
                ) : (
                  <Clock size={24} />
                )}
              </div>
              <div>
                {isArrived ? (
                  <>
                    <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#047857", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} className="animate-ping" />
                      Partner At Site
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0f172a" }}>
                      Partner Arrived at Location
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#059669", fontWeight: 700, marginTop: 2 }}>
                      Share Service Start OTP <span style={{ fontFamily: "monospace", letterSpacing: 1, background: "#ecfdf5", padding: "1px 6px", borderRadius: 4, border: "1px solid #a7f3d0" }}>{startOtp}</span> with partner
                    </div>
                  </>
                ) : isInProgress ? (
                  <>
                    <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Service In Progress
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0f172a" }}>
                      Work is underway
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#2563eb", fontWeight: 600, marginTop: 2 }}>
                      Partner {techName} is servicing your request
                    </div>
                  </>
                ) : isCompleted ? (
                  <>
                    <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#047857", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Service Completed
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0f172a" }}>
                      Work Finished Successfully
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#059669", fontWeight: 600, marginTop: 2 }}>
                      Thank you for choosing Sevo!
                    </div>
                  </>
                ) : waitingForGps ? (
                  <>
                    <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED", display: "inline-block" }} className="animate-ping" />
                      {currentStatus === "on_the_way" ? "Partner On The Way" : "Partner Accepted"}
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a" }}>
                      {currentStatus === "on_the_way" ? "Technician is on the way" : "Technician Accepted"}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#6D28D9", fontWeight: 600, marginTop: 2 }}>
                      Waiting for live location...
                    </div>
                  </>
                ) : isAssignedOnly ? (
                  <>
                    <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                      Employee Assigned
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a" }}>
                      Partner Assigned (Pending Acceptance)
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#d97706", fontWeight: 600, marginTop: 2 }}>
                      Waiting for partner to accept job & start travel
                    </div>
                  </>
                ) : isAccepted ? (
                  <>
                    <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Estimated Arrival Time
                    </div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span>{finalEta ? `${finalEta} mins` : 'Live Tracking'}</span>
                      {finalDistance && <span style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 700 }}>({finalDistance} km away)</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED", display: "inline-block" }} className="animate-ping" />
                      Broadcast Active • {liveData?.destination?.city || booking?.city || 'Local'}
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a" }}>
                      Finding Service Professional...
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 600, marginTop: 2 }}>
                      Broadcasting request to nearby verified experts
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Floating Map Controls at Bottom */}
            <div style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              zIndex: 1000,
              display: "flex",
              gap: 8,
            }}>
              <button
                onClick={() => setTileLayerType(t => t === "streets" ? "osm" : "streets")}
                title="Toggle Map Style"
                style={{
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  padding: "10px 14px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                <Layers size={15} color="#64748b" /> {tileLayerType === "osm" ? "Dark Map" : "Street Map"}
              </button>

              <button
                onClick={() => setRecenterTrigger(prev => prev + 1)}
                style={{
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  padding: "10px 16px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  color: "#FC8019",
                }}
              >
                <Navigation size={16} color="#FC8019" /> Recenter Route
              </button>
            </div>
          </div>

          {/* Right Column: Clean, Simple & User-Friendly Details Drawer */}
          <div className="custom-swiggy-scroll" style={{
            background: "#f8fafc",
            borderLeft: "1px solid #e2e8f0",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflowY: "auto",
          }}>
            {/* 1. Partner Profile Card */}
            {isAccepted && techName ? (
              <div style={{
                background: "white",
                borderRadius: 18,
                padding: "1.1rem",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ position: "relative" }}>
                    {techPhoto ? (
                      <img
                        src={techPhoto}
                        alt={techName}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid #FC8019",
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.25rem",
                        fontWeight: 900,
                        color: "#b45309",
                        border: "2px solid #FC8019",
                      }}>
                        {techName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#10b981",
                      border: "2px solid white",
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 900, color: "#0f172a", fontSize: "1.05rem" }}>
                        {techName}
                      </span>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, background: "#ecfdf5", color: "#059669", padding: "1px 6px", borderRadius: 6, border: "1px solid #a7f3d0" }}>
                        ✓ Verified
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      {techRating != null && (
                        <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "0.78rem", fontWeight: 800, color: "#d97706" }}>
                          <Star size={13} fill="#d97706" /> {Number(techRating).toFixed(1)}
                        </span>
                      )}
                      <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                        {techRating != null ? "• " : ""}{techJobs ? `${techJobs}+ jobs completed` : "Assigned Service Professional"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Call & WhatsApp Action Buttons */}
                {techPhone && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <a
                      href={`tel:${techPhone}`}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        background: "#10B981",
                        color: "white",
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                      }}
                    >
                      <Phone size={15} /> Call Partner
                    </a>

                    <button
                      onClick={() => {
                        const message = encodeURIComponent(`Hi ${techName}, I am following up on my Sevo booking #${booking?.request_id}.`)
                        window.open(`https://wa.me/91${techPhone.replace(/\D/g, "")}?text=${message}`, "_blank")
                      }}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        background: "white",
                        border: "1px solid #cbd5e1",
                        color: "#1e293b",
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <MessageSquare size={15} color="#25D366" /> WhatsApp
                    </button>
                  </div>
                )}
              </div>
            ) : isAssignedOnly ? (
              <div style={{
                background: "white",
                borderRadius: 18,
                padding: "1.25rem",
                border: "1px solid #fed7aa",
                textAlign: "center",
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#fff7ed",
                  color: "#ea580c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  border: "1.5px solid #fdba74",
                }}>
                  <User size={28} />
                </div>
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", marginBottom: 4 }}>
                  Employee Assigned
                </div>
                <div style={{ fontSize: "0.8rem", color: "#c2410c", fontWeight: 700, marginBottom: 4 }}>
                  Awaiting Acceptance
                </div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.4 }}>
                  Partner has been assigned to your booking. Live tracking, contact details & OTP will unlock as soon as the partner accepts the request.
                </div>
              </div>
            ) : (
              <div style={{
                background: "white",
                borderRadius: 18,
                padding: "1.25rem",
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#f5f3ff",
                  color: "#7C3AED",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  border: "1.5px solid rgba(124, 58, 237, 0.25)",
                }}>
                  <Radio size={28} className="animate-pulse" />
                </div>
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", marginBottom: 4 }}>
                  Finding Service Partner
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>
                  Broadcasting your request to verified experts in {liveData?.destination?.city || booking?.city || 'your service area'}. Partner details will appear here as soon as an expert accepts.
                </div>
              </div>
            )}

            {/* 2. Service Start OTP Strip with Copy button */}
            {isAccepted && Boolean(startOtp) && (
              <div style={{
                background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
                borderRadius: 18,
                padding: "1rem 1.25rem",
                border: "1px solid #fed7aa",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                boxShadow: "0 2px 8px rgba(249, 115, 22, 0.08)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ea580c",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  }}>
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Service Start OTP
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#9a3412", marginTop: 1 }}>
                      Share when partner arrives
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCopyOtp}
                  style={{
                    background: "white",
                    border: "1px solid #fed7aa",
                    borderRadius: 12,
                    padding: "6px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <span style={{
                    fontFamily: "monospace",
                    fontSize: "1.2rem",
                    fontWeight: 900,
                    color: "#c2410c",
                    letterSpacing: 2,
                  }}>
                    {startOtp}
                  </span>
                  {copiedOtp ? (
                    <Check size={16} color="#10b981" />
                  ) : (
                    <Copy size={15} color="#ea580c" />
                  )}
                </button>
              </div>
            )}

            {/* 3. Simple Clean 3-Stage Progress Timeline */}
            <div style={{
              background: "white",
              borderRadius: 16,
              padding: "1.1rem",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Live Service Status
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Step 1: Confirmed */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: "#10B981", color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <CheckCircle2 size={16} />
                    </div>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0f172a" }}>
                      Booking Confirmed
                    </div>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 700, background: "#ecfdf5", padding: "2px 8px", borderRadius: 6 }}>
                    Done
                  </span>
                </div>

                {/* Step 2: Partner Acceptance / Travel / Arrival */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isArrived ? (
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "#10B981", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.2)"
                      }}>
                        <CheckCircle2 size={16} />
                      </div>
                    ) : (isInProgress || isCompleted) ? (
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "#10B981", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                      }}>
                        <CheckCircle2 size={16} />
                      </div>
                    ) : isAccepted ? (
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "#FC8019", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        boxShadow: "0 0 0 4px rgba(252, 128, 25, 0.2)"
                      }}>
                        <Bike size={15} />
                      </div>
                    ) : isAssignedOnly ? (
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "#f59e0b", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        boxShadow: "0 0 0 4px rgba(245, 158, 11, 0.2)"
                      }}>
                        <Clock size={15} />
                      </div>
                    ) : (
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "#7C3AED", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        boxShadow: "0 0 0 4px rgba(124, 58, 237, 0.2)"
                      }}>
                        <Radio size={15} className="animate-pulse" />
                      </div>
                    )}
                    <div style={{
                      fontSize: "0.84rem",
                      fontWeight: isArrived || isAccepted ? 800 : 600,
                      color: isArrived ? "#047857" : isAccepted ? "#ea580c" : isAssignedOnly ? "#d97706" : "#7C3AED"
                    }}>
                      {isArrived
                        ? "Partner Arrived at Location"
                        : (isInProgress || isCompleted)
                        ? "Partner Arrived"
                        : isAccepted
                        ? "Partner On The Way"
                        : isAssignedOnly
                        ? "Partner Assigned (Pending Acceptance)"
                        : "Finding Service Partner"}
                    </div>
                  </div>

                  <span style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: isArrived
                      ? "#ecfdf5"
                      : (isInProgress || isCompleted)
                      ? "#ecfdf5"
                      : isAccepted
                      ? "#fff7ed"
                      : isAssignedOnly
                      ? "#fffbeb"
                      : "#f5f3ff",
                    color: isArrived
                      ? "#047857"
                      : (isInProgress || isCompleted)
                      ? "#059669"
                      : isAccepted
                      ? "#ea580c"
                      : isAssignedOnly
                      ? "#d97706"
                      : "#7C3AED",
                    border: isArrived ? "1px solid #a7f3d0" : "none"
                  }}>
                    {isArrived
                      ? "At Site"
                      : (isInProgress || isCompleted)
                      ? "Done"
                      : isAccepted
                      ? (finalEta ? `~${finalEta} mins` : "En Route")
                      : isAssignedOnly
                      ? "Assigned"
                      : "Searching"}
                  </span>
                </div>

                {/* Step 3: Service Execution & Completion */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isCompleted ? (
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "#10B981", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                      }}>
                        <CheckCircle2 size={16} />
                      </div>
                    ) : isInProgress ? (
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "#3B82F6", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.2)"
                      }}>
                        <Wrench size={14} className="animate-spin" />
                      </div>
                    ) : (
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "#f1f5f9", color: "#94a3b8",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                      }}>
                        <ShieldCheck size={16} />
                      </div>
                    )}
                    <div style={{
                      fontSize: "0.84rem",
                      fontWeight: isInProgress ? 800 : isCompleted ? 700 : 600,
                      color: isInProgress ? "#1e40af" : isCompleted ? "#0f172a" : "#94a3b8"
                    }}>
                      {isInProgress
                        ? "Service In Progress"
                        : isCompleted
                        ? "Service Completed"
                        : "Service Execution & Completion"}
                    </div>
                  </div>

                  <span style={{
                    fontSize: "0.72rem",
                    fontWeight: isInProgress || isCompleted ? 800 : 600,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: isCompleted
                      ? "#ecfdf5"
                      : isInProgress
                      ? "#eff6ff"
                      : "#f8fafc",
                    color: isCompleted
                      ? "#059669"
                      : isInProgress
                      ? "#1d4ed8"
                      : "#94a3b8",
                    border: isInProgress ? "1px solid #bfdbfe" : "none"
                  }}>
                    {isCompleted
                      ? "Done"
                      : isInProgress
                      ? "In Progress"
                      : "Next"}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Delivery Address Card */}
            <div style={{
              background: "white",
              borderRadius: 14,
              padding: "10px 12px",
              border: "1px solid #e2e8f0",
              fontSize: "0.78rem",
            }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={13} color="#10B981" /> Delivery Location
              </div>
              <div style={{ color: "#334155", fontWeight: 600, lineHeight: 1.4 }}>
                {liveData?.destination?.address || booking?.address || "Customer Service Address"}
              </div>
            </div>

            {/* 5. Cancel Booking Action */}
            <div style={{ marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                style={{
                  width: "100%",
                  padding: "0.65rem",
                  background: "#fff1f2",
                  color: "#e11d48",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  border: "1px solid #ffe4e6",
                  borderRadius: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ban size={14} /> Cancel Booking
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cancellation Modal (Mandatory Reason + 5-Min Grace Period) */}
      <AnimatePresence>
        {showCancelModal && (
          <BookingCancellationModal
            bookingId={bookingId}
            requestId={booking?.request_id || bookingId}
            isAccepted={Boolean(liveData?.is_accepted || empLocation)}
            graceSecondsRemaining={liveData?.cancellation_grace_remaining_seconds ?? 300}
            onClose={() => setShowCancelModal(false)}
            onCancelled={() => {
              if (onClose) onClose()
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
