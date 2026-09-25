import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Clock, X, Check, ShieldAlert, Ban, Info } from "lucide-react"
import { apiRequest } from "../../api/client.js"
import { estimationRepository } from "../../services/estimation/estimationRepository.js"

const PRESET_REASONS = [
  "Change of plans / Booked by mistake",
  "Expected faster service / Partner too far",
  "Selected wrong service, date, or address",
  "Found alternative service / Solved myself",
  "Price or payment issue",
  "Other reason (please specify)",
]

export function BookingCancellationModal({
  bookingId,
  requestId,
  isAccepted,
  graceSecondsRemaining = 300,
  trackingToken = "",
  phone = "",
  onClose,
  onCancelled,
}) {
  const [selectedReason, setSelectedReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [remainingSecs, setRemainingSecs] = useState(graceSecondsRemaining)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Live countdown timer for the 5-minute grace period
  useEffect(() => {
    setRemainingSecs(graceSecondsRemaining)
  }, [graceSecondsRemaining])

  useEffect(() => {
    if (!isAccepted || remainingSecs <= 0) return
    const interval = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isAccepted, remainingSecs])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  const isGraceExpired = isAccepted && remainingSecs <= 0
  const isCustom = selectedReason === "Other reason (please specify)"
  const canSubmit =
    !isSubmitting &&
    !isGraceExpired &&
    Boolean(selectedReason) &&
    (!isCustom || customReason.trim().length > 0)

  const handleConfirmCancel = async () => {
    const finalReason = selectedReason === "Other reason (please specify)" ? customReason.trim() : selectedReason
    if (!finalReason.trim()) {
      setErrorMsg("Please select or specify a cancellation reason.")
      return
    }

    if (isGraceExpired) {
      setErrorMsg("The 5-minute grace period has expired. Please contact support.")
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")

    const lookup = requestId || bookingId
    const isEstimation = Boolean(
      (lookup && String(lookup).includes("LOCAL-EST")) ||
      estimationRepository.hasActiveEstimationSync()
    )

    if (isEstimation) {
      try {
        await estimationRepository.cancelEstimationBooking(lookup, finalReason)
        sessionStorage.removeItem("calservice_active_tracking_id")
        const currentSaved = JSON.parse(sessionStorage.getItem("calservice_last_booking") || "{}")
        const updatedBooking = {
          ...currentSaved,
          status: "cancelled",
          booking_status: "cancelled",
          status_display: "Cancelled",
          cancellation_reason: finalReason,
        }
        sessionStorage.setItem("calservice_last_booking", JSON.stringify(updatedBooking))
      } catch (e) {
        console.warn("Estimation cancellation error:", e)
      }
      if (onCancelled) {
        onCancelled({ status: "cancelled", cancellation_reason: finalReason })
      }
      if (onClose) onClose()
      setIsSubmitting(false)
      return
    }

    try {
      let savedObj = {}
      try { savedObj = JSON.parse(sessionStorage.getItem("calservice_last_booking") || "{}") } catch (_) { }
      const urlParams = new URLSearchParams(window.location.search)
      const resolvedToken = trackingToken ||
        savedObj?.tracking_token ||
        urlParams.get("token") ||
        sessionStorage.getItem("active_tracking_token") ||
        sessionStorage.getItem("caltrack_tracking_token") ||
        localStorage.getItem("calservice_customer_token") || "";

      const resolvedPhone = phone ||
        savedObj?.phone ||
        savedObj?.customer_phone ||
        localStorage.getItem("caltrack_customer_phone") || "";

      const payload = {
        reason: finalReason,
      }
      if (resolvedToken) {
        payload.token = resolvedToken
        payload.tracking_token = resolvedToken
      }
      if (resolvedPhone) {
        payload.phone = resolvedPhone
      }

      const tokenQuery = resolvedToken ? `?token=${encodeURIComponent(resolvedToken)}` : ""
      const res = await apiRequest(`/booking/${encodeURIComponent(lookup)}/cancel/${tokenQuery}`, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      try {
        sessionStorage.removeItem("calservice_active_tracking_id")
        sessionStorage.removeItem("calservice_last_booking")
      } catch (e) { }

      if (res?.success || res?.status === "cancelled" || res?.data?.status === "cancelled") {
        if (onCancelled) {
          onCancelled(res.data || { status: "cancelled", cancellation_reason: finalReason })
        }
        if (onClose) onClose()
      } else {
        const errorText = res?.message || res?.detail || res?.error || "Failed to cancel booking."
        setErrorMsg(errorText)
      }
    } catch (err) {
      console.warn("Cancellation API error:", err)
      const errorText = err?.body?.message || err?.body?.detail || err?.message || "Cancellation failed. This booking may have already started or completed."
      setErrorMsg(errorText)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{
          background: "white",
          borderRadius: 24,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem 1rem",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={24} color="#dc2626" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                Cancel Booking
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Booking ID: <strong style={{ color: "#0f172a" }}>#{requestId || bookingId}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Policy Information Box */}
          {!isAccepted ? (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 14,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: "0.82rem",
                color: "#166534",
                fontWeight: 600,
              }}
            >
              <Info size={18} color="#16a34a" style={{ flexShrink: 0 }} />
              <div>
                <strong>Free cancellation available anytime</strong> before a service professional accepts your booking.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: isGraceExpired ? "#fef2f2" : "#fffbeb",
                border: `1px solid ${isGraceExpired ? "#fecaca" : "#fde68a"}`,
                borderRadius: 14,
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Clock size={20} color={isGraceExpired ? "#dc2626" : "#d97706"} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: isGraceExpired ? "#991b1b" : "#92400e" }}>
                  {isGraceExpired ? "Grace Period Expired" : "5-Minute Free Cancellation Window"}
                </div>
                <div style={{ fontSize: "0.78rem", color: isGraceExpired ? "#b91c1c" : "#b45309", marginTop: 2 }}>
                  {isGraceExpired ? (
                    "The 5-minute cancellation window after job acceptance has passed. Please contact our 24/7 support line for emergency cancellation."
                  ) : (
                    <span>
                      You have <strong style={{ fontFamily: "monospace", fontSize: "0.95rem" }}>{formatTime(remainingSecs)}</strong> remaining to cancel with 100% full waiver.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reason Selection Title */}
          <div>
            <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
              Select Reason for Cancellation <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Please tell us why you are cancelling to help us improve our service.
            </span>
          </div>

          {/* Reason Options List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PRESET_REASONS.map((reason) => {
              const isSelected = selectedReason === reason
              return (
                <div
                  key={reason}
                  data-testid={`cancel-reason-${reason}`}
                  onClick={() => {
                    if (isGraceExpired) return
                    setSelectedReason(reason)
                    setErrorMsg("")
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${isSelected ? "#3b82f6" : "#e2e8f0"}`,
                    background: isSelected ? "rgba(59, 130, 246, 0.05)" : "#f8fafc",
                    cursor: isGraceExpired ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: `2px solid ${isSelected ? "#3b82f6" : "#cbd5e1"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isSelected ? "#3b82f6" : "white",
                    }}
                  >
                    {isSelected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
                  </div>
                  <span
                    style={{
                      fontSize: "0.84rem",
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "#0f172a" : "#334155",
                    }}
                  >
                    {reason}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Custom Reason Textarea */}
          {selectedReason === "Other reason (please specify)" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <textarea
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value)
                  setErrorMsg("")
                }}
                disabled={isGraceExpired}
                placeholder="Please describe your reason for cancellation in detail..."
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.84rem",
                  fontFamily: "inherit",
                  resize: "none",
                  outline: "none",
                }}
              />
            </motion.div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertTriangle size={15} color="#dc2626" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "1rem 1.5rem 1.25rem",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: 10,
            background: "#fafafa",
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: "#e2e8f0",
              color: "#334155",
              fontWeight: 700,
              fontSize: "0.85rem",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            Keep Booking
          </button>

          {isGraceExpired ? (
            <a
              href="tel:1800123456"
              style={{
                flex: 1.3,
                padding: "0.75rem",
                background: "#0f172a",
                color: "white",
                fontWeight: 800,
                fontSize: "0.85rem",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "center",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              Call Customer Care
            </a>
          ) : (
            <button
              type="button"
              id="btn-confirm-cancellation"
              onClick={handleConfirmCancel}
              disabled={!canSubmit}
              style={{
                flex: 1.3,
                padding: "0.75rem",
                background: canSubmit ? "#dc2626" : "#cbd5e1",
                color: "white",
                fontWeight: 800,
                fontSize: "0.85rem",
                border: "none",
                borderRadius: 12,
                cursor: canSubmit ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: canSubmit ? "0 4px 12px rgba(220, 38, 38, 0.3)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              <Ban size={15} />
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
