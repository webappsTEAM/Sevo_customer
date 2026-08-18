import React, { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
  Phone, MessageSquare, Navigation, CheckCircle2, Clock, MapPin,
  Star, RefreshCw, KeyRound, Bike, Layers, Copy, Check,
  Wrench, WifiOff, Shield
} from "lucide-react"
import { fetchRoadRoute } from "../../api/routing.js"
import { createTrackingWebSocket } from "../../api/websocketService.js"
import "./LiveTrackingPage.css"

/* ─────────────────────────────────────────────────────────────────────────────
   API base
───────────────────────────────────────────────────────────────────────────── */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? `${window.location.origin}/Caltrack/api` : `/api`)

/* ─────────────────────────────────────────────────────────────────────────────
   Status helpers — single normalisation point
───────────────────────────────────────────────────────────────────────────── */
const TERMINAL_STATUSES = new Set([
  "completed", "closed", "feedback_pending", "feedback_received", "cancelled", "rejected"
])

const STATUS_LABEL_MAP = {
  new_request: "Booking Received",
  confirmed: "Booking Confirmed",
  reviewed: "Booking Reviewed",
  assigned: "Technician Assigned",
  accepted: "Technician Assigned",
  on_the_way: "On The Way",
  arrived: "Technician Arrived",
  in_progress: "Service In Progress",
  completed: "Service Completed",
  closed: "Service Completed",
  feedback_pending: "Service Completed",
  feedback_received: "Feedback Received",
  cancelled: "Booking Cancelled",
  rejected: "Booking Declined",
}

function statusLabel(s) {
  if (!s) return "Confirmed"
  return STATUS_LABEL_MAP[s.toLowerCase()] ?? s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

const TIMELINE_STEPS = [
  { label: "Booking Confirmed", emoji: "📋" },
  { label: "Technician Assigned", emoji: "👤" },
  { label: "On The Way", emoji: "🛵" },
  { label: "Technician Arrived", emoji: "📍" },
  { label: "Service In Progress", emoji: "🔧" },
  { label: "Service Completed", emoji: "🎉" },
]

function getTimelineIdx(s) {
  s = (s || "").toLowerCase()
  if (["assigned", "accepted"].includes(s)) return 1
  if (s === "on_the_way") return 2
  if (s === "arrived") return 3
  if (s === "in_progress") return 4
  if (["completed", "closed", "feedback_pending", "feedback_received"].includes(s)) return 5
  return 0
}

/* ─────────────────────────────────────────────────────────────────────────────
   Clean, Minimal Leaflet Icons (Swiggy / Google Maps Style)
───────────────────────────────────────────────────────────────────────────── */
const destinationIcon = L.divIcon({
  className: "ltp-clean-icon",
  html: `<div class="ltp-pin-dest">
    <div class="ltp-pin-dest-inner">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    </div>
    <div class="ltp-pin-dest-tail"></div>
  </div>`,
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -44],
})

