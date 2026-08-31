import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wrench,
  Bike,
  MapPin,
  Clock,
  CheckCircle2,
  Phone,
  MessageSquare,
  Navigation,
  ShieldCheck,
  Star,
  RefreshCw,
  KeyRound,
  AlertCircle,
  Play,
  Check,
  Send,
  Radio,
  User,
  Power,
  Compass,
  Zap,
  ArrowRight
} from "lucide-react"
import { API_BASE_URL } from "../../api/client.js"
import { useAuth } from "../../state/auth/useAuth.js"

export function TechnicianAppPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("available") // "available" | "active"
  const [availableJobs, setAvailableJobs] = useState([])
  const [activeJob, setActiveJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [techProfile, setTechProfile] = useState(null)

  // Real GPS State
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsCoords, setGpsCoords] = useState(null) // { latitude, longitude, accuracy, speed, heading }
  const [gpsError, setGpsError] = useState(null)
  const [lastSentTime, setLastSentTime] = useState(null)
  const [otpInput, setOtpInput] = useState("")
  const [showOtpModal, setShowOtpModal] = useState(false)

  const watchIdRef = useRef(null)
  const gpsIntervalRef = useRef(null)
  const activeJobRef = useRef(activeJob)
  activeJobRef.current = activeJob

  // Fetch technician bookings feed
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE_URL}/technician/bookings/`, {
        credentials: "include",
      })
      const json = await res.json()
      if (json?.data) {
        setAvailableJobs(json.data.available || [])
        setTechProfile(json.data.technician_profile || null)

        const activeList = json.data.active || []
        if (activeList.length > 0) {
          setActiveJob(activeList[0])
          setActiveTab("active")
        } else {
          setActiveJob(null)
        }
      }
    } catch (err) {
      console.warn("Failed to fetch technician bookings:", err)
      setErrorMsg("Failed to load jobs feed. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Clear toast messages after 4 seconds
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null)
        setErrorMsg(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg, errorMsg])

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
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

  const lastSentGpsRef = useRef({ lat: null, lng: null, heading: null, timestamp: 0 })

  /* ─── Real GPS Location Sender with Intelligent Movement Throttling ─── */
  const sendLocationUpdate = useCallback(async (coords, force = false) => {
    const job = activeJobRef.current
    if (!job || !coords?.latitude || !coords?.longitude) return

    // Accuracy safeguard: discard wild GPS noise fixes (> 150m accuracy error)
    if (coords.accuracy && coords.accuracy > 150) {
      console.warn(`[GPS Throttling] Discarding low-accuracy GPS fix (${coords.accuracy}m)`)
      return
    }

    const now = Date.now()
    const last = lastSentGpsRef.current

    if (!force && last.lat != null && last.lng != null) {
      const movedM = haversineMeters(last.lat, last.lng, coords.latitude, coords.longitude)
      const elapsedMs = now - last.timestamp
      const headingDiff = Math.abs((((coords.heading || 0) - (last.heading || 0)) + 180) % 360 - 180)

      // Throttle: send only if moved >= 8m, heading changed >= 20 deg, or 5s heartbeat passed
      if (movedM < 8 && headingDiff < 20 && elapsedMs < 5000) {
        return
      }
    }

    try {
      console.log(`[TRACKING] GPS position: lat=${coords.latitude}, lng=${coords.longitude}, heading=${coords.heading}°, speed=${coords.speed}km/h`)
      console.log(`[TRACKING] Sending location for booking #${job.request_id || job.id}`)

      const payload = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || null,
        heading: coords.heading || 0,
        speed: coords.speed || 0,
      }

      const res = await fetch(`${API_BASE_URL}/technician/bookings/${job.id}/location/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        lastSentGpsRef.current = {
          lat: coords.latitude,
          lng: coords.longitude,
          heading: coords.heading || 0,
          timestamp: now,
        }
        setLastSentTime(new Date().toLocaleTimeString())
      }
    } catch (err) {
      console.warn("Failed to stream GPS location:", err)
    }
  }, [])

  /* ─── Start / Stop Hardware GPS Tracking ─── */
  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.")
      return
    }

    // Clean up any existing listeners/timers
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (gpsIntervalRef.current != null) {
      clearInterval(gpsIntervalRef.current)
      gpsIntervalRef.current = null
    }

    console.log("[TECHNICIAN GPS] Starting real device GPS hardware tracking")
    setGpsActive(true)
    setGpsError(null)

    // 1. Immediate one-time real GPS capture
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          heading: pos.coords.heading || 0,
        }
        setGpsCoords(c)
        console.log(`[TECHNICIAN GPS] Immediate Real GPS captured: lat=${c.latitude}, lng=${c.longitude}, accuracy=${c.accuracy}m`)
        sendLocationUpdate(c, true)
      },
      (err) => {
        console.warn("[TECHNICIAN GPS] Initial GPS fix error:", err)
        setGpsError(err.message || "Unable to acquire initial GPS fix.")
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    // 2. Guaranteed 30-Second recurring real GPS capture
    gpsIntervalRef.current = setInterval(() => {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
            heading: pos.coords.heading || 0,
          }
          setGpsCoords(c)
          console.log(`[TECHNICIAN GPS] 30-Second Real GPS captured: lat=${c.latitude}, lng=${c.longitude}`)
          sendLocationUpdate(c, true)
        },
        (err) => {
          console.warn("[TECHNICIAN GPS] 30s interval error:", err)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }, 30000)

    // 3. Continuous watchPosition for live movement between intervals
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const c = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          heading: pos.coords.heading || 0,
        }
        setGpsCoords(c)
        sendLocationUpdate(c)
      },
      (err) => {
        console.warn("[TECHNICIAN GPS] Watch error:", err)
        if (err.code === 1) {
          setGpsError("Location permission denied. Please allow location access in your browser.")
        } else if (err.code === 2) {
          setGpsError("Position unavailable. Ensure GPS is enabled.")
        } else {
          setGpsError(err.message || "GPS timeout.")
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    )

    watchIdRef.current = id
  }, [sendLocationUpdate])

  const stopGpsTracking = useCallback(() => {
    if (gpsIntervalRef.current != null) {
      clearInterval(gpsIntervalRef.current)
      gpsIntervalRef.current = null
    }
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    console.log("[TECHNICIAN GPS] Hardware GPS tracking stopped")
    setGpsActive(false)
  }, [])

  // Auto-start GPS when an active job is accepted, and auto-stop on terminal state or unmount
  useEffect(() => {
    if (activeJob && ["accepted", "on_the_way", "arrived", "in_progress"].includes(activeJob.status)) {
      startGpsTracking()
    } else {
      stopGpsTracking()
    }

    return () => {
      stopGpsTracking()
    }
  }, [activeJob?.id, activeJob?.status, startGpsTracking, stopGpsTracking])

  /* ─── Accept Booking Action ─── */
  const handleAcceptJob = async (job) => {
    try {
      setActionLoading(true)
      let coords = gpsCoords

      // If GPS not cached yet, capture immediate real device GPS fix
      if (!coords && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
              maximumAge: 0,
            })
          })
          coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
            heading: pos.coords.heading || 0,
          }
          setGpsCoords(coords)
          console.log(`[TECHNICIAN ACCEPT] Captured real device GPS: lat=${coords.latitude}, lng=${coords.longitude}`)
        } catch (gpsErr) {
          console.warn("[TECHNICIAN ACCEPT] Direct GPS capture warning:", gpsErr)
        }
      }

      const payload = {}
      if (coords?.latitude && coords?.longitude) {
        payload.latitude = coords.latitude
        payload.longitude = coords.longitude
        payload.heading = coords.heading || 0
        payload.speed = coords.speed || 0
        payload.accuracy = coords.accuracy || null
      }

      const res = await fetch(`${API_BASE_URL}/technician/bookings/${job.id}/accept/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok && json?.success) {
        console.log(`[TRACKING] Booking accepted: #${job.request_id || job.id}`)
        setSuccessMsg(`Accepted booking #${job.request_id}! Live GPS tracking is active.`)
        setActiveJob(json.data)
        setActiveTab("active")
        startGpsTracking()
        fetchBookings()

        // If coordinates available, push immediate telemetry ping
        if (coords?.latitude && coords?.longitude) {
          sendLocationUpdate(coords, true)
        }
      } else {
        setErrorMsg(json?.error || "Failed to accept booking.")
      }
    } catch (err) {
      console.warn("Failed to accept booking:", err)
      setErrorMsg("Network error while accepting booking.")
    } finally {
      setActionLoading(false)
    }
  }

  /* ─── Transition Booking Status Action ─── */
  const handleStatusUpdate = async (targetStatus, otp = "") => {
    if (!activeJob) return
    try {
      setActionLoading(true)
      const res = await fetch(`${API_BASE_URL}/technician/bookings/${activeJob.id}/status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: targetStatus, otp }),
      })
      const json = await res.json()
      if (res.ok && json?.success) {
        setSuccessMsg(json.message || `Status updated to ${targetStatus}!`)
        setActiveJob(json.data)
        setShowOtpModal(false)
        setOtpInput("")
        if (targetStatus === "completed") {
          stopGpsTracking()
          fetchBookings()
        }
      } else {
        setErrorMsg(json?.error || "Failed to update status.")
      }
    } catch (err) {
      setErrorMsg("Network error while updating status.")
    } finally {
      setActionLoading(false)
    }
  }

  /* ─── Verify OTP Action ─── */
  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) {
      setErrorMsg("Please enter the 4-digit Service Start OTP from the customer.")
      return
    }
    await handleStatusUpdate("in_progress", otpInput.trim())
  }

  if (!user) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily: "Inter, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        gap: 12,
      }}>
        <ShieldCheck size={40} color="#0B8F7A" />
        <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>Technician Login Required</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.88rem", maxWidth: 340 }}>
          Please sign in with your technician account to view jobs, accept bookings, and stream GPS location.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      color: "#f8fafc",
      fontFamily: "Inter, -apple-system, sans-serif",
      padding: "1rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      {/* App Container */}
      <div style={{
        width: "100%",
        maxWidth: 580,
        background: "#1e293b",
        borderRadius: 24,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 25px 60px -15px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          background: "linear-gradient(135deg, #111827, #0f172a)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, #0B8F7A, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(11,143,122,0.4)",
            }}>
              <Wrench size={22} color="white" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900 }}>
                  SEVO Partner App
                </h2>
                <span style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  background: "rgba(16,185,129,0.2)",
                  color: "#34d399",
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: "1px solid rgba(52,211,153,0.3)"
                }}>
                  FIELD PRO
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span>👤 {techProfile?.name || user?.name || "Rajesh Kumar"}</span>
                <span>•</span>
                <span style={{ color: "#fbbf24", fontWeight: 700 }}>⭐ {techProfile?.rating || "4.9"}</span>
              </div>
            </div>
          </div>

          <button
            onClick={fetchBookings}
            disabled={loading}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: 10,
              padding: "8px",
              color: "#cbd5e1",
              cursor: "pointer",
            }}
            title="Refresh Feed"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Live GPS Telemetry Status Strip */}
        <div style={{
          padding: "0.6rem 1.25rem",
          background: gpsActive ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.78rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: gpsActive ? "#10b981" : "#f59e0b",
              boxShadow: gpsActive ? "0 0 8px #10b981" : "none",
              display: "inline-block",
            }} />
            <span style={{ fontWeight: 700, color: gpsActive ? "#34d399" : "#fbbf24" }}>
              {gpsActive ? "GPS Active • Streaming Live Location" : "GPS Standby"}
            </span>
          </div>
          {lastSentTime && (
            <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>
              Sent {lastSentTime}
            </span>
          )}
        </div>

        {/* GPS Error Alert */}
        {gpsError && (
          <div style={{
            padding: "0.6rem 1.25rem",
            background: "rgba(239, 68, 68, 0.15)",
            borderBottom: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            fontSize: "0.78rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <AlertCircle size={15} color="#ef4444" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Toasts */}
        {successMsg && (
          <div style={{
            padding: "0.75rem 1.25rem",
            background: "#059669",
            color: "white",
            fontSize: "0.85rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div style={{
            padding: "0.75rem 1.25rem",
            background: "#dc2626",
            color: "white",
            fontSize: "0.85rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(15,23,42,0.6)",
        }}>
          <button
            onClick={() => setActiveTab("available")}
            style={{
              flex: 1,
              padding: "0.85rem 1rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "available" ? "3px solid #0B8F7A" : "3px solid transparent",
              color: activeTab === "available" ? "#34d399" : "#94a3b8",
              fontWeight: 800,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>Available Jobs</span>
            <span style={{
              background: "rgba(255,255,255,0.1)",
              padding: "1px 7px",
              borderRadius: 99,
              fontSize: "0.72rem",
            }}>
              {availableJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("active")}
            style={{
              flex: 1,
              padding: "0.85rem 1rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "active" ? "3px solid #0B8F7A" : "3px solid transparent",
              color: activeTab === "active" ? "#34d399" : "#94a3b8",
              fontWeight: 800,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>Active Job</span>
            {activeJob && (
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
                boxShadow: "0 0 8px #10b981",
              }} />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "1.25rem", maxHeight: "70vh", overflowY: "auto" }}>
          {/* TAB 1: Available Jobs */}
          {activeTab === "available" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {availableJobs.length === 0 ? (
                <div style={{
                  padding: "3rem 1.5rem",
                  textAlign: "center",
                  color: "#94a3b8",
                }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📋</div>
                  <div style={{ fontWeight: 800, color: "#f1f5f9", fontSize: "1.05rem" }}>
                    No Pending Bookings
                  </div>
                  <div style={{ fontSize: "0.82rem", marginTop: 4 }}>
                    New customer requests in your service zone will appear here in real-time.
                  </div>
                </div>
              ) : (
                availableJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: "rgba(30, 41, 59, 0.7)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 18,
                      padding: "1.1rem",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <span style={{
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          background: "#0B8F7A",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}>
                          {job.service_category || "Home Service"}
                        </span>
                        <h4 style={{ margin: "6px 0 2px", fontSize: "1.05rem", fontWeight: 800, color: "#ffffff" }}>
                          {job.issue_title || "Service Request"}
                        </h4>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontFamily: "monospace" }}>
                          Ref #{job.request_id || job.id}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#34d399" }}>
                          ₹{Number(job.total_amount || 0).toLocaleString("en-IN")}
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase" }}>
                          {job.payment_method || "COD"}
                        </span>
                      </div>
                    </div>

                    <div style={{ margin: "12px 0", fontSize: "0.82rem", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <MapPin size={14} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{job.address || "Service Location Address"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                        <span>
                          {job.preferred_date ? new Date(job.preferred_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "Today"}
                          {job.preferred_time ? ` · ${job.preferred_time}` : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <User size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <span>Customer: <strong>{job.customer_name || "Guest Customer"}</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptJob(job)}
                      disabled={actionLoading}
                      style={{
                        width: "100%",
                        padding: "11px",
                        background: "linear-gradient(135deg, #0B8F7A, #059669)",
                        color: "white",
                        border: "none",
                        borderRadius: 12,
                        fontWeight: 900,
                        fontSize: "0.92rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxShadow: "0 4px 14px rgba(11,143,122,0.4)",
                        transition: "all 0.2s",
                      }}
                    >
                      <Check size={16} /> Accept Booking
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Active Job & GPS Navigation */}
          {activeTab === "active" && (
            <div>
              {!activeJob ? (
                <div style={{
                  padding: "3rem 1.5rem",
                  textAlign: "center",
                  color: "#94a3b8",
                }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🛵</div>
                  <div style={{ fontWeight: 800, color: "#f1f5f9", fontSize: "1.05rem" }}>
                    No Active Job In Progress
                  </div>
                  <div style={{ fontSize: "0.82rem", marginTop: 4 }}>
                    Accept an available booking to start turn-by-turn tracking.
                  </div>
                  <button
                    onClick={() => setActiveTab("available")}
                    style={{
                      marginTop: 16,
                      background: "#0B8F7A",
                      color: "white",
                      border: "none",
                      padding: "8px 18px",
                      borderRadius: 10,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    View Available Jobs
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Current Status Header Card */}
                  <div style={{
                    background: "linear-gradient(135deg, #1e293b, #0f172a)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 20,
                    padding: "1.25rem",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          background: activeJob.status === "arrived"
                            ? "#059669"
                            : activeJob.status === "in_progress"
                            ? "#2563eb"
                            : activeJob.status === "completed"
                            ? "#10b981"
                            : "#ea580c",
                          color: "white",
                          padding: "3px 9px",
                          borderRadius: 8,
                        }}>
                          STATUS: {activeJob.status?.toUpperCase() || "ACCEPTED"}
                        </span>
                        <h3 style={{ margin: "8px 0 2px", fontSize: "1.15rem", fontWeight: 900, color: "#ffffff" }}>
                          {activeJob.issue_title || activeJob.service_category}
                        </h3>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontFamily: "monospace" }}>
                          Booking #{activeJob.request_id || activeJob.id}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#34d399" }}>
                          ₹{Number(activeJob.total_amount || 0).toLocaleString("en-IN")}
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                          {activeJob.payment_method || "COD"}
                        </span>
                      </div>
                    </div>

                    {/* Customer Contact Row */}
                    <div style={{
                      marginTop: 14,
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 800 }}>
                        Customer Details
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#f8fafc", marginTop: 2 }}>
                        {activeJob.customer_name || "Guest Customer"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: 2 }}>
                        📍 {activeJob.address || "Customer Address"}
                      </div>

                      {activeJob.customer_phone && (
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <a
                            href={`tel:${activeJob.customer_phone}`}
                            style={{
                              flex: 1,
                              padding: "8px",
                              background: "#059669",
                              color: "white",
                              borderRadius: 8,
                              fontWeight: 800,
                              fontSize: "0.8rem",
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            <Phone size={14} /> Call Customer
                          </a>
                          <button
                            onClick={() => {
                              const msg = encodeURIComponent(`Hi ${activeJob.customer_name}, I am your Sevo technician for booking #${activeJob.request_id}.`)
                              window.open(`https://wa.me/91${activeJob.customer_phone.replace(/\D/g, "")}?text=${msg}`, "_blank")
                            }}
                            style={{
                              flex: 1,
                              padding: "8px",
                              background: "rgba(255,255,255,0.08)",
                              color: "#f8fafc",
                              border: "1px solid rgba(255,255,255,0.15)",
                              borderRadius: 8,
                              fontWeight: 800,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            <MessageSquare size={14} color="#25D366" /> WhatsApp
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GPS Telemetry Monitor Card */}
                  <div style={{
                    background: "rgba(30,41,59,0.7)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 18,
                    padding: "1.1rem",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: "0.85rem", color: "#38bdf8" }}>
                        <Compass size={16} /> Device GPS Telemetry
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: "0.78rem" }}>
                      <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px", borderRadius: 8 }}>
                        <span style={{ color: "#94a3b8" }}>Latitude:</span>{" "}
                        <strong style={{ color: "#f8fafc" }}>{gpsCoords?.latitude?.toFixed(5) || "Acquiring…"}</strong>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px", borderRadius: 8 }}>
                        <span style={{ color: "#94a3b8" }}>Longitude:</span>{" "}
                        <strong style={{ color: "#f8fafc" }}>{gpsCoords?.longitude?.toFixed(5) || "Acquiring…"}</strong>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px", borderRadius: 8 }}>
                        <span style={{ color: "#94a3b8" }}>Accuracy:</span>{" "}
                        <strong style={{ color: "#34d399" }}>{gpsCoords?.accuracy ? `±${Math.round(gpsCoords.accuracy)}m` : "—"}</strong>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px", borderRadius: 8 }}>
                        <span style={{ color: "#94a3b8" }}>Speed:</span>{" "}
                        <strong style={{ color: "#fbbf24" }}>{gpsCoords?.speed ? `${gpsCoords.speed} km/h` : "0 km/h"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Lifecycle Action Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {activeJob.status === "accepted" && (
                      <button
                        onClick={() => handleStatusUpdate("on_the_way")}
                        disabled={actionLoading}
                        style={{
                          width: "100%",
                          padding: "13px",
                          background: "linear-gradient(135deg, #FC8019, #EA580C)",
                          color: "white",
                          border: "none",
                          borderRadius: 14,
                          fontWeight: 900,
                          fontSize: "0.95rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          boxShadow: "0 6px 18px rgba(234,88,12,0.4)",
                        }}
                      >
                        <Navigation size={18} /> Start Trip (On The Way)
                      </button>
                    )}

                    {(activeJob.status === "accepted" || activeJob.status === "on_the_way") && (
                      <button
                        onClick={() => handleStatusUpdate("arrived")}
                        disabled={actionLoading}
                        style={{
                          width: "100%",
                          padding: "13px",
                          background: "linear-gradient(135deg, #059669, #047857)",
                          color: "white",
                          border: "none",
                          borderRadius: 14,
                          fontWeight: 900,
                          fontSize: "0.95rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          boxShadow: "0 6px 18px rgba(5,150,105,0.4)",
                        }}
                      >
                        <CheckCircle2 size={18} /> I Have Arrived at Location
                      </button>
                    )}

                    {activeJob.status === "arrived" && (
                      <button
                        onClick={() => setShowOtpModal(true)}
                        disabled={actionLoading}
                        style={{
                          width: "100%",
                          padding: "13px",
                          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                          color: "white",
                          border: "none",
                          borderRadius: 14,
                          fontWeight: 900,
                          fontSize: "0.95rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          boxShadow: "0 6px 18px rgba(37,99,235,0.4)",
                        }}
                      >
                        <KeyRound size={18} /> Verify Customer OTP & Start Service
                      </button>
                    )}

                    {activeJob.status === "in_progress" && (
                      <button
                        onClick={() => handleStatusUpdate("completed")}
                        disabled={actionLoading}
                        style={{
                          width: "100%",
                          padding: "13px",
                          background: "linear-gradient(135deg, #10B981, #059669)",
                          color: "white",
                          border: "none",
                          borderRadius: 14,
                          fontWeight: 900,
                          fontSize: "0.95rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          boxShadow: "0 6px 18px rgba(16,185,129,0.4)",
                        }}
                      >
                        <CheckCircle2 size={18} /> Service Complete (Finish Job)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: "#1e293b",
                borderRadius: 20,
                padding: "1.75rem",
                width: "100%",
                maxWidth: 400,
                border: "1px solid rgba(255,255,255,0.1)",
                textAlign: "center",
              }}
            >
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "rgba(37,99,235,0.2)",
                color: "#60a5fa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}>
                <KeyRound size={26} />
              </div>

              <h3 style={{ margin: "0 0 6px", fontSize: "1.15rem", fontWeight: 900 }}>
                Enter Service Start OTP
              </h3>
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "0 0 16px" }}>
                Ask customer for the 4-digit OTP shown on their tracking screen to begin work.
              </p>

              <input
                type="text"
                maxLength={4}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                placeholder="• • • •"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "1.75rem",
                  letterSpacing: "0.5em",
                  textAlign: "center",
                  fontWeight: 900,
                  background: "#0f172a",
                  border: "1.5px solid #3b82f6",
                  borderRadius: 12,
                  color: "#ffffff",
                  outline: "none",
                  marginBottom: 16,
                }}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowOtpModal(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    borderRadius: 10,
                    color: "#cbd5e1",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#2563eb",
                    border: "none",
                    borderRadius: 10,
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {actionLoading ? "Verifying…" : "Verify & Begin"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TechnicianAppPage
