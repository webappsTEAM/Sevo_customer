/**
 * AddressBottomSheet.jsx
 * Instamart/Swiggy-style Delivery Location Picker Sheet UI
 */

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Home, Briefcase, Star, MoreVertical, Edit2, ChevronRight, AlertTriangle, ShieldAlert, CheckCircle2, BookmarkPlus, Plus, Check } from "lucide-react"
import { apiRequest } from "../../../api/client.js"

export function AddressBottomSheet({
  address,
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
  const [selectedSavedId, setSelectedSavedId] = useState(null)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Home")
  const [houseNumber, setHouseNumber] = useState("")
  const [landmark, setLandmark] = useState("")
  const [savingAddress, setSavingAddress] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("")

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

  const hasAddress = !!address?.formatted_address
  const isOutOfZone = zoneStatus && zoneStatus.inZone === false
  const isServiceBlocked = zoneStatus && zoneStatus.inZone === true && zoneStatus.serviceAllowed === false
  const isAvailable = zoneStatus && zoneStatus.inZone === true && (zoneStatus.serviceAllowed === undefined || zoneStatus.serviceAllowed === true)
  const confirmEnabled = (hasAddress || selectedSavedId) && !loading && !error && !isOutOfZone && !isServiceBlocked

  // Format clean primary & secondary location display
  let cleanPrimary = "Detecting location..."
  let cleanSecondary = "Fetching address details..."

  if (hasAddress) {
    const rawParts = (address.formatted_address || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => !/\b(india)\b/i.test(s))

    if (rawParts.length >= 2) {
      cleanPrimary = rawParts.slice(0, 2).join(", ")
      const tail = rawParts.slice(2).filter(Boolean).join(", ")
      const cityPart = address.city || ""
      const pieces = [tail, cityPart].filter(Boolean).join(", ")
      cleanSecondary = pieces + (address.pincode ? ` - ${address.pincode}` : "")
    } else if (rawParts.length === 1) {
      cleanPrimary = rawParts[0]
      const locPart = address.locality || ""
      const cityPart = address.city || ""
      const pieces = [locPart, cityPart].filter(Boolean).join(", ")
      cleanSecondary = pieces + (address.pincode ? ` - ${address.pincode}` : "")
    } else {
      cleanPrimary = address.formatted_address
      cleanSecondary = ""
    }

    if (!cleanSecondary.trim()) {
      cleanSecondary = [address.locality, address.city, address.state].filter(Boolean).join(", ")
    }
  }

  const handleSavedSelect = (item) => {
    setSelectedSavedId(item.id)
    if (typeof onSelectSavedAddress === "function") {
      onSelectSavedAddress(item)
    }
  }

  const handleSaveAddressSubmit = async (e) => {
    e?.preventDefault()
    if (!address?.formatted_address && !address?.locality) return
    setSavingAddress(true)
    try {
      const fullLine1 = [houseNumber, landmark].filter(Boolean).join(", ") || (address.formatted_address ? address.formatted_address.split(",")[0] : "Location")
      const payload = {
        label: saveLabel,
        address_type: saveLabel.toLowerCase(),
        address_line1: fullLine1,
        locality: address.locality || address.city || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
        formatted_address: address.formatted_address || fullLine1,
        latitude: address.latitude || address.lat,
        longitude: address.longitude || address.lng,
      }
      const res = await apiRequest("/auth/customer/addresses/", {
        method: "POST",
        json: payload,
      })
      if (res && res.success) {
        setSaveSuccessMsg("✓ Address saved successfully!")
        setShowSaveForm(false)
        setHouseNumber("")
        setLandmark("")
        await loadSaved()
        setTimeout(() => setSaveSuccessMsg(""), 3000)
      }
    } catch (err) {
      console.warn("Failed to save address:", err)
    } finally {
      setSavingAddress(false)
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
    onConfirm(address)
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

        {/* 3. Service Available Green Confirmation Badge */}
        {isAvailable && hasAddress && !loading && (
          <div style={styles.availableBadge}>
            <CheckCircle2 size={15} style={{ color: "#059669", flexShrink: 0 }} />
            <span>✓ Service available in your area ({zoneStatus.zoneName || "Active Zone"})</span>
          </div>
        )}

        {/* Deliver to section */}
        <div style={styles.deliverToWrap}>
          <span style={styles.deliverToLabel}>DELIVER TO</span>

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
                  onEditDetails(address)
                } else {
                  handleConfirmClick()
                }
              }}
              style={styles.editBtn}
              title="Edit address details (House/Flat, Landmark)"
            >
              <Edit2 size={16} style={{ color: "#334155" }} />
            </button>
          </div>
        </div>

        {/* Save Address Toggle Button */}
        {hasAddress && !showSaveForm && (
          <div style={{ marginBottom: "0.75rem" }}>
            <button
              type="button"
              onClick={() => setShowSaveForm(true)}
              style={styles.saveAddressToggleBtn}
            >
              <BookmarkPlus size={15} color="#4F46E5" />
              <span>Save this address</span>
            </button>
            {saveSuccessMsg && (
              <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 800, marginLeft: 8 }}>
                {saveSuccessMsg}
              </span>
            )}
          </div>
        )}

        {/* Save Address Form */}
        <AnimatePresence>
          {showSaveForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={styles.saveFormContainer}
            >
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                Save as:
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {["Home", "Work", "Other"].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setSaveLabel(lbl)}
                    style={{
                      ...styles.labelPill,
                      ...(saveLabel === lbl ? styles.labelPillActive : {})
                    }}
                  >
                    {lbl === "Home" && <Home size={13} />}
                    {lbl === "Work" && <Briefcase size={13} />}
                    {lbl === "Other" && <Star size={13} />}
                    {lbl}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="House / Flat / Floor No. (Optional)"
                  value={houseNumber}
                  onChange={e => setHouseNumber(e.target.value)}
                  style={styles.formInput}
                />
                <input
                  type="text"
                  placeholder="Nearby Landmark (Optional)"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowSaveForm(false)}
                  style={styles.cancelSaveBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAddressSubmit}
                  disabled={savingAddress}
                  style={styles.submitSaveBtn}
                >
                  {savingAddress ? "Saving..." : "Save Address"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Use my current location option */}
        <div
          style={styles.currentLocRow}
          onClick={() => typeof onUseCurrentLocation === "function" && onUseCurrentLocation()}
        >
          <div style={styles.orangeIconBadge}>
            <MapPin size={18} style={{ color: "#ff5200" }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={styles.currentLocTitle}>Use my current location</span>
            <span style={styles.currentLocSub}>Detect exact GPS location automatically</span>
          </div>
          <ChevronRight size={18} style={{ color: "#94a3b8" }} />
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
                      <Icon size={18} style={{ color: "#ff5200" }} />
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

      {/* Deliver here Button */}
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
              : "Confirm Location"}
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
    flex: 1,
    overflowY: "auto",
    paddingRight: "0.1rem",
  },
  deliverToWrap: {
    marginBottom: "0.5rem",
  },
  deliverToLabel: {
    fontSize: "0.72rem",
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: "0.04em",
    display: "block",
    marginBottom: 4,
  },
  deliverMainRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  deliverTextWrap: {
    flex: 1,
  },
  mainTitle: {
    fontSize: "0.98rem",
    fontWeight: 800,
    color: "#0f172a",
    margin: 0,
    lineHeight: 1.3,
  },
  subTitle: {
    fontSize: "0.78rem",
    color: "#64748b",
    margin: "4px 0 0",
    lineHeight: 1.4,
  },
  editBtn: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  availableBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 10,
    fontSize: "0.74rem",
    fontWeight: 700,
    color: "#065f46",
    marginBottom: "10px",
  },
  saveAddressToggleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    background: "#f5f3ff",
    border: "1px solid #ddd6fe",
    borderRadius: 8,
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#4f46e5",
    cursor: "pointer",
  },
  saveFormContainer: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: "12px",
    marginBottom: "12px",
  },
  labelPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#475569",
    cursor: "pointer",
  },
  labelPillActive: {
    background: "#4f46e5",
    borderColor: "#4f46e5",
    color: "#fff",
  },
  formInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: "0.78rem",
    color: "#0f172a",
    outline: "none",
  },
  cancelSaveBtn: {
    padding: "5px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontSize: "0.74rem",
    fontWeight: 700,
    color: "#64748b",
    cursor: "pointer",
  },
  submitSaveBtn: {
    padding: "5px 14px",
    borderRadius: 8,
    border: "none",
    background: "#4f46e5",
    fontSize: "0.74rem",
    fontWeight: 800,
    color: "#fff",
    cursor: "pointer",
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
    padding: "0.65rem 0.5rem",
    borderRadius: 14,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  orangeIconBadge: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#fff7ed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  currentLocTitle: {
    display: "block",
    fontSize: "0.88rem",
    fontWeight: 800,
    color: "#ff5200",
  },
  currentLocSub: {
    display: "block",
    fontSize: "0.74rem",
    color: "#64748b",
    marginTop: 2,
  },
  savedSection: {
    marginTop: "0.75rem",
  },
  savedSectionTitle: {
    fontSize: "0.72rem",
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: "0.04em",
    display: "block",
    marginBottom: "0.5rem",
  },
  savedList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  savedItemRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0.5rem",
    borderRadius: 12,
    cursor: "pointer",
    border: "1px solid transparent",
  },
  savedItemRowSelected: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
  },
  savedIconBadge: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#fff7ed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  savedItemLabel: {
    display: "block",
    fontSize: "0.88rem",
    fontWeight: 800,
    color: "#0f172a",
  },
  savedItemAddr: {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "#64748b",
    margin: "2px 0 0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  footerWrap: {
    flexShrink: 0,
    paddingTop: "0.75rem",
    borderTop: "1px solid #f1f5f9",
    background: "#fff",
  },
  deliverHereBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "0.85rem 1rem",
    fontWeight: 800,
    fontSize: "1rem",
    border: "none",
    borderRadius: 16,
    boxSizing: "border-box",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  deliverHereBtnActive: {
    background: "#ff5200",
    color: "#fff",
    boxShadow: "0 6px 20px rgba(255,82,0,0.35)",
    cursor: "pointer",
  },
  deliverHereBtnDisabled: {
    background: "#f1f5f9",
    color: "#94a3b8",
    cursor: "not-allowed",
  },
  deliverHereBtnOutOfZone: {
    background: "#fee2e2",
    color: "#dc2626",
    border: "1.5px solid #fca5a5",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(220,38,38,0.15)",
  },
  outOfZoneWarning: {
    padding: "10px 14px",
    background: "#fef2f2",
    border: "1.5px solid #fecaca",
    borderRadius: 14,
    marginBottom: "12px",
  },
  serviceBlockedWarning: {
    padding: "10px 14px",
    background: "#fffbeb",
    border: "1.5px solid #fde68a",
    borderRadius: 14,
    marginBottom: "12px",
  },
}