function makeTechIcon() {
  return L.divIcon({
    className: "ltp-clean-icon",
    html: `<div class="ltp-pin-tech">
      <div class="ltp-pin-tech-pulse"></div>
      <div class="ltp-pin-tech-inner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>
      </div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -26],
  })
}

/* ─────────────────────────────────────────────────────────────────────────────
   Map bounds & camera controller with multi-mode focusing
───────────────────────────────────────────────────────────────────────────── */
function MapFitter({ points, trigger, viewMode, tLat, tLng, dLat, dLng }) {
  const map = useMap()
  useEffect(() => {
    if (viewMode === "partner" && tLat != null && tLng != null) {
      map.flyTo([tLat, tLng], 18, { duration: 0.9 })
      return
    }
    if (viewMode === "destination" && dLat != null && dLng != null) {
      map.flyTo([dLat, dLng], 18, { duration: 0.9 })
      return
    }

    const valid = (points || []).filter(
      p => p && p[0] != null && p[1] != null && !isNaN(p[0]) && !isNaN(p[1])
    )
    if (!valid.length) return
    if (valid.length === 1) {
      map.flyTo(valid[0], 17, { duration: 1.0 })
    } else {
      const bounds = L.latLngBounds(valid)
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 18, duration: 1.0 })
    }
  }, [points, trigger, viewMode, tLat, tLng, dLat, dLng])
  return null
}

/* ─────────────────────────────────────────────────────────────────────────────
   Staleness helper
───────────────────────────────────────────────────────────────────────────── */
function useStaleness(ts) {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (!ts) return
    const upd = () => setSec(Math.floor((Date.now() - new Date(ts)) / 1000))
    upd()
    const id = setInterval(upd, 1000)
    return () => clearInterval(id)
  }, [ts])
  if (!ts) return { text: "", live: false }
  if (sec < 15) return { text: "LIVE GPS FEED", live: true }
  if (sec < 60) return { text: `Updated ${sec}s ago`, live: false }
  if (sec < 300) return { text: `Updated ${Math.floor(sec / 60)}m ago`, live: false }
  return { text: "GPS update delayed", live: false, stale: true }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main LiveTrackingPage
───────────────────────────────────────────────────────────────────────────── */
export function LiveTrackingPage() {
  const { bookingId } = useParams()
  const [searchParams] = useSearchParams()
  const trackingToken = searchParams.get("token") || null

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorKind, setErrorKind] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [recenterTrig, setRecenterTrig] = useState(0)
  const [viewMode, setViewMode] = useState("route") // 'route' | 'partner' | 'destination'
  const [tileType, setTileType] = useState("streets")
  const [roadRoute, setRoadRoute] = useState([])
  const [hasRoadGeometry, setHasRoadGeometry] = useState(false)
  const [roadEta, setRoadEta] = useState(null)
  const [roadDist, setRoadDist] = useState(null)
  const [copiedOtp, setCopiedOtp] = useState(false)
  const [online, setOnline] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)

  const mountedRef = useRef(true)
  const pollRef = useRef(null)
  const techRef = useRef(null)
  const wsRef = useRef(null)

  /* ── Secure API Fetch & Polling Fallback ── */
  const fetchLive = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      let url
      if (trackingToken) {
        url = `${API_BASE_URL}/tracking/${encodeURIComponent(trackingToken)}/`
      } else if (bookingId) {
        url = `${API_BASE_URL}/booking/${encodeURIComponent(bookingId)}/live-location/`
      } else {
        setErrorKind("no_id")
        setLoading(false)
        return
      }

      const res = await fetch(url, { credentials: "include" })
      if (!mountedRef.current) return

      if (res.status === 404) {
        setErrorKind("not_found")
        setLoading(false)
        return
      }
      if (res.status === 401 || res.status === 403) {
        setErrorKind("unauthorized")
        setLoading(false)
        return
      }
      if (!res.ok) {
        setErrorKind("fetch_failed")
        setLoading(false)
        return
      }

      const json = await res.json()
      if (json?.data && mountedRef.current) {
        setData(json.data)
        setLastUpdated(new Date().toISOString())
        setOnline(true)
        setErrorKind(null)
      }
    } catch {
      if (mountedRef.current) setOnline(false)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [bookingId, trackingToken])

  /* ── Real-Time WebSocket Channel Stream ── */
  useEffect(() => {
    mountedRef.current = true
    const identifier = trackingToken || bookingId
    if (!identifier) {
      setErrorKind("no_id")
      setLoading(false)
      return
    }

    // Initial fetch to load base payload
    fetchLive()

    // Establish persistent WebSocket channel subscription
    wsRef.current = createTrackingWebSocket(
      identifier,
      trackingToken,
      (eventType, eventData) => {
        if (!mountedRef.current) return
        setOnline(true)
        setLastUpdated(new Date().toISOString())

        if (eventType === "initial_state" && eventData) {
          setData(eventData)
          setLoading(false)
          setErrorKind(null)
        } else if (eventType === "technician_assigned" && eventData) {
          setData(prev => ({
            ...prev,
            is_accepted: true,
            status: eventData.status || prev?.status || "assigned",
            technician: {
              ...prev?.technician,
              ...eventData.technician,
              ...eventData,
            }
          }))
        } else if (eventType === "technician_status_updated" && eventData) {
          setData(prev => ({
            ...prev,
            status: eventData.status || eventData.technician?.status || prev?.status,
            technician: {
              ...prev?.technician,
              ...eventData.technician,
            }
          }))
        } else if (eventType === "technician_location_updated" && eventData) {
          const tech = eventData.technician || eventData
          setData(prev => ({
            ...prev,
            technician: {
              ...prev?.technician,
              latitude: tech.latitude,
              longitude: tech.longitude,
              eta_minutes: tech.eta_minutes ?? prev?.technician?.eta_minutes,
              distance_km: tech.distance_km ?? prev?.technician?.distance_km,
              current_location_name: tech.current_location_name || prev?.technician?.current_location_name,
              updated_at: tech.updated_at || new Date().toISOString()
            }
          }))
        } else if (eventType === "job_updated" && eventData) {
          setData(prev => ({ ...prev, ...eventData }))
        } else if (eventType === "otp_verification_success") {
          setData(prev => ({ ...prev, status: "in_progress" }))
        }
      },
      (isConnected) => {
        if (!mountedRef.current) return
        setWsConnected(isConnected)
        setOnline(isConnected)
      }
    )

    // Keep lightweight polling heartbeat (every 10s) as resilient failover
    pollRef.current = setInterval(fetchLive, 10000)

    return () => {
      mountedRef.current = false
      if (wsRef.current) wsRef.current.close()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchLive, bookingId, trackingToken])

  /* ── Stop polling on terminal status ── */
  useEffect(() => {
    if (data?.status && TERMINAL_STATUSES.has(data.status.toLowerCase())) {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [data?.status])

  /* ── Abstracted Road Routing ── */
  const tLat = data?.technician?.latitude ? parseFloat(data.technician.latitude) : null
  const tLng = data?.technician?.longitude ? parseFloat(data.technician.longitude) : null
  const dLat = data?.destination?.latitude ? parseFloat(data.destination.latitude) : null
  const dLng = data?.destination?.longitude ? parseFloat(data.destination.longitude) : null

  useEffect(() => {
    if (!tLat || !tLng || !dLat || !dLng) {
      setRoadRoute([])
      setHasRoadGeometry(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const res = await fetchRoadRoute(tLng, tLat, dLng, dLat)
      if (cancelled) return
      if (res?.coordinates) {
        setRoadRoute(res.coordinates)
        setHasRoadGeometry(true)
        setRoadDist(res.distanceKm)
        setRoadEta(res.etaMinutes)
      } else {
        setRoadRoute([[tLat, tLng], [dLat, dLng]])
        setHasRoadGeometry(false)
      }
    })()
    return () => { cancelled = true }
  }, [tLat, tLng, dLat, dLng])

  /* ── Smooth marker update ── */
  useEffect(() => {
    if (techRef.current && tLat != null && tLng != null) {
      techRef.current.setLatLng([tLat, tLng])
    }
  }, [tLat, tLng])

  /* ── Derived state ── */
  const status = (data?.status || "").toLowerCase()
  const isAccepted = Boolean(data?.is_accepted)
  const isCancelled = status === "cancelled" || status === "rejected"
  const tlIdx = getTimelineIdx(status)
  const isArrived = status === "arrived"
  const isInProgress = status === "in_progress"
  const isCompleted = ["completed", "closed", "feedback_pending", "feedback_received"].includes(status)
  const waitingGps = isAccepted && !tLat && !["arrived", "in_progress", "completed", "closed"].includes(status)

  const techName = data?.technician?.name || (isAccepted ? "Assigned Partner" : "")
  const techPhone = data?.technician?.phone || ""
  const techPhoto = data?.technician?.photo || null
  const techRating = data?.technician?.rating || null
  const startOtp = data?.start_otp || null
  const hasD = dLat != null && dLng != null
  const hasT = tLat != null && tLng != null

  const finalEta = roadEta || data?.technician?.eta_minutes || null
  const finalDist = roadDist || data?.technician?.distance_km || null

  const mapCenter = hasT && hasD ? [(dLat + tLat) / 2, (dLng + tLng) / 2]
    : hasD ? [dLat, dLng] : hasT ? [tLat, tLng] : [12.7409, 77.8253]
  const routePts = roadRoute.length > 0 ? roadRoute :
    [hasD ? [dLat, dLng] : null, hasT ? [tLat, tLng] : null].filter(Boolean)
  const fresh = useStaleness(lastUpdated)

  const copyOtp = () => {
    if (!startOtp || !navigator.clipboard) return
    navigator.clipboard.writeText(startOtp)
    setCopiedOtp(true)
    setTimeout(() => setCopiedOtp(false), 2000)
  }

  const openWA = () => {
    if (!techPhone) return
    const msg = encodeURIComponent(`Hi ${techName}, following up on CalServices booking #${data?.request_id || bookingId}.`)
    window.open(`https://wa.me/91${techPhone.replace(/\D/g, "")}?text=${msg}`, "_blank")
  }

  if (loading) {
    return (
      <div className="ltp-fullscreen ltp-center">
        <div className="ltp-spinner" />
        <p className="ltp-loading-text">Loading live tracking…</p>
      </div>
    )
  }

  if (errorKind && !data) {
    const msgs = {
      not_found: { icon: "🔗", title: "Tracking Link Not Found", body: "This link is invalid or expired. Please check the link sent via SMS or WhatsApp." },
      unauthorized: { icon: "🔒", title: "Tracking Unauthorized", body: "A valid tracking token or login is required to access live tracking." },
      no_id: { icon: "📋", title: "No Booking Found", body: "No booking ID was provided. Please use the tracking link sent to you." },
      fetch_failed: { icon: "⚠️", title: "Tracking Unavailable", body: "We're having trouble loading live tracking right now. Please try refreshing." },
    }
    const m = msgs[errorKind] || { icon: "⚠️", title: "Error", body: "Something went wrong." }
    return (
      <div className="ltp-fullscreen ltp-center">
        <motion.div className="ltp-error-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="ltp-error-emoji">{m.icon}</div>
          <h2 className="ltp-error-title">{m.title}</h2>
          <p className="ltp-error-body">{m.body}</p>
          {!trackingToken && (
            <p className="ltp-error-hint"><Shield size={13} /> A secure tracking link is required to view live technician details.</p>
          )}
          <button className="ltp-retry-btn" onClick={fetchLive}><RefreshCw size={14} /> Try Again</button>
        </motion.div>
      </div>
    )
  }

  if (isCancelled && data) {
    return (
      <div className="ltp-fullscreen ltp-center">
        <motion.div className="ltp-error-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="ltp-error-emoji">❌</div>
          <h2 className="ltp-error-title">Booking Cancelled</h2>
          <p className="ltp-error-body">Your booking <strong>#{data.request_id || bookingId}</strong> has been cancelled.</p>
          {data.issue_title && <p className="ltp-error-body" style={{ color: "#64748b", fontSize: "0.85rem" }}>{data.issue_title}</p>}
          <p className="ltp-error-hint" style={{ color: "#64748b" }}>If any advance payment was made, a full refund will be processed within 2–4 business days.</p>
        </motion.div>
      </div>
    )
  }

  const etaBannerClass = isArrived || isCompleted ? "green" : isInProgress ? "blue" : waitingGps ? "purple" : "orange"

  return (
    <div className="ltp-root">
      <header className="ltp-header">
        <div className="ltp-hdr-left">
          <div className="ltp-hdr-icon"><Bike size={22} color="white" /></div>
          <div>
            <div className="ltp-hdr-title-row">
              <h1 className="ltp-hdr-title">Live Technician Tracking</h1>
              {data?.request_id && <span className="ltp-hdr-badge">{data.request_id}</span>}
            </div>
            <div className="ltp-hdr-sub">
              <span className={`ltp-live-dot${fresh.stale ? " stale" : ""}`} />
              <span>{fresh.live ? (hasRoadGeometry ? "Live Road GPS Feed" : "Live GPS Feed") : fresh.text}</span>
              {lastUpdated && (
                <>
                  <span className="ltp-sep">•</span>
                  <span>Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="ltp-hdr-right">
          {!online && <span className="ltp-offline-badge"><WifiOff size={12} /> Offline</span>}
          <button className="ltp-hdr-btn" onClick={() => { fetchLive(); setRecenterTrig(n => n + 1) }} aria-label="Refresh tracking">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </header>

      <main className="ltp-body">
        <section className="ltp-map-section" aria-label="Live technician tracking map">
          <MapContainer center={mapCenter} zoom={14} style={{ width: "100%", height: "100%" }} zoomControl={false}>
            <MapFitter
              points={routePts}
              trigger={recenterTrig}
              viewMode={viewMode}
              tLat={tLat}
              tLng={tLng}
              dLat={dLat}
              dLng={dLng}
            />
            {tileType === "streets" ? (
              <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" />
            ) : (
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; CartoDB Voyager" />
            )}
            {hasD && (
              <Circle
                center={[dLat, dLng]}
                radius={300}
                pathOptions={{
                  color: "#10B981",
                  weight: 2,
                  dashArray: "6, 6",
                  fillColor: "#10B981",
                  fillOpacity: 0.08,
                }}
              />
            )}
            {routePts.length > 1 && (
              <>
                {/* 1. Road shadow glow */}
                <Polyline positions={routePts} color="#1E3A8A" weight={12} opacity={0.28} lineCap="round" lineJoin="round" />
                {/* 2. Vibrant solid blue road route */}
                <Polyline positions={routePts} color="#2563EB" weight={6} opacity={0.95} lineCap="round" lineJoin="round" />
                {/* 3. Animated bright cyan directional pulse */}
                <Polyline positions={routePts} color="#93C5FD" weight={3.5} opacity={0.9} dashArray="8, 14" lineCap="round" lineJoin="round" className="ltp-route-anim" />
              </>
            )}
            {hasD && (
              <Marker position={[dLat, dLng]} icon={destinationIcon}>
                <Popup>
                  <div className="ltp-popup">
                    <strong>🏠 Customer Destination</strong>
                    <p>{data?.destination?.address || "—"}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {hasT && (
              <Marker
                position={[tLat, tLng]}
                icon={makeTechIcon()}
                ref={techRef}
              >
                <Popup>
                  <div className="ltp-popup">
                    <strong>🚗 {techName} {isArrived ? "(Arrived Outside Site)" : "(On The Way)"}</strong>
                    {isArrived ? (
                      <p style={{ color: "#059669", fontWeight: 700 }}>✓ Partner arrived within 300m site geofence</p>
                    ) : (
                      finalEta != null && <p>ETA: ~{finalEta} min{finalDist ? ` · ${finalDist} km` : ""}</p>
                    )}
                    <p style={{ color: "#64748b", fontSize: "0.78rem" }}>📍 {data?.technician?.current_location_name || "Hosur Service Area"}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Floating Map Legend matching Employee View */}
          <div className="ltp-map-legend">
            <div className="ltp-legend-item">
              <span className="ltp-leg-dot blue-dot" />
              <span>Partner Location (🚗 {techName || "Partner"})</span>
            </div>
            <div className="ltp-legend-item">
              <span className="ltp-leg-dot red-dot" />
              <span>Customer Destination (🏠 Site)</span>
            </div>
            <div className="ltp-legend-item">
              <span className="ltp-leg-line" />
              <span>Turn-by-Turn Road Route</span>
            </div>
            <div className="ltp-legend-item">
              <span className="ltp-leg-dot green-ring" />
              <span>300m Arrival Geofence</span>
            </div>
          </div>

          <div className={`ltp-eta-banner ${etaBannerClass}`}>
            <div className={`ltp-eta-icon ${etaBannerClass}`}>
              {isArrived || isCompleted ? <CheckCircle2 size={24} /> : isInProgress ? <Wrench size={22} /> : <Clock size={24} />}
            </div>
            <div className="ltp-eta-text">
              {isArrived ? (
                <>
                  <div className="ltp-eta-sub-label green">Partner At Site (~50m away)</div>
                  <div className="ltp-eta-main-label">Technician Arrived</div>
                  <div className="ltp-eta-hint">📍 {data?.technician?.current_location_name || "Malli Mariyamman Temple St"}</div>
                  {startOtp && <div className="ltp-eta-hint" style={{ marginTop: 3 }}>Share OTP <span className="ltp-otp-mini">{startOtp}</span> to begin service</div>}
                </>
              ) : isInProgress ? (
                <>
                  <div className="ltp-eta-sub-label blue">Service In Progress</div>
                  <div className="ltp-eta-main-label">Work is underway</div>
                  <div className="ltp-eta-hint">{techName} is servicing your request</div>
                </>
              ) : isCompleted ? (
                <>
                  <div className="ltp-eta-sub-label green">Service Completed</div>
                  <div className="ltp-eta-main-label">Work Finished Successfully</div>
                  <div className="ltp-eta-hint">Thank you for choosing CalServices!</div>
                </>
              ) : waitingGps ? (
                <>
                  <div className="ltp-eta-sub-label purple">Partner Assigned • Live GPS</div>
                  <div className="ltp-eta-main-label"><span className="ltp-ping-dot" />Locating partner…</div>
                  <div className="ltp-eta-hint">Waiting for latest GPS signal</div>
                </>
              ) : hasT ? (
                <>
                  <div className="ltp-eta-sub-label gray">Estimated Arrival ({hasRoadGeometry ? "Road Route" : "Direct Route"})</div>
                  <div className="ltp-eta-main-label">
                    {finalEta != null ? `${finalEta} min` : "Calculating…"}
                    {finalDist != null && finalEta != null && <span className="ltp-eta-dist"> · {finalDist} km</span>}
                  </div>
                  <div className="ltp-eta-hint">📍 {data?.technician?.current_location_name || statusLabel(status)}</div>
                </>
              ) : (
                <>
                  <div className="ltp-eta-sub-label gray">Status</div>
                  <div className="ltp-eta-main-label">{statusLabel(status)}</div>
                </>
              )}
            </div>
          </div>

          {/* Interactive Multi-Mode Camera View Controls */}
          <div className="ltp-map-controls">
            <button
              className={`ltp-map-btn${viewMode === "partner" ? " active" : ""}`}
              onClick={() => { setViewMode("partner"); setRecenterTrig(n => n + 1) }}
              aria-label="Focus on Partner"
            >
              🚗 Partner View
            </button>
            <button
              className={`ltp-map-btn${viewMode === "route" ? " active" : ""}`}
              onClick={() => { setViewMode("route"); setRecenterTrig(n => n + 1) }}
              aria-label="Show Full Route"
            >
              🗺️ Full Route
            </button>
            <button
              className={`ltp-map-btn${viewMode === "destination" ? " active" : ""}`}
              onClick={() => { setViewMode("destination"); setRecenterTrig(n => n + 1) }}
              aria-label="Focus on Destination"
            >
              🏠 Destination
            </button>
            <button
              className="ltp-map-btn"
              onClick={() => setTileType(t => t === "streets" ? "osm" : "streets")}
              aria-label="Toggle map style"
            >
              <Layers size={13} /> {tileType === "streets" ? "Google Roads" : "Carto Voyager"}
            </button>
          </div>
        </section>

        <aside className="ltp-panel" aria-label="Booking details">
          {isAccepted ? (
            <motion.div className="ltp-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="ltp-partner-top">
                <div className="ltp-avatar-wrap">
                  {techPhoto ? (
                    <img src={techPhoto} alt={techName} className="ltp-avatar-img" />
                  ) : (
                    <div className="ltp-avatar-init">{(techName || "P").charAt(0).toUpperCase()}</div>
                  )}
                  <span className="ltp-online-dot" />
                </div>
                <div className="ltp-partner-info">
                  <div className="ltp-partner-name-row">
                    <span className="ltp-partner-name">{techName}</span>
                    <span className="ltp-verified">✓ Verified Partner</span>
                  </div>
                  <div className="ltp-partner-meta">
                    {techRating != null && (
                      <span className="ltp-rating"><Star size={12} fill="#d97706" color="#d97706" /> {Number(techRating).toFixed(1)}</span>
                    )}
                    <span className="ltp-meta-dim">
                      {data?.technician?.jobs_completed ? `• ${data.technician.jobs_completed}+ jobs completed` : "• Verified Expert"}
                    </span>
                  </div>
                  <div className="ltp-tech-pills">
                    <span className="ltp-tech-id-pill">
                      {data?.technician?.job_id || `Ref #${data?.request_id || bookingId}`}
                    </span>
                    <span className={`ltp-tech-status-pill ${status}`}>
                      {isArrived ? "📍 Arrived At Site" : isInProgress ? "🔧 In Progress" : isCompleted ? "✅ Completed" : "🛵 On The Way"}
                    </span>
                  </div>
                  <div className="ltp-tech-loc">
                    <MapPin size={12} style={{ color: "#64748b", flexShrink: 0 }} />
                    <span>{data?.technician?.current_location_name || "Hosur Service Area"}</span>
                  </div>
                </div>
                {finalEta != null && !isArrived && !isInProgress && !isCompleted && (
                  <div className="ltp-eta-pill">
                    <div className="ltp-eta-pill-num">{finalEta}</div>
                    <div className="ltp-eta-pill-unit">MIN ETA</div>
                  </div>
                )}
              </div>
              <div className="ltp-action-row">
                {techPhone ? (
                  <a href={`tel:${techPhone}`} className="ltp-btn green" aria-label="Call technician">
                    <Phone size={14} /> Call Partner
                  </a>
                ) : (
                  <span className="ltp-btn disabled" aria-disabled="true"><Phone size={14} /> Call Partner</span>
                )}
                {techPhone && (
                  <button className="ltp-btn outline" onClick={openWA} aria-label="WhatsApp technician">
                    <MessageSquare size={14} color="#25D366" /> WhatsApp
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="ltp-card ltp-waiting-card">
              <div className="ltp-radar-wrap">
                <motion.div className="ltp-radar-ring r1" animate={{ scale: [1, 1.9, 2.5], opacity: [0.55, 0.18, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }} />
                <motion.div className="ltp-radar-ring r2" animate={{ scale: [1, 1.6, 2.1], opacity: [0.65, 0.28, 0] }} transition={{ repeat: Infinity, duration: 2.4, delay: 0.8, ease: "easeOut" }} />
                <div className="ltp-radar-center"><Bike size={26} color="white" /></div>
              </div>
              <div className="ltp-waiting-info">
                <div className="ltp-waiting-title">Finding your service partner…</div>
                <div className="ltp-waiting-sub">We'll update you once a verified partner is assigned</div>
              </div>
            </div>
          )}

          {isAccepted && startOtp && !isCompleted && !isCancelled && (
            <div className="ltp-card ltp-otp-card">
              <div className="ltp-otp-left">
                <KeyRound size={17} color="#ea580c" />
                <div>
                  <div className="ltp-otp-label">Service Start OTP</div>
                  <div className="ltp-otp-hint">Share when partner arrives</div>
                </div>
              </div>
              <button className="ltp-otp-val" onClick={copyOtp} aria-label="Copy OTP">
                {startOtp}
                {copiedOtp ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              </button>
            </div>
          )}

          <div className="ltp-card">
            <div className="ltp-sec-title">Live Service Status</div>
            <div className="ltp-timeline">
              {TIMELINE_STEPS.map((step, i) => {
                const done = tlIdx > i
                const active = tlIdx === i
                const last = i === TIMELINE_STEPS.length - 1
                return (
                  <div key={i} className="ltp-tl-row">
                    <div className="ltp-tl-col">
                      <div className={`ltp-tl-dot ${done ? "done" : active ? "active" : "pend"}`}>
                        {done ? <Check size={11} /> : <span style={{ fontSize: 11 }}>{step.emoji}</span>}
                      </div>
                      {!last && <div className={`ltp-tl-line ${done ? "done" : ""}`} />}
                    </div>
                    <div className="ltp-tl-label-col">
                      <span className={`ltp-tl-label ${done ? "done" : active ? "active" : "pend"}`}>{step.label}</span>
                      {active && !isCancelled && (
                        <span className="ltp-tl-badge">
                          {isArrived || isInProgress ? "Now" : finalEta != null ? `~${finalEta} min` : "Active"}
                        </span>
                      )}
                      {done && !last && <span className="ltp-tl-done-badge">Done</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {data?.destination?.address && (
            <div className="ltp-card">
              <div className="ltp-sec-title">Service Location</div>
              <div className="ltp-addr-row">
                <MapPin size={15} color="#6366F1" style={{ flexShrink: 0, marginTop: 2 }} />
                <span className="ltp-addr-text">{data.destination.address}</span>
              </div>
            </div>
          )}

          {data?.request_id && (
            <div className="ltp-card ltp-ref-card">
              {[
                ["Booking Ref", `#${data.request_id}`, true],
                ["Service", data.issue_title || data.service_category],
                ["Scheduled", data.preferred_date
                  ? `${new Date(data.preferred_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}${data.preferred_time ? ` · ${data.preferred_time}` : ""}`
                  : null],
              ].map(([label, val, bold]) => val ? (
                <div key={label} className="ltp-ref-row">
                  <span className="ltp-ref-label">{label}</span>
                  <span className={bold ? "ltp-ref-val" : "ltp-ref-val-sm"}>{val}</span>
                </div>
              ) : null)}
            </div>
          )}

          {!online && <div className="ltp-offline-strip"><WifiOff size={12} /> No connection — retrying…</div>}
          {!trackingToken && <div className="ltp-token-warn"><Shield size={12} /> Live tracking link secured by CalServices.</div>}
        </aside>
      </main>
    </div>
  )
}

export default LiveTrackingPage