/**
 * AddressBottomSheet.jsx
 * Slice 2 of 4 — Full address display with loading shimmer, resolved, and error states
 *
 * Props:
 *   address     { formatted_address, locality, city, ... } | null
 *   loading     boolean  — while geocode is resolving
 *   error       string | null — geocode failure message
 *   onConfirm   (addressData) => void  — stub, wired to Slice 3
 *   onManualSearch () => void  — opens manual search (stub, wired Slice 3)
 */

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Loader2, AlertTriangle, ChevronRight } from "lucide-react"

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────

function ShimmerLine({ width = "100%", height = 14, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 8,
        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AddressBottomSheet({ address, loading, error, onConfirm, onManualSearch }) {
  const hasAddress = !!address?.formatted_address
  const confirmEnabled = hasAddress && !loading && !error

  // Build secondary line: locality + city
  const secondaryLine = [address?.locality, address?.city]
    .filter(Boolean)
    .join(", ")

  return (
    <div style={styles.sheet}>
      {/* Drag handle */}
      <div style={styles.handle} />

      {/* Address row */}
      <div style={styles.addressRow}>
        {/* Icon */}
        <div style={styles.iconWrap}>
          {loading
            ? <Loader2 size={18} style={{ color: "#6366f1", animation: "spin 1s linear infinite" }} />
            : error
            ? <AlertTriangle size={18} style={{ color: "#f59e0b" }} />
            : <MapPin size={18} style={{ color: "#6366f1" }} />
          }
        </div>

        {/* Text area */}
        <div style={styles.addressText}>
          {/* ── Loading state: shimmer ── */}
          {loading && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div style={styles.addressLabel}>Fetching address…</div>
                <ShimmerLine width="85%" height={13} />
                <ShimmerLine width="55%" height={11} />
              </motion.div>
            </AnimatePresence>
          )}

          {/* ── Error state ── */}
          {!loading && error && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: "100%" }}
              >
                <div style={styles.addressLabel}>Location</div>
                <p style={styles.errorText}>{error}</p>
              </motion.div>
            </AnimatePresence>
          )}

          {/* ── Resolved state ── */}
          {!loading && !error && hasAddress && (
            <AnimatePresence>
              <motion.div
                key={address.formatted_address}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ width: "100%" }}
              >
                <div style={styles.addressLabel}>Selected location</div>
                <p style={styles.addressPrimary}>
                  {address.formatted_address}
                </p>
                {secondaryLine && (
                  <p style={styles.addressSecondary}>{secondaryLine}</p>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* ── Initial idle state (no coords yet) ── */}
          {!loading && !error && !hasAddress && (
            <div style={{ width: "100%" }}>
              <div style={styles.addressLabel}>Selected location</div>
              <p style={styles.addressPlaceholder}>
                Move the map to pin your address
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm button */}
      <motion.button
        style={{
          ...styles.confirmBtn,
          ...(confirmEnabled ? styles.confirmBtnActive : styles.confirmBtnDisabled),
        }}
        onClick={() => {
          if (confirmEnabled && typeof onConfirm === "function") {
            onConfirm(address)
          }
        }}
        disabled={!confirmEnabled}
        whileTap={confirmEnabled ? { scale: 0.97 } : {}}
        id="confirm-location-btn"
      >
        {loading
          ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Resolving address…</>
          : "Confirm Location"
        }
      </motion.button>

      {/* Keyframes */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  sheet: {
    flexShrink: 0,
    background: "#fff",
    borderTop: "1px solid #f1f5f9",
    borderRadius: "20px 20px 0 0",
    padding: "0.6rem 1.25rem",
    paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
    boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
    zIndex: 10,
    minHeight: 160,
  },
  handle: {
    width: 40, height: 4, borderRadius: 99,
    background: "#e2e8f0",
    margin: "0 auto 0.875rem",
  },
  addressRow: {
    display: "flex", alignItems: "flex-start", gap: 12,
    marginBottom: "1rem",
    padding: "0.875rem 1rem",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: 16,
    minHeight: 72,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: "50%",
    background: "#ede9fe",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginTop: 2,
  },
  addressText: {
    flex: 1, overflow: "hidden",
  },
  addressLabel: {
    fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 4,
  },
  addressPrimary: {
    fontSize: "0.88rem", fontWeight: 700, color: "#0f172a",
    lineHeight: 1.4, margin: "0 0 2px",
    overflow: "hidden", textOverflow: "ellipsis",
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  },
  addressSecondary: {
    fontSize: "0.75rem", fontWeight: 600, color: "#64748b",
    margin: 0, lineHeight: 1.3,
  },
  addressPlaceholder: {
    fontSize: "0.86rem", fontWeight: 600, color: "#94a3b8",
    margin: 0, fontStyle: "italic",
  },
  errorText: {
    fontSize: "0.82rem", fontWeight: 600, color: "#b45309",
    margin: 0, lineHeight: 1.4,
  },
  confirmBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, width: "100%", padding: "0.9rem 1rem",
    fontWeight: 800, fontSize: "0.95rem",
    border: "none", borderRadius: 16,
    boxSizing: "border-box",
    transition: "box-shadow 0.15s",
    cursor: "pointer",
  },
  confirmBtnActive: {
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#fff",
    boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
    cursor: "pointer",
  },
  confirmBtnDisabled: {
    background: "#f1f5f9",
    color: "#94a3b8",
    cursor: "not-allowed",
    opacity: 0.7,
  },
}
