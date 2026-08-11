/**
 * AddressBottomSheet.jsx
 * Instamart/Swiggy-style Delivery Location Picker Sheet UI
 */

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MapPin, Home, Briefcase, Star, MoreVertical, Edit2, ChevronRight } from "lucide-react"
import { apiRequest } from "../../../api/client.js"

export function AddressBottomSheet({ address, loading, error, onConfirm, onManualSearch, onUseCurrentLocation, onEditDetails }) {
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedSavedId, setSelectedSavedId] = useState(null)

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await apiRequest('/auth/customer/addresses/')
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setSavedAddresses(res.data)
        } else {
          // No saved addresses from API
          setSavedAddresses([])
        }
      } catch (e) {
        setSavedAddresses([])
      }
    }
    loadSaved()
  }, [])

  const hasAddress = !!address?.formatted_address
  const confirmEnabled = (hasAddress || selectedSavedId) && !loading && !error

  // Format clean primary & secondary location display
  let cleanPrimary = "Detecting location..."
  let cleanSecondary = "Fetching address details..."

  if (hasAddress) {
    const rawParts = (address.formatted_address || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      // Filter out administrative noise (state, country, district labels)
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

    // Ensure we don't show empty secondary
    if (!cleanSecondary.trim()) {
      cleanSecondary = [address.locality, address.city, address.state].filter(Boolean).join(", ")
    }
  }

  const handleConfirmClick = () => {
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

        {/* Deliver to section */}
        <div style={styles.deliverToWrap}>
          <span style={styles.deliverToLabel}>Deliver to</span>

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
              onClick={() => typeof onEditDetails === "function" && onEditDetails()}
              style={styles.editBtn}
              title="Edit address details"
            >
              <Edit2 size={16} style={{ color: "#334155" }} />
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
          <div style={styles.orangeIconBadge}>
            <MapPin size={18} style={{ color: "#ff5200" }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={styles.currentLocTitle}>Use my current location</span>
            <span style={styles.currentLocSub}>Detect my location automatically</span>
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
                    onClick={() => setSelectedSavedId(isSelected ? null : item.id)}
                    style={{
                      ...styles.savedItemRow,
                      ...(isSelected ? styles.savedItemRowSelected : {})
                    }}
                  >
                    <div style={styles.savedIconBadge}>
                      <Icon size={18} style={{ color: "#ff5200" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={styles.savedItemLabel}>{item.label || "Address"}</span>
                      <p style={styles.savedItemAddr}>{displayStr}</p>
                    </div>
                    <button style={styles.moreBtn} onClick={(e) => e.stopPropagation()}>
                      <MoreVertical size={16} style={{ color: "#94a3b8" }} />
                    </button>
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
            ...(confirmEnabled ? styles.deliverHereBtnActive : styles.deliverHereBtnDisabled),
          }}
          onClick={handleConfirmClick}
          disabled={!confirmEnabled}
          whileTap={confirmEnabled ? { scale: 0.98 } : {}}
        >
          Deliver here
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
    fontWeight: 600,
    color: "#64748b",
    display: "block",
    marginBottom: 4,
  },
  deliverMainRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  deliverTextWrap: {
    flex: 1,
  },
  mainTitle: {
    fontSize: "1.08rem",
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.01em",
    margin: "0 0 2px",
  },
  subTitle: {
    fontSize: "0.82rem",
    fontWeight: 500,
    color: "#64748b",
    margin: 0,
    lineHeight: 1.35,
  },
  editBtn: {
    width: 40, height: 40, borderRadius: 16,
    border: "1.5px solid #e2e8f0", background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
  },
  divider: {
    height: 1, background: "#f1f5f9",
    margin: "0.75rem 0",
  },
  currentLocRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "0.5rem 0",
    cursor: "pointer",
  },
  orangeIconBadge: {
    width: 40, height: 40, borderRadius: "50%",
    background: "#fff7ed",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  currentLocTitle: {
    display: "block",
    fontSize: "0.92rem",
    fontWeight: 800,
    color: "#0f172a",
  },
  currentLocSub: {
    display: "block",
    fontSize: "0.76rem",
    fontWeight: 500,
    color: "#64748b",
  },
  savedSection: {
    marginTop: "0.875rem",
  },
  savedSectionTitle: {
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.06em",
    color: "#64748b",
    display: "block",
    marginBottom: "0.625rem",
  },
  savedList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  savedItemRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "0.375rem 0",
    borderRadius: 14,
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  savedItemRowSelected: {
    background: "#fff7ed",
    padding: "0.375rem 0.625rem",
    borderRadius: 14,
    border: "1px solid #fdba74",
  },
  savedIconBadge: {
    width: 40, height: 40, borderRadius: "50%",
    background: "#fff7ed",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  savedItemLabel: {
    display: "block",
    fontSize: "0.92rem",
    fontWeight: 800,
    color: "#0f172a",
  },
  savedItemAddr: {
    fontSize: "0.78rem",
    fontWeight: 500,
    color: "#64748b",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  moreBtn: {
    background: "none",
    border: "none",
    padding: 4,
    cursor: "pointer",
  },
  footerWrap: {
    flexShrink: 0,
    paddingTop: "0.75rem",
    borderTop: "1px solid #f1f5f9",
    background: "#fff",
  },
  deliverHereBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "100%", padding: "0.9rem 1rem",
    fontWeight: 800, fontSize: "1.05rem",
    border: "none", borderRadius: 16,
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
}
