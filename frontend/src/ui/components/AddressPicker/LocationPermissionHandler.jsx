/**
 * LocationPermissionHandler.jsx
 * Slice 1 of 4 — Geolocation permission + state machine
 *
 * States: idle | requesting | granted | denied | unavailable | error | timeout
 * Renders the "Use Current Location" trigger and delegates to MapPickerScreen
 * once coordinates are obtained.
 */

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Compass, MapPin, AlertTriangle, Search, Loader2, X } from "lucide-react"
import { MapPickerScreen } from "./MapPickerScreen"
import { AddressDetailsForm } from "./AddressDetailsForm"

// ─── Constants ───────────────────────────────────────────────────────────────

const GEO_TIMEOUT_MS = 10_000   // 10s before treating as error
const STATES = {
  IDLE:        "idle",
  REQUESTING:  "requesting",
  GRANTED:     "granted",
  DENIED:      "denied",
  UNAVAILABLE: "unavailable",
  ERROR:       "error",
  TIMEOUT:     "timeout",
}

// ─── Internal: error-state resolvers ─────────────────────────────────────────

function classifyGeoError(err) {
  if (!err) return STATES.ERROR
  switch (err.code) {
    case 1: return STATES.DENIED       // PERMISSION_DENIED
    case 2: return STATES.UNAVAILABLE  // POSITION_UNAVAILABLE
    case 3: return STATES.TIMEOUT      // TIMEOUT
    default: return STATES.ERROR
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {Function} props.onClose              — close the parent modal/sheet
 * @param {Function} [props.onManualSearch]     — stub: will be wired in prompt 2
 * @param {Function} [props.onLocationConfirmed] — stub: fires in prompt 2+
 */
export function LocationPermissionHandler({ onClose, onManualSearch, onLocationConfirmed }) {
  const [status, setStatus]             = useState(STATES.IDLE)
  const [coords, setCoords]             = useState(null)   // { lat, lng }
  const [errMsg, setErrMsg]             = useState("")
  const timeoutRef                      = useRef(null)

  // ── Slice 3: screen stack for map → details navigation ───────────────────
  // "map"     — MapPickerScreen is showing (default after GPS granted)
  // "details" — AddressDetailsForm is showing (after Confirm Location)
  const [screen, setScreen]             = useState("map")
  const [confirmedAddress, setConfirmedAddress] = useState(null)

  // Auto-trigger location detection on mount
  useEffect(() => {
    handleUseCurrentLocation()
    return () => clearTimeout(timeoutRef.current)
  }, [])

  // ── Trigger GPS ────────────────────────────────────────────────────────────

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus(STATES.UNAVAILABLE)
      setErrMsg("GPS is not available on this device or browser.")
      return
    }

    setStatus(STATES.REQUESTING)
    setErrMsg("")

    // Hard timeout in case the browser hangs on the permission dialog
    timeoutRef.current = setTimeout(() => {
      setStatus(STATES.TIMEOUT)
      setErrMsg("Location request timed out. Please try again or search manually.")
    }, GEO_TIMEOUT_MS)

    navigator.geolocation.getCurrentPosition(
      // ─ success ─
      (position) => {
        clearTimeout(timeoutRef.current)
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setCoords({ lat, lng })
        setStatus(STATES.GRANTED)
      },
      // ─ error ─
      (err) => {
        clearTimeout(timeoutRef.current)
        const resolvedState = classifyGeoError(err)
        setStatus(resolvedState)
        setErrMsg(
          resolvedState === STATES.DENIED
            ? "Location permission was denied. Please allow access in browser settings or search manually."
            : resolvedState === STATES.UNAVAILABLE
            ? "Your device couldn't determine your location. Check GPS settings or search manually."
            : "Couldn't get your location. Please try again or search manually."
        )
      },
      // ─ options ─
      {
        enableHighAccuracy: true,
        timeout: GEO_TIMEOUT_MS - 500,  // let our timer fire first on extreme hang
        maximumAge: 60_000,             // accept a 1-min cached fix (faster UX)
      }
    )
  }

  const defaultCoords = coords || { lat: 12.9716, lng: 77.5946 }

  // ── If details form is showing ─────────────────────────────────────────────
  if (screen === "details" && confirmedAddress) {
    return (
      <AddressDetailsForm
        addressData={confirmedAddress}
        onBack={() => setScreen("map")}
        onSubmit={(payload) => {
          if (typeof onLocationConfirmed === "function") onLocationConfirmed(payload)
          onClose()
        }}
        onClose={onClose}
      />
    )
  }

  // ── Render MapPickerScreen directly ───────────────────────────────────────
  return (
    <MapPickerScreen
      initialCoords={defaultCoords}
      onClose={onClose}
      onManualSearch={onManualSearch}
      onCenterChange={(lat, lng, resolvedAddress) => {
        if (resolvedAddress) {
          setConfirmedAddress(resolvedAddress)
          setScreen("details")
        }
      }}
    />
  )

  // ── Permission / error UI ──────────────────────────────────────────────────

  const isErrorState = [
    STATES.DENIED, STATES.UNAVAILABLE, STATES.ERROR, STATES.TIMEOUT,
  ].includes(status)

  return (
    <div style={styles.overlay}>
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          style={styles.card}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTitle}>
              <MapPin size={18} style={{ color: "#6366f1" }} />
              <span>Set Delivery Location</span>
            </div>
            <button style={styles.closeBtn} onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={styles.body}>

            {/* ── IDLE / REQUESTING: show the main CTA ── */}
            {(status === STATES.IDLE || status === STATES.REQUESTING) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ width: "100%" }}
              >
                {/* Icon badge */}
                <div style={styles.iconBadge}>
                  {status === STATES.REQUESTING
                    ? <Loader2 size={32} style={{ color: "#6366f1", animation: "spin 1s linear infinite" }} />
                    : <Compass size={32} style={{ color: "#6366f1" }} />
                  }
                </div>

                <p style={styles.helperText}>
                  {status === STATES.REQUESTING
                    ? "Detecting your location…"
                    : "Let us find pros near you"}
                </p>

                {/* Use Current Location button */}
                <button
                  style={{
                    ...styles.primaryBtn,
                    ...(status === STATES.REQUESTING ? styles.primaryBtnDisabled : {})
                  }}
                  disabled={status === STATES.REQUESTING}
                  onClick={handleUseCurrentLocation}
                  id="use-current-location-btn"
                >
                  {status === STATES.REQUESTING
                    ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Requesting access…</>
                    : <><Compass size={16} /> Use Current Location</>
                  }
                </button>

                <div style={styles.divider}><span>or</span></div>

                {/* Manual search stub */}
                <button
                  style={styles.secondaryBtn}
                  onClick={onManualSearch}
                  id="search-address-manually-btn"
                >
                  <Search size={15} />
                  Search address manually
                </button>

                <p style={styles.permNote}>
                  We'll ask for location permission — you can deny at any time.
                </p>
              </motion.div>
            )}

            {/* ── ERROR / DENIED / UNAVAILABLE / TIMEOUT ── */}
            {isErrorState && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: "100%" }}
              >
                <div style={styles.errorBadge}>
                  <AlertTriangle size={28} style={{ color: "#f59e0b" }} />
                </div>

                <p style={styles.errorTitle}>Couldn't access your location</p>

                <div style={styles.errorBox}>
                  <AlertTriangle size={14} style={{ color: "#b45309", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ flex: 1 }}>{errMsg}</span>
                </div>

                {/* Retry */}
                <button
                  style={styles.primaryBtn}
                  onClick={handleUseCurrentLocation}
                  id="retry-location-btn"
                >
                  <Compass size={16} />
                  Try Again
                </button>

                <div style={styles.divider}><span>or</span></div>

                {/* Manual search stub — the real handler is wired in prompt 2 */}
                <button
                  style={styles.secondaryBtn}
                  onClick={onManualSearch}
                  id="search-address-manually-fallback-btn"
                >
                  <Search size={15} />
                  Search address manually
                </button>
              </motion.div>
            )}

          </div>

          {/* Spin keyframes */}
          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 10010,
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)",
  },
  card: {
    width: "100%", maxWidth: 480,
    background: "#fff",
    borderRadius: "24px 24px 0 0",
    boxShadow: "0 -16px 48px rgba(0,0,0,0.18)",
    overflow: "hidden",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "1.1rem 1.4rem 0.8rem",
    borderBottom: "1px solid #f1f5f9",
  },
  headerTitle: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: "1rem", fontWeight: 800, color: "#0f172a",
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: "50%",
    border: "1px solid #e2e8f0", background: "#f8fafc",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#64748b", transition: "background 0.15s",
  },
  body: {
    padding: "1.5rem 1.4rem 1.75rem",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  iconBadge: {
    width: 72, height: 72, borderRadius: "50%",
    background: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 1rem",
    boxShadow: "0 8px 24px rgba(99,102,241,0.15)",
  },
  errorBadge: {
    width: 72, height: 72, borderRadius: "50%",
    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 1rem",
    boxShadow: "0 8px 24px rgba(245,158,11,0.15)",
  },
  helperText: {
    textAlign: "center", fontSize: "0.88rem", fontWeight: 600,
    color: "#64748b", margin: "0 0 1.5rem",
  },
  errorTitle: {
    textAlign: "center", fontSize: "1rem", fontWeight: 800,
    color: "#0f172a", margin: "0 0 0.75rem",
  },
  errorBox: {
    display: "flex", alignItems: "flex-start", gap: 8,
    background: "#fffbeb", border: "1px solid #fde68a",
    borderRadius: 12, padding: "0.75rem 1rem",
    fontSize: "0.8rem", fontWeight: 600, color: "#92400e",
    marginBottom: "1.25rem", width: "100%", boxSizing: "border-box",
  },
  primaryBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, width: "100%", padding: "0.875rem 1rem",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#fff", fontWeight: 800, fontSize: "0.9rem",
    border: "none", borderRadius: 14, cursor: "pointer",
    boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
    transition: "opacity 0.15s, transform 0.1s",
    boxSizing: "border-box",
  },
  primaryBtnDisabled: {
    opacity: 0.65, cursor: "not-allowed",
  },
  divider: {
    display: "flex", alignItems: "center", gap: 12,
    width: "100%", margin: "1rem 0",
    color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700,
  },
  secondaryBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, width: "100%", padding: "0.8rem 1rem",
    background: "#f8fafc", color: "#334155",
    fontWeight: 700, fontSize: "0.88rem",
    border: "1.5px solid #e2e8f0", borderRadius: 14,
    cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
    boxSizing: "border-box",
  },
  permNote: {
    textAlign: "center", fontSize: "0.72rem", fontWeight: 500,
    color: "#94a3b8", margin: "1rem 0 0", lineHeight: 1.5,
  },
}
