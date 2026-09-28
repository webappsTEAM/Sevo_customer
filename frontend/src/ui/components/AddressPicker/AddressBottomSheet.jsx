/**
 * AddressBottomSheet.jsx
 * Swiggy/Instamart-style Delivery Location Picker Sheet UI
 * Single Primary Action: "CONFIRM LOCATION"
 */

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  MapPin, Home, Briefcase, Star, Edit2, ChevronRight,
  AlertTriangle, CheckCircle2, Navigation
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"

export function AddressBottomSheet({
  address,
  initialLocation = null,
  loading,
  error,
  zoneStatus,
  onConfirm,
  onManualSearch,
  onUseCurrentLocation,
  onSelectSavedAddress,
  onEditDetails
}) {
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedSavedId, setSelectedSavedId] = useState(initialLocation?.id || initialLocation?.saved_address_id || null)

  const loadSaved = async () => {
    try {
      const res = await apiRequest('/auth/customer/addresses/')
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setSavedAddresses(res.data)
      } else {
        setSavedAddresses([])
      }
    } catch (e) {
      setSavedAddresses([])
    }
  }

  useEffect(() => {
    loadSaved()
  }, [])

  useEffect(() => {
    if (initialLocation?.id || initialLocation?.saved_address_id) {
      setSelectedSavedId(initialLocation.id || initialLocation.saved_address_id)
    }
  }, [initialLocation])

  const activeAddr = address?.formatted_address ? address : (initialLocation?.formatted_address ? initialLocation : address)
  const hasAddress = Boolean(activeAddr?.formatted_address)
  const isOutOfZone = zoneStatus && zoneStatus.inZone === false
  const isServiceBlocked = zoneStatus && zoneStatus.inZone === true && zoneStatus.serviceAllowed === false
  const isZoneChecking = Boolean(zoneStatus && zoneStatus.checking)
  const isZoneCheckFailed = Boolean(zoneStatus && zoneStatus.checkFailed)
  const isAvailable = zoneStatus && zoneStatus.inZone === true && !isZoneChecking && !isZoneCheckFailed && (zoneStatus.serviceAllowed === undefined || zoneStatus.serviceAllowed === null || zoneStatus.serviceAllowed === true)
  // Confirm only after the backend verified the pin (fail closed).
  const confirmEnabled = (hasAddress || selectedSavedId) && !loading && !error && !isOutOfZone && !isServiceBlocked && (!zoneStatus || isAvailable)

  // Format clean primary & secondary location display
  let cleanPrimary = "Detecting location..."
  let cleanSecondary = "Fetching address details..."

  if (hasAddress) {
    const rawParts = (activeAddr.formatted_address || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => !/\b(india)\b/i.test(s))

    if (rawParts.length >= 2) {
      cleanPrimary = rawParts.slice(0, 2).join(", ")
      const tail = rawParts.slice(2).filter(Boolean).join(", ")
      const cityPart = activeAddr.city || ""
      const pieces = [tail, cityPart].filter(Boolean).join(", ")
      cleanSecondary = pieces + (activeAddr.pincode ? ` - ${activeAddr.pincode}` : "")
    } else if (rawParts.length === 1) {
      cleanPrimary = rawParts[0]
      const locPart = activeAddr.locality || ""
      const cityPart = activeAddr.city || ""
      const pieces = [locPart, cityPart].filter(Boolean).join(", ")
      cleanSecondary = pieces + (activeAddr.pincode ? ` - ${activeAddr.pincode}` : "")
    } else {
      cleanPrimary = activeAddr.formatted_address
      cleanSecondary = ""
    }

    if (!cleanSecondary.trim()) {
      cleanSecondary = [activeAddr.locality, activeAddr.city, activeAddr.state].filter(Boolean).join(", ")
    }
  }

  const handleSavedSelect = (item) => {
    setSelectedSavedId(item.id)
    if (typeof onSelectSavedAddress === "function") {
      onSelectSavedAddress(item)
    }
  }

  const handleConfirmClick = () => {
    if (isOutOfZone) {
      alert("⚠️ Services aren't available at this location yet. Please select an address within our active service area.")
      return
    }
    if (isServiceBlocked) {
      alert("⚠️ This service is currently not available in this location. Please choose another service or change location.")
      return
    }
    if (!confirmEnabled) return
    if (selectedSavedId) {
      const match = savedAddresses.find(a => a.id === selectedSavedId)
      if (match) {
        onConfirm(match)
        return
      }
    }
    onConfirm(activeAddr)
  }

  return (
    <div style={styles.sheet}>
      {/* Top drag handle */}
      <div style={styles.handle} />

      {/* Scrollable sheet body */}
      <div style={styles.scrollBody} className="no-scrollbar">

        {/* 1. Out-of-zone validation warning card */}
        {isOutOfZone && (
          <div style={styles.outOfZoneWarning}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertTriangle size={18} style={{ color: "#dc2626", flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#991b1b" }}>
                  Services Aren't Available Here
                </div>
                <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 2, lineHeight: 1.4 }}>
                  {zoneStatus.message || "We do not serve this location yet. Please select or drag inside our operational service boundary."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. In zone, but service disabled warning card */}
        {isServiceBlocked && (
          <div style={styles.serviceBlockedWarning}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}>
                  Service Unavailable in This Zone
                </div>
                <div style={{ fontSize: 11, color: "#b45309", marginTop: 2, lineHeight: 1.4 }}>
                  {zoneStatus.message || "This specific service is currently disabled in this service area."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2b. Availability not verified yet / verification failed (fail closed) */}
        {isZoneCheckFailed && !isOutOfZone && !isServiceBlocked && (
          <div style={styles.serviceBlockedWarning}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 11, color: "#b45309", lineHeight: 1.4 }}>
                {zoneStatus.message || "We couldn't verify service availability for this location. Please try again."}
              </div>
            </div>
          </div>
        )}
        {isZoneChecking && hasAddress && (
          <div style={{ fontSize: 11, color: "#64748b", padding: "4px 2px" }}>Checking service availability…</div>
        )}

        {/* 3. Service Available Green Confirmation Badge */}
        {isAvailable && hasAddress && !loading && (
          <div style={styles.availableBadge}>
            <CheckCircle2 size={15} style={{ color: "#059669", flexShrink: 0 }} />
            <span>✓ Service available in your area ({zoneStatus.zoneName || "Active Zone"})</span>
          </div>
        )}

        {/* Deliver to section */}
        <div style={styles.deliverToWrap}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "between", width: "100%" }}>
            <span style={styles.deliverToLabel}>SELECT SERVICE LOCATION</span>
          </div>

          <div style={styles.deliverMainRow}>
            <div style={styles.deliverTextWrap}>
              <h3 style={styles.mainTitle}>
                {loading ? "Detecting location..." : cleanPrimary}
              </h3>
              <p style={styles.subTitle}>
                {loading ? "Fetching coordinates and address details..." : cleanSecondary}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (typeof onEditDetails === "function") {
                  onEditDetails(activeAddr)
                } else {
                  handleConfirmClick()
                }
              }}
              style={styles.editBtn}
              title="Add doorstep details (House/Flat No, Landmark)"
            >
              <Edit2 size={15} style={{ color: "#475569" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginLeft: 4 }}>
                Edit
              </span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Use my current location option */}
        <div
          style={styles.currentLocRow}
          onClick={() => typeof onUseCurrentLocation === "function" && onUseCurrentLocation()}
        >
          <div style={styles.greenIconBadge}>
            <Navigation size={17} style={{ color: "#00875A" }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={styles.currentLocTitle}>Use my current location</span>
            <span style={styles.currentLocSub}>Detect exact GPS location automatically</span>
          </div>
          <ChevronRight size={18} style={{ color: "#059669" }} />
        </div>

        {/* SAVED LOCATIONS */}
        {savedAddresses.length > 0 && (
          <div style={styles.savedSection}>
            <span style={styles.savedSectionTitle}>SAVED LOCATIONS</span>
            <div style={styles.savedList}>
              {savedAddresses.map((item) => {
                const isSelected = selectedSavedId === item.id
                const displayStr = [item.address_line1, item.locality, item.city].filter(Boolean).join(", ") + (item.pincode ? ` - ${item.pincode}` : "")

                let Icon = Home
                if (item.label?.toLowerCase() === "work") Icon = Briefcase
                if (item.label?.toLowerCase() === "parents" || item.label?.toLowerCase() === "other") Icon = Star

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSavedSelect(item)}
                    style={{
                      ...styles.savedItemRow,
                      ...(isSelected ? styles.savedItemRowSelected : {})
                    }}
                  >
                    <div style={styles.savedIconBadge}>
                      <Icon size={16} style={{ color: "#00875A" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={styles.savedItemLabel}>{item.label || "Address"}</span>
                        {isSelected && (
                          <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#16a34a", background: "#dcfce7", padding: "1px 6px", borderRadius: 6 }}>
                            Active
                          </span>
                        )}
                      </div>
                      <p style={styles.savedItemAddr}>{displayStr}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* Single Primary Action: CONFIRM LOCATION Button */}
      <div style={styles.footerWrap}>
        <motion.button
          style={{
            ...styles.deliverHereBtn,
            ...(confirmEnabled ? styles.deliverHereBtnActive : (isOutOfZone || isServiceBlocked) ? styles.deliverHereBtnOutOfZone : styles.deliverHereBtnDisabled),
          }}
          onClick={handleConfirmClick}
          disabled={!confirmEnabled && !isOutOfZone && !isServiceBlocked}
          whileTap={confirmEnabled ? { scale: 0.98 } : {}}
        >
          {isOutOfZone
            ? "⚠️ Services Unavailable in Area"
            : isServiceBlocked
              ? "⚠️ Service Disabled in Area"
              : "CONFIRM LOCATION"}
        </motion.button>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  sheet: {
    background: "#fff",
    borderTop: "1px solid #f1f5f9",
    borderRadius: "24px 24px 0 0",
    padding: "0.75rem 1.25rem 1rem",
    boxShadow: "0 -8px 30px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
    maxHeight: "440px",
    zIndex: 10,
  },
  handle: {
    width: 36, height: 4, borderRadius: 99,
    background: "#cbd5e1",
    margin: "0 auto 0.75rem",
    flexShrink: 0,
  },
  scrollBody: {
    overflowY: "auto",
    flex: 1,
    paddingRight: 2,
  },
  outOfZoneWarning: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 14,
    padding: "10px 14px",
    marginBottom: "0.75rem",
  },
  serviceBlockedWarning: {
    background: "#fffbeb",
    border: "1px solid #fcd34d",
    borderRadius: 14,
    padding: "10px 14px",
    marginBottom: "0.75rem",
  },
  availableBadge: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 12,
    padding: "6px 12px",
    marginBottom: "0.75rem",
    fontSize: "0.76rem",
    fontWeight: 800,
    color: "#065f46",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  deliverToWrap: {
    marginBottom: "0.6rem",
  },
  deliverToLabel: {
    fontSize: "0.68rem",
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 4,
  },
  deliverMainRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  deliverTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  mainTitle: {
    margin: 0,
    fontSize: "1.05rem",
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1.3,
  },
  subTitle: {
    margin: "3px 0 0",
    fontSize: "0.8rem",
    color: "#64748b",
    lineHeight: 1.4,
  },
  editBtn: {
    display: "flex",
    alignItems: "center",
    padding: "6px 10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    cursor: "pointer",
    flexShrink: 0,
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: "#f1f5f9",
    margin: "0.6rem 0",
  },
  currentLocRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    borderRadius: 14,
    background: "#ecfdf5",
    border: "1.5px solid #a7f3d0",
    cursor: "pointer",
    marginBottom: "0.75rem",
  },
  greenIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "#d1fae5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  currentLocTitle: {
    display: "block",
    fontSize: "0.86rem",
    fontWeight: 800,
    color: "#065f46",
  },
  currentLocSub: {
    display: "block",
    fontSize: "0.72rem",
    color: "#047857",
    marginTop: 1,
  },
  savedSection: {
    marginTop: "0.5rem",
  },
  savedSectionTitle: {
    fontSize: "0.68rem",
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 6,
  },
  savedList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  savedItemRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  savedItemRowSelected: {
    background: "#ecfdf5",
    borderColor: "#00875A",
  },
  savedIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
    border: "1px solid #e2e8f0",
  },
  savedItemLabel: {
    fontSize: "0.82rem",
    fontWeight: 800,
    color: "#0f172a",
    textTransform: "capitalize",
  },
  savedItemAddr: {
    margin: "2px 0 0",
    fontSize: "0.72rem",
    color: "#64748b",
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  footerWrap: {
    paddingTop: "0.75rem",
    flexShrink: 0,
  },
  deliverHereBtn: {
    width: "100%",
    padding: "0.875rem",
    borderRadius: 14,
    border: "none",
    fontSize: "0.92rem",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  deliverHereBtnActive: {
    background: "linear-gradient(135deg, #00875A 0%, #059669 100%)",
    color: "#fff",
    boxShadow: "0 6px 20px rgba(0, 135, 90, 0.35)",
  },
  deliverHereBtnOutOfZone: {
    background: "#ef4444",
    color: "#fff",
    cursor: "not-allowed",
  },
  deliverHereBtnDisabled: {
    background: "#e2e8f0",
    color: "#94a3b8",
    cursor: "not-allowed",
  }
}
