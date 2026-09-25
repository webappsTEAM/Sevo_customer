/**
 * CustomerTrackingPage.jsx
 * Canonical, Rapido-Style Customer Live Tracking Page for CalTrack.
 */

import React, { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Phone, MessageSquare, CheckCircle2, Clock, MapPin,
  Star, RefreshCw, KeyRound, Bike, Copy, Check,
  Wrench, WifiOff, Shield, Home, Send, Truck, Share2, Ban
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { useCustomerTracking } from "./useCustomerTracking.js"
import { CustomerTrackingMap } from "./CustomerTrackingMap.jsx"
import { CustomerTrackingHeader } from "./CustomerTrackingHeader.jsx"
import { CustomerTrackingStatusCard } from "./CustomerTrackingStatusCard.jsx"
import { getFreshnessBadge } from "./trackingUtils.js"
import "../../pages/LiveTrackingPage.css"

const STATUS_LABEL_MAP = {
  new_request: "Booking Received",
  confirmed: "Booking Confirmed",
  reviewed: "Booking Reviewed",
  assigned: "Technician Assigned",
  accepted: "Technician Assigned",
  on_the_way: "On The Way",
  en_route: "On The Way",
  arrived: "Technician Arrived",
  in_progress: "Service In Progress",
  completed: "Service Completed",
  closed: "Service Completed",
  feedback_pending: "Service Completed",
  feedback_received: "Feedback Received",
  cancelled: "Booking Cancelled",
  rejected: "Booking Declined",
  // X-03: the vendor app writes "redispatching" directly into this booking's
  // shared status column when a technician cancels/is reassigned off the
  // job -- without this entry it fell through to the ev.to_status || raw
  // string fallback and customers briefly saw the literal word
  // "redispatching" in their booking history instead of a real label.
  redispatching: "Finding You a New Technician",
}

const TIMELINE_STEPS = [
  { label: "Booking Confirmed", emoji: "📋" },
  { label: "Technician Assigned", emoji: "👤" },
  { label: "On The Way", emoji: "🛵" },
  { label: "Technician Arrived", emoji: "📍" },
  { label: "Service In Progress", emoji: "🔧" },
  { label: "Service Completed", emoji: "🎉" },
]

// Porter-equivalent Logistics Lifecycle Timeline
const LOGISTICS_TIMELINE_STEPS = [
  { label: "Booking Confirmed", emoji: "📋" },
  { label: "Driver Assigned", emoji: "🚛" },
  { label: "En Route to Pickup", emoji: "🛣️" },
  { label: "Arrived at Pickup", emoji: "📍" },
  { label: "Goods In Transit", emoji: "📦" },
  { label: "Goods Delivered", emoji: "✅" },
]

function getTimelineIdx(s, isLogistics = false, logisticsLeg = "") {
  s = (s || "").toLowerCase()
  const leg = (logisticsLeg || "").toUpperCase()
  if (isLogistics) {
    if (leg === "DELIVERED" || ["completed", "closed", "feedback_pending", "feedback_received"].includes(s)) return 5
    if (["EN_ROUTE_DROP", "IN_TRANSIT", "ARRIVED_DROP", "UNLOADING", "REASSEMBLY", "UNPACKING"].includes(leg)) return 4
    if (["ARRIVED_PICKUP", "LOADING", "PACKING", "DISMANTLING"].includes(leg) || s === "arrived") return 3
    if (["EN_ROUTE_PICKUP", "TEAM_EN_ROUTE"].includes(leg) || ["on_the_way", "en_route"].includes(s)) return 2
    if (["assigned", "accepted"].includes(s) || leg === "ASSIGNED") return 1
    return 0
  }
  if (["assigned", "accepted"].includes(s)) return 1
  if (["on_the_way", "en_route"].includes(s)) return 2
  if (s === "arrived") return 3
  if (s === "in_progress") return 4
  if (["completed", "closed", "feedback_pending", "feedback_received"].includes(s)) return 5
  return 0
}

export function CustomerTrackingPage({
  bookingId: propBookingId,
  jobId: propJobId,
  trackingToken: propTrackingToken,
  isModal = false,
  onClose,
} = {}) {
  const params = useParams() || {}
  const bookingId = propBookingId || params.bookingId
  const jobId = propJobId || params.jobId
  const token = propTrackingToken || params.token
  const activeIdentifier = bookingId || jobId
  const [searchParams] = useSearchParams()
  const trackingToken = propTrackingToken || searchParams.get("token") || token || null

  const {
    data,
    loading,
    errorKind,
    online,
    connectionState,
    lastUpdated,
    refresh,
  } = useCustomerTracking({ bookingId, jobId, trackingToken })

  const [copiedOtp, setCopiedOtp] = useState(false)
  const [copiedPayOtp, setCopiedPayOtp] = useState(false)

  // Quotation Management State
  const [showDeclineReasonModal, setShowDeclineReasonModal] = useState(false)
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false)
  const [changeNotes, setChangeNotes] = useState("")
  const [declineReasonCode, setDeclineReasonCode] = useState("")
  const [declineReasonNotes, setDeclineReasonNotes] = useState("")
  const [quoteExpanded, setQuoteExpanded] = useState(true)
  const [expandedPrevQuotes, setExpandedPrevQuotes] = useState({})

  const handleQuoteDecision = async (decision, reasonCode = "", reasonNotes = "") => {
    try {
      const quoteToken = data?.quote?.decision_token || data?.quote?.customer_decision_token || data?.quote?.quote_number
      if (!quoteToken) return

      const response = await fetch(`/api/booking/quote/${quoteToken}/decide/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          action: decision === "CUSTOMER_ACCEPTED" ? "ACCEPT" : decision === "CHANGE_REQUESTED" ? "REQUEST_CHANGES" : "DECLINE",
          reason_code: reasonCode,
          reason_notes: reasonNotes,
          notes: reasonNotes,
          reason: reasonCode || reasonNotes,
          customer_notes: reasonNotes,
          decline_reason: reasonNotes,
        })
      })
      const result = await response.json().catch(() => ({}))
      if (response.ok || result.success) {
        const actionText = decision === "CUSTOMER_ACCEPTED" ? "accepted" : decision === "CHANGE_REQUESTED" ? "re-quotation requested" : "declined"
        alert(`Quotation ${actionText} successfully!`)
        if (typeof refresh === "function") refresh()
        else window.location.reload()
      } else {
        alert("Error saving quote decision: " + (result.message || result.error || "Unknown error"))
      }
    } catch (err) {
      console.error("Quote decision failed:", err)
      alert("Connection to server failed. Please try again.")
    }
  }

  // X-09: in-app chat. Polling-based (see BookingMessage's docstring on
  // the backend for why) -- only attempted once technician assignment is
  // known (isAccepted below), and silently disabled if the viewer isn't
  // authenticated as the booking's owner (e.g. an anonymous tracking-link
  // visitor) rather than showing a broken/erroring panel.
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatSending, setChatSending] = useState(false)
  const [chatUnavailable, setChatUnavailable] = useState(false)
  const chatEndRef = useRef(null)

  const status = (data?.status || "").toLowerCase()
  // "assigned" deliberately excluded unless technician identity is available
  const isAccepted = Boolean(
    data?.is_accepted ||
    data?.technician_accepted ||
    data?.technician?.name ||
    data?.technician_name ||
    data?.assigned_employee?.name ||
    [
      "accepted", "on_the_way", "en_route", "arrived", "service_started",
      "in_progress", "on_hold", "proof_submitted", "payment_pending",
      "cash_pending", "waiting_for_payment", "settling", "completed", "closed"
    ].includes(status)
  )
  const isCancelled = status === "cancelled" || status === "rejected"
  const isLogistics = Boolean(
    data?.logistics?.leg ||
    data?.service_category?.toLowerCase().includes("goods") ||
    data?.service_category?.toLowerCase().includes("truck") ||
    data?.service_category?.toLowerCase().includes("two_wheeler") ||
    data?.service_category?.toLowerCase().includes("packers") ||
    data?.service_category?.toLowerCase().includes("transport")
  )
  const isTwoWheeler = Boolean(data?.service_category?.toLowerCase().includes("two_wheeler"))
  const logisticsLeg = (data?.logistics?.leg || "").toUpperCase()
  const activeTimelineSteps = isLogistics ? LOGISTICS_TIMELINE_STEPS : TIMELINE_STEPS
  const tlIdx = getTimelineIdx(status, isLogistics, logisticsLeg)
  const isArrived = status === "arrived"
  const isInProgress = status === "in_progress"
  const isCompleted = ["completed", "closed", "feedback_pending", "feedback_received"].includes(status)

  // X-09: chat is meaningful once there's a technician to talk to, and
  // stays available through completion (e.g. "thanks, forgot my umbrella")
  // but not once the booking is cancelled/rejected.
  const chatAllowed = isAccepted && !isCancelled
  const chatBookingId = data?.booking_id

  useEffect(() => {
    if (!chatAllowed || !chatBookingId || chatUnavailable) return
    let cancelled = false
    const fetchMessages = () => {
      const q = trackingToken ? `?token=${encodeURIComponent(trackingToken)}` : ""
      apiRequest(`/booking/${chatBookingId}/messages/${q}`, { method: "GET" })
        .then((res) => {
          if (cancelled) return
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.results) ? res.results : [])
          setChatMessages(list)
        })
        .catch((err) => {
          // 401/403 -> viewer isn't authenticated as this booking's owner
          // (e.g. an anonymous tracking-link visitor). Hide the panel
          // rather than show a permanently-erroring one.
          if (!cancelled && (err?.status === 401 || err?.status === 403)) {
            setChatUnavailable(true)
          }
        })
    }
    fetchMessages()
    const interval = setInterval(fetchMessages, 10000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [chatAllowed, chatBookingId, chatUnavailable, trackingToken])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [chatMessages.length])

  const handleSendChat = async () => {
    const body = chatInput.trim()
    if (!body || chatSending || !chatBookingId) return
    setChatSending(true)
    const q = trackingToken ? `?token=${encodeURIComponent(trackingToken)}` : ""
    try {
      await apiRequest(`/booking/${chatBookingId}/messages/${q}`, { method: "POST", json: { body, token: trackingToken } })
      setChatInput("")
      const res = await apiRequest(`/booking/${chatBookingId}/messages/${q}`, { method: "GET" })
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.results) ? res.results : [])
      setChatMessages(list)
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) setChatUnavailable(true)
    } finally {
      setChatSending(false)
    }
  }

  const vendorName = data?.vendor?.name || ""
  const rawTechName = data?.assigned_employee?.name || data?.technician?.name || data?.technician_name || ""
  const techName = React.useMemo(() => {
    if (!rawTechName) return isAccepted ? "Assigned Service Professional" : ""
    const trimmed = rawTechName.trim()
    const slugMatch = (data?.service_category || "").toLowerCase().replace(/[\s_-]+/g, "")
    const nameSlug = trimmed.toLowerCase().replace(/[\s_-]+/g, "")
    if (nameSlug === slugMatch) {
      return "Assigned Service Professional"
    }
    return trimmed
  }, [rawTechName, isAccepted, data?.service_category])
  const techPhone = data?.assigned_employee?.phone || data?.technician?.phone || ""
  const techPhoto = data?.assigned_employee?.photo || data?.technician?.photo || null
  const techRating = data?.assigned_employee?.rating ?? data?.technician?.rating ?? null
  const techJobs = data?.assigned_employee?.jobs_completed ?? data?.technician?.jobs_completed ?? null
  const startOtp = data?.start_otp || null

  const etaMins = data?.technician?.eta_minutes ?? data?.eta_minutes ?? null
  const distKm = data?.technician?.distance_km ?? data?.distance_km ?? null
  const freshness = data?.freshness || "LIVE"
  const paymentConfirmationOtp = data?.payment_confirmation_otp || null

  const copyOtp = () => {
    if (!startOtp || !navigator.clipboard) return
    navigator.clipboard.writeText(startOtp)
    setCopiedOtp(true)
    setTimeout(() => setCopiedOtp(false), 2000)
  }

  const copyPayOtp = () => {
    if (!paymentConfirmationOtp || !navigator.clipboard) return
    navigator.clipboard.writeText(paymentConfirmationOtp)
    setCopiedPayOtp(true)
    setTimeout(() => setCopiedPayOtp(false), 2000)
  }

  const openWA = () => {
    if (!techPhone) return
    const msg = encodeURIComponent(
      `Hi ${techName}, following up on Sevo booking #${data?.request_id || activeIdentifier}.`
    )
    window.open(`https://wa.me/91${techPhone.replace(/\D/g, "")}?text=${msg}`, "_blank")
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="ltp-fullscreen ltp-center" style={{ minHeight: isModal ? "450px" : "100vh" }}>
          <div className="ltp-spinner" />
          <p className="ltp-loading-text">Connecting to technician live telemetry…</p>
        </div>
      )
    }

    if (errorKind && !data) {
      const msgs = {
        not_found: {
          icon: "🔗",
          title: "Booking Not Found",
          body: "We couldn't locate this booking or the tracking session has expired.",
        },
        unauthorized: {
          icon: "🔒",
          title: "Access Unauthorized",
          body: "You do not have permission to access this tracking link.",
        },
        no_id: {
          icon: "📋",
          title: "No Booking Identified",
          body: "No booking ID was specified. Please access via the link sent in your confirmation SMS.",
        },
        fetch_failed: {
          icon: "⚠️",
          title: "Tracking Unavailable",
          body: "Unable to retrieve real-time tracking at this moment. Please check your connection.",
        },
      }
      const m = msgs[errorKind] || { icon: "⚠️", title: "Error", body: "Something went wrong." }
      return (
        <div className="ltp-fullscreen ltp-center" style={{ minHeight: isModal ? "450px" : "100vh" }}>
          <motion.div className="ltp-error-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="ltp-error-emoji">{m.icon}</div>
            <h2 className="ltp-error-title">{m.title}</h2>
            <p className="ltp-error-body">{m.body}</p>
            {!trackingToken && (
              <p className="ltp-error-hint">
                <Shield size={13} /> Secure tracking requires a valid authentication token or customer login.
              </p>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
              <button className="ltp-retry-btn" onClick={refresh}>
                <RefreshCw size={14} /> Try Again
              </button>
              {isModal && onClose && (
                <button className="ltp-retry-btn" style={{ background: "#64748b" }} onClick={onClose}>
                  Close
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )
    }

    if (isCompleted && data) {
      return (
        <div className="ltp-fullscreen ltp-center" style={{ minHeight: isModal ? "450px" : "100vh" }}>
          <motion.div className="ltp-error-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="ltp-error-emoji">🎉</div>
            <h2 className="ltp-error-title" style={{ color: "#047857" }}>{isLogistics ? "Goods Delivered" : "Service Completed"}</h2>
            <p className="ltp-error-body">Your {isLogistics ? "consignment" : "service request"} <strong>#{data.request_id || activeIdentifier}</strong> has been {isLogistics ? "delivered" : "finished"} successfully.</p>
            {data.issue_title && <p className="ltp-error-body" style={{ color: "#64748b", fontSize: "0.85rem" }}>{data.issue_title}</p>}
            {techName && (
              <div style={{ margin: "14px 0", padding: "10px 14px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0", textAlign: "left" }}>
                <div style={{ fontSize: "0.72rem", color: "#047857", fontWeight: 700, textTransform: "uppercase" }}>{isLogistics ? "Delivered By" : "Serviced By"}</div>
                <div style={{ fontSize: "0.92rem", color: "#065f46", fontWeight: 800 }}>👤 {techName} {vendorName ? `(${vendorName})` : ""}</div>
              </div>
            )}
            <p className="ltp-error-hint" style={{ color: "#047857", marginBottom: 14 }}>Thank you for choosing Sevo!</p>
            <button
              className="ltp-retry-btn"
              style={{ background: "#059669", borderColor: "#059669", width: "100%", justifyContent: "center" }}
              onClick={isModal && onClose ? onClose : () => window.location.href = "/"}
            >
              <Home size={14} /> {isModal ? "Close Window" : (isLogistics ? "Book Another Delivery" : "Book Another Service")}
            </button>
          </motion.div>
        </div>
      )
    }

    if (isCancelled && data) {
      return (
        <div className="ltp-fullscreen ltp-center" style={{ minHeight: isModal ? "450px" : "100vh" }}>
          <motion.div className="ltp-error-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="ltp-error-emoji">❌</div>
            <h2 className="ltp-error-title">Booking Cancelled</h2>
            <p className="ltp-error-body">Your booking <strong>#{data.request_id || activeIdentifier}</strong> has been cancelled.</p>
            {data.issue_title && <p className="ltp-error-body" style={{ color: "#64748b", fontSize: "0.85rem" }}>{data.issue_title}</p>}
            <p className="ltp-error-hint" style={{ color: "#64748b", marginBottom: 14 }}>If any advance payment was made, your full refund will be processed within 2–4 business days.</p>
            <button
              className="ltp-retry-btn"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={isModal && onClose ? onClose : () => window.location.href = "/"}
            >
              <Home size={14} /> {isModal ? "Close Window" : "Return to Home"}
            </button>
          </motion.div>
        </div>
      )
    }

    return (
      <div className="ltp-root">
        {/* ── Top Header ── */}
        <CustomerTrackingHeader
          requestId={data?.request_id || activeIdentifier}
          trackingToken={trackingToken || data?.tracking_token}
          serviceCategory={data?.service_category}
          issueTitle={data?.issue_title}
          freshness={freshness}
          status={status}
          connectionState={connectionState}
          online={online}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
          onClose={onClose}
          isModal={isModal}
          isLogistics={isLogistics}
        />

        {/* ── Main Body ── */}
        <main className="ltp-body">
          {/* Left: Map Section (Visually Dominant) */}
          <section className="ltp-map-section" aria-label="Live technician tracking map">
            <CustomerTrackingMap
              technician={data?.technician}
              technicianLocation={data?.technician_location}
              destination={data?.destination || data?.service_location}
              serviceCategory={data?.service_category}
              issueTitle={data?.issue_title}
              status={status}
              freshness={freshness}
              etaMinutes={etaMins}
              distanceKm={distKm}
              startOtp={startOtp}
              vendorName={vendorName}
              requestId={data?.request_id || activeIdentifier}
            />

            {/* Unified Floating Overlay Card */}
            <CustomerTrackingStatusCard
              data={data}
              status={status}
              etaMinutes={etaMins}
              distanceKm={distKm}
              connectionState={connectionState}
              online={online}
            />
          </section>

          {/* Right: Booking Details Panel */}
          <aside className="ltp-panel" aria-label="Booking details">
            {/* ─────────────────── ACTIVE QUOTE DECISION CARD (PHASE 3) ─────────────────── */}
            {data?.quote && (data.quote.id || data.quote.quote_id || data.quote.quote_number) && data.quote.has_quote !== false && (() => {
              const q = data.quote
              const qStatus = String(q.status || "").toUpperCase()
              const isQuoteAccepted = ["CUSTOMER_ACCEPTED", "APPROVED", "CONVERTED", "ACCEPTED", "ADMIN_APPROVED"].includes(qStatus)
              const isChangesRequested = ["CHANGE_REQUESTED", "CHANGES_REQUESTED", "REQUESTED_CHANGES", "REQUOTE", "RE_QUOTE"].includes(qStatus)
              const isDeclined = ["DECLINED", "CUSTOMER_DECLINED", "REJECTED", "ADMIN_REJECTED", "CANCELLED", "EXPIRED"].includes(qStatus)
              const isPending = [
                "SENT", "SENT_TO_CUSTOMER", "PENDING", "PENDING_APPROVAL", "PENDING_REVIEW", 
                "PENDING REVIEW", "PENDING_ADMIN_REVIEW", "PENDING ADMIN REVIEW", 
                "AWAITING_CUSTOMER", "AWAITING_APPROVAL", "QUOTATION_SENT", "QUOTE_SENT", 
                "DRAFT", "VIEWED", "NEW", "OPEN"
              ].includes(qStatus) || (!isQuoteAccepted && !isChangesRequested && !isDeclined)
              
              const totalEst = q.grand_total || q.total_amount || q.net_payable || 0
              const itemsList = Array.isArray(q.items) ? q.items : []
              const measurementsList = Array.isArray(q.measurements) ? q.measurements : []
              const totalArea = q.total_paintable_area || q.total_area || measurementsList.reduce((acc, m) => acc + (Number(m.final_area || m.calculated_area || 0)), 0)

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: '1.25rem',
                    marginBottom: '12px',
                    boxShadow: '0 8px 30px rgba(79, 70, 229, 0.12)',
                    border: `2px solid ${isPending ? "#4F46E5" : isQuoteAccepted ? "#10B981" : isChangesRequested ? "#F59E0B" : "#EF4444"}`,
                  }}
                >
                  {/* Header: Title, Number, Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Quotation Details
                        </span>
                        {q.quote_number && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 6, fontFamily: 'monospace' }}>
                            #{q.quote_number} {q.quote_version > 1 ? `(v${q.quote_version})` : ''}
                          </span>
                        )}
                      </div>
                      <h3 style={{ margin: '4px 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                        Total Estimate: ₹{totalEst}
                      </h3>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontWeight: 800,
                      background: isPending ? "#EFF6FF" : isQuoteAccepted ? "#ECFDF5" : isChangesRequested ? "#FFFBEB" : "#FEF2F2",
                      color: isPending ? "#1E40AF" : isQuoteAccepted ? "#065F46" : isChangesRequested ? "#92400E" : "#991B1B"
                    }}>
                      {isPending ? "Pending Your Approval" : isQuoteAccepted ? "Accepted / Approved" : isChangesRequested ? "Changes Requested" : isDeclined ? "Declined" : qStatus.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Quick Meta Specs */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, fontSize: '0.76rem', color: '#475569' }}>
                    {q.valid_until && (
                      <span style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color="#64748b" /> Valid till: <strong>{new Date(q.valid_until).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                      </span>
                    )}
                    {totalArea > 0 && (
                      <span style={{ background: '#f0fdf4', color: '#166534', padding: '3px 8px', borderRadius: 6, border: '1px solid #bbf7d0', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        📐 Total Area: <strong>{totalArea} sq.ft</strong>
                      </span>
                    )}
                    {q.property_type && (
                      <span style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        🏠 <strong>{q.property_type}</strong>
                      </span>
                    )}
                    {q.warranty && (
                      <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: 6, border: '1px solid #a7f3d0', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        🛡️ <strong>{q.warranty}</strong>
                      </span>
                    )}
                  </div>

                  {/* Status alert message */}
                  {(isQuoteAccepted || isChangesRequested || isDeclined) && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      marginBottom: 10,
                      textAlign: 'left',
                      background: isQuoteAccepted ? "#F0FDF4" : isChangesRequested ? "#FFFBEB" : "#FEF2F2",
                      border: `1px solid ${isQuoteAccepted ? "#DCFCE7" : isChangesRequested ? "#FEF3C7" : "#FEE2E2"}`,
                      color: isQuoteAccepted ? "#15803D" : isChangesRequested ? "#B45309" : "#C2410C",
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      {isQuoteAccepted && "✓ You have accepted this quotation. Your service booking is scheduled."}
                      {isChangesRequested && `⚠ Changes requested: "${q.customer_notes || 'Please adjust quotation items & measurements'}"`}
                      {isDeclined && `✗ You declined this quotation: "${q.customer_decline_reason || q.decline_reason || 'Declined by customer'}"`}
                    </div>
                  )}

                  {/* Room Measurements Breakdown */}
                  {measurementsList.length > 0 && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 10, background: '#fafafa' }}>
                      <div style={{ padding: '6px 10px', background: '#f1f5f9', fontWeight: 800, fontSize: '0.75rem', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                        <span>📐 Room Measurements</span>
                        <span style={{ color: '#4F46E5' }}>Total: {totalArea} sq.ft</span>
                      </div>
                      <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {measurementsList.map((m, mIdx) => (
                          <div key={m.id || mIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                            <span>
                              <strong>{m.area_name || `Area ${mIdx + 1}`}</strong>
                              {m.length && m.width ? ` (${m.length}×${m.width}ft)` : ''}
                            </span>
                            <span style={{ fontWeight: 800 }}>{m.final_area || m.calculated_area} sq.ft</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Line Items Breakdown */}
                  <div style={{ border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                    <button
                      onClick={() => setQuoteExpanded(!quoteExpanded)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        color: '#0f172a'
                      }}
                    >
                      <span>{quoteExpanded ? "Hide Line Items" : "View Line Items & Breakdown"} ({itemsList.length} items)</span>
                      <span>{quoteExpanded ? "▲" : "▼"}</span>
                    </button>

                    {quoteExpanded && (
                      <div style={{ padding: '8px 12px', background: 'white', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {itemsList.map((item, idx) => {
                          const itemName = item.name || item.description || item.category || "Quotation Item"
                          const qty = Number(item.quantity) || 1
                          const unit = item.unit || 'sq.ft'
                          const rate = item.final_rate ?? item.unit_price ?? item.proposed_rate ?? item.base_rate ?? item.price ?? 0
                          const itemTotalAmount = item.total_amount ?? item.amount ?? (rate * qty)
                          return (
                            <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0f172a' }}>{itemName}</div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{qty} {unit} × ₹{rate}/{unit}</div>
                              </div>
                              <div style={{ fontWeight: 900, color: '#0f172a' }}>₹{itemTotalAmount}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* PDF Download link */}
                  <div style={{ marginBottom: 10 }}>
                    <a
                      href={`/api/booking/quote/${encodeURIComponent(q.decision_token || q.customer_decision_token || q.raw_quote_number || q.quote_number || q.quote_id)}/pdf/?download=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`Quotation_${q.raw_quote_number || q.quote_number || 'Quotation'}.pdf`}
                      style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4F46E5', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                    >
                      📄 Download PDF Quotation
                    </a>
                  </div>

                  {/* Action Buttons: Accept Quote / Request Changes / Decline */}
                  {isPending && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      <button
                        onClick={() => handleQuoteDecision("CUSTOMER_ACCEPTED")}
                        style={{
                          flex: '1.2 1 120px',
                          padding: '9px 12px',
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          border: 'none',
                          borderRadius: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <Check size={14} /> Accept Quote
                      </button>
                      <button
                        onClick={() => setShowRequestChangesModal(true)}
                        style={{
                          flex: '1 1 100px',
                          padding: '9px 12px',
                          background: '#fffbeb',
                          color: '#92400e',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          border: '1px solid #fde68a',
                          borderRadius: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <MessageSquare size={14} /> Request Changes
                      </button>
                      <button
                        onClick={() => setShowDeclineReasonModal(true)}
                        style={{
                          flex: '0.8 1 80px',
                          padding: '9px 12px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          border: '1px solid #fecaca',
                          borderRadius: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <Ban size={14} /> Decline
                      </button>
                    </div>
                  )}
                </motion.div>
              )
            })()}

            {/* Cash Payment Confirmation OTP Card */}
            {paymentConfirmationOtp && !isCancelled && (
              <div
                className="ltp-card ltp-otp-card"
                style={{
                  background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
                  border: "1.5px solid #10b981",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
                  marginBottom: "12px",
                }}
              >
                <div className="ltp-otp-left">
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <KeyRound size={18} color="#059669" />
                  </div>
                  <div>
                    <div className="ltp-otp-label" style={{ color: "#065f46" }}>CASH PAYMENT CONFIRMATION OTP</div>
                    <div className="ltp-otp-hint" style={{ color: "#047857" }}>
                      Technician reported cash collection. Share this 6-digit OTP with your technician to verify payment and complete the job.
                    </div>
                  </div>
                </div>
                <button
                  className="ltp-otp-val"
                  onClick={copyPayOtp}
                  aria-label="Copy Payment OTP"
                  title="Click to copy"
                  style={{
                    background: "#ffffff",
                    color: "#047857",
                    borderColor: "#a7f3d0",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.06)",
                    letterSpacing: "3px",
                  }}
                >
                  {paymentConfirmationOtp}
                  {copiedPayOtp ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                </button>
              </div>
            )}

            {/* Work / Pickup Start OTP Card */}
            {isAccepted && startOtp && !isCancelled && (
              <div className={`ltp-card ltp-otp-card ${isArrived ? "highlight-arrived" : ""}`}>
                <div className="ltp-otp-left">
                  <KeyRound size={18} color="#ea580c" />
                  <div>
                    <div className="ltp-otp-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{isLogistics ? "PICKUP OTP" : "WORK START OTP"}</span>
                      {isCompleted && (
                        <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#15803d", background: "#dcfce7", padding: "1px 6px", borderRadius: 4 }}>✓ Verified</span>
                      )}
                    </div>
                    <div className="ltp-otp-hint">
                      {isCompleted
                        ? (isLogistics ? "Goods loading verification code (verified)" : "Service commencement code (verified)")
                        : (isLogistics ? "Share this code with the driver at pickup site to load goods" : "Share this code with technician to begin service")}
                    </div>
                  </div>
                </div>
                <button className="ltp-otp-val" onClick={copyOtp} aria-label="Copy OTP" title="Click to copy">
                  {startOtp}
                  {copiedOtp ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                </button>
              </div>
            )}

            {/* Assigned Technician & Vendor Card */}
            {isAccepted ? (
              <motion.div className="ltp-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="ltp-vendor-row">
                  <div>
                    <div className="ltp-vendor-label">{isLogistics ? "Transport Partner" : "Service Provider"}</div>
                    <div className="ltp-vendor-name">🏢 {vendorName}</div>
                  </div>
                  <span className="ltp-verified">{isLogistics ? "✓ Verified Driver" : "✓ Verified Vendor"}</span>
                </div>

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
                      <span className="ltp-partner-name">{techName || (isLogistics ? "Commercial Driver" : "Service Partner")}</span>
                      <span className="ltp-verified">{isLogistics ? "✓ Professional" : "✓ Professional"}</span>
                    </div>
                    <div className="ltp-partner-meta">
                      {techRating != null ? (
                        <span className="ltp-rating"><Star size={12} fill="#d97706" color="#d97706" /> {Number(techRating).toFixed(1)}</span>
                      ) : (
                        <span className="ltp-rating" style={{ color: "#64748b" }}>New partner</span>
                      )}
                      {techJobs != null && (
                        <span className="ltp-meta-dim">
                          • {techJobs}+ jobs completed
                        </span>
                      )}
                    </div>
                    <div className="ltp-tech-pills">
                      <span className="ltp-tech-id-pill">
                        {data?.technician?.job_id || `Ref #${data?.request_id || activeIdentifier}`}
                      </span>
                      {(data?.vehicle_number || data?.technician?.vehicle_number) && (
                        <span className="ltp-tech-id-pill" style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a", fontWeight: 700 }}>
                          🚛 {data?.vehicle_number || data?.technician?.vehicle_number}
                        </span>
                      )}
                      <span className={`ltp-tech-status-pill ${status}`}>
                        {isLogistics
                          ? (isCompleted ? "✅ Delivered" : status === "proof_submitted" ? "📄 Proof Submitted" : isArrived ? "📍 At Pickup" : isInProgress ? "📦 In Transit" : "🛣️ En Route")
                          : (isArrived ? "📍 Arrived At Site" : isInProgress ? "🔧 In Progress" : status === "proof_submitted" ? "📄 Proof Submitted" : isCompleted ? "✅ Completed" : "🛵 On The Way")
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ltp-action-row">
                  {techPhone ? (
                    <a href={`tel:${techPhone}`} className="ltp-btn green" aria-label="Call technician">
                      <Phone size={14} /> {isLogistics ? "Call Driver" : "Call Partner"}
                    </a>
                  ) : (
                    <span className="ltp-btn disabled" aria-disabled="true"><Phone size={14} /> Call Unavailable</span>
                  )}
                  {techPhone && (
                    <button className="ltp-btn outline" onClick={openWA} aria-label="WhatsApp technician">
                      <MessageSquare size={14} color="#25D366" /> {isLogistics ? "WhatsApp Driver" : "WhatsApp"}
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="ltp-card ltp-waiting-card">
                <div className="ltp-radar-wrap">
                  <motion.div className="ltp-radar-ring r1" animate={{ scale: [1, 1.8, 2.4], opacity: [0.5, 0.15, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }} />
                  <motion.div className="ltp-radar-ring r2" animate={{ scale: [1, 1.5, 2.0], opacity: [0.6, 0.25, 0] }} transition={{ repeat: Infinity, duration: 2.4, delay: 0.8, ease: "easeOut" }} />
                  <div className="ltp-radar-center">{isTwoWheeler ? <Bike size={24} color="white" /> : isLogistics ? <Truck size={24} color="white" /> : <Bike size={24} color="white" />}</div>
                </div>
                <div className="ltp-waiting-info">
                  <div className="ltp-waiting-title">{isLogistics ? "Finding your driver…" : "Finding your professional…"}</div>
                  <div className="ltp-waiting-sub">{isLogistics ? "Searching nearby verified commercial vehicles in your area" : "Searching nearby verified service pros in your area"}</div>
                  <div className="ltp-waiting-confirm-tag">✓ Booking Confirmed</div>
                </div>
              </div>
            )}

            {/* Compact Status Timeline */}
            <div className="ltp-card">
              <div className="ltp-sec-title">{isLogistics ? "Trip Lifecycle Status" : "Service Lifecycle Status"}</div>
              <div className="ltp-timeline">
                {activeTimelineSteps.map((step, i) => {
                  const done = tlIdx > i
                  const active = tlIdx === i
                  const last = i === activeTimelineSteps.length - 1
                  return (
                    <div key={i} className="ltp-tl-row">
                      <div className="ltp-tl-col">
                        <div className={`ltp-tl-dot ${done ? "done" : active ? "active" : "pend"}`}>
                          {done ? <Check size={11} /> : <span style={{ fontSize: 10 }}>{step.emoji}</span>}
                        </div>
                        {!last && <div className={`ltp-tl-line ${done ? "done" : ""}`} />}
                      </div>
                      <div className="ltp-tl-label-col">
                        <span className={`ltp-tl-label ${done ? "done" : active ? "active" : "pend"}`}>{step.label}</span>
                        {active && !isCancelled && (
                          <span className="ltp-tl-badge">
                            {isLogistics
                              ? (isCompleted ? "Delivered" : isArrived ? "At Pickup" : isInProgress ? "In Transit" : etaMins != null ? `~${etaMins} min` : "En Route")
                              : (isArrived ? "At Site" : isInProgress ? "Active" : isCompleted ? "Finished" : etaMins != null ? `~${etaMins} min` : "Active")
                            }
                          </span>
                        )}
                        {done && !last && <span className="ltp-tl-done-badge">Done</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Service Location / Route Card */}
            {isLogistics ? (
              <div className="ltp-card">
                <div className="ltp-sec-title">Delivery Route</div>
                {/* Pickup Address */}
                <div className="ltp-addr-row" style={{ marginBottom: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>P</div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 700, textTransform: "uppercase" }}>Pickup Location</div>
                    <span className="ltp-addr-text">{data?.pickup_address || data?.address || "Pickup address"}</span>
                  </div>
                </div>
                {/* Intermediate Stops (if any) */}
                {Array.isArray(data?.logistics?.stops) && data.logistics.stops.length > 0 && data.logistics.stops.map((stop, sIdx) => (
                  <div key={stop.id || sIdx} className="ltp-addr-row" style={{ marginBottom: 8, paddingLeft: 6, borderLeft: "2px dashed #94a3b8" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#f1f5f9", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{sIdx + 1}</div>
                    <div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>Stop {sIdx + 1} {stop.completed_at ? "✓ (Completed)" : stop.arrived_at ? "📍 (Driver Arrived)" : ""}</div>
                      <span className="ltp-addr-text" style={{ fontSize: "0.82rem" }}>{stop.address}</span>
                    </div>
                  </div>
                ))}
                {/* Drop Address */}
                <div className="ltp-addr-row">
                  <MapPin size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 700, textTransform: "uppercase" }}>Drop Destination</div>
                    <span className="ltp-addr-text">{data?.drop_address || data?.destination?.address || "Drop address"}</span>
                    {(data?.drop_contact_name || data?.drop_contact_phone) && (
                      <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: 3 }}>
                        👤 Receiver: <strong>{data.drop_contact_name || "Recipient"}</strong> {data.drop_contact_phone ? `(${data.drop_contact_phone})` : ""}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (data?.destination?.address || data?.service_location?.address) && (
              <div className="ltp-card">
                <div className="ltp-sec-title">Service Address</div>
                <div className="ltp-addr-row">
                  <MapPin size={15} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span className="ltp-addr-text">{data?.destination?.address || data?.service_location?.address}</span>
                </div>
              </div>
            )}

            {/* Booking Ref Card */}
            {data?.request_id && (
              <div className="ltp-card ltp-ref-card">
                {[
                  ["Booking Ref", `#${data.request_id}`, true],
                  ["Provider", vendorName],
                  ["Service", data.issue_title || data.service_category],
                  [
                    "Scheduled",
                    data.preferred_date
                      ? `${new Date(data.preferred_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}${data.preferred_time ? ` · ${data.preferred_time}` : ""}`
                      : null,
                  ],
                  [
                    "Total Amount",
                    data.total_amount != null
                      ? `₹${Number(data.total_amount).toLocaleString("en-IN")}`
                      : null,
                    true,
                  ],
                ].map(([label, val, bold]) =>
                  val ? (
                    <div key={label} className="ltp-ref-row">
                      <span className="ltp-ref-label">{label}</span>
                      <span className={bold ? "ltp-ref-val" : "ltp-ref-val-sm"}>{val}</span>
                    </div>
                  ) : null
                )}
              </div>
            )}
            {/* ── Request Changes / Re-Quote Modal Overlay ── */}
            {showRequestChangesModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1.5rem'
              }}>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    background: 'white',
                    borderRadius: 20,
                    padding: '1.75rem',
                    maxWidth: 440,
                    width: '100%',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                    Request Changes / Re-Quotation
                  </h3>
                  <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: '#64748b' }}>
                    Tell our service professional what you would like modified (e.g. adjust square feet, change paint brand, remove an area, update pricing):
                  </p>

                  <textarea
                    placeholder="e.g., Please change the paint brand to Royal Luxury Emulsion, adjust square footage for living room to 350 sq.ft, and exclude balcony..."
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: 100,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                      marginBottom: 16,
                      resize: 'none',
                      outline: 'none'
                    }}
                  />

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowRequestChangesModal(false)
                        setChangeNotes("")
                      }}
                      style={{
                        padding: '9px 16px',
                        background: '#f1f5f9',
                        color: '#0f172a',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!changeNotes.trim()) {
                          alert("Please enter what changes you would like to request.")
                          return
                        }
                        handleQuoteDecision("CHANGE_REQUESTED", "", changeNotes)
                        setShowRequestChangesModal(false)
                      }}
                      style={{
                        padding: '9px 18px',
                        background: '#f59e0b',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                      }}
                    >
                      Send Request
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ── Decline Reason Modal Overlay ── */}
            {showDeclineReasonModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1.5rem'
              }}>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    background: 'white',
                    borderRadius: 20,
                    padding: '1.75rem',
                    maxWidth: 420,
                    width: '100%',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                    Decline Quotation
                  </h3>
                  <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: '#64748b' }}>
                    Please let us know why you are declining this estimate:
                  </p>

                  <select
                    value={declineReasonCode}
                    onChange={(e) => setDeclineReasonCode(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                      marginBottom: 12,
                      background: 'white',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select a reason...</option>
                    <option value="PRICE_TOO_HIGH">Price is higher than expected</option>
                    <option value="POSTPONE_SERVICE">Plan to do this at a later date</option>
                    <option value="FOUND_ANOTHER_PROVIDER">Found another provider</option>
                    <option value="SCOPE_MISMATCH">Items/scope not matching requirement</option>
                    <option value="OTHER">Other reason</option>
                  </select>

                  <textarea
                    placeholder="Additional details (optional)..."
                    value={declineReasonNotes}
                    onChange={(e) => setDeclineReasonNotes(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: 80,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                      marginBottom: 16,
                      resize: 'none',
                      outline: 'none'
                    }}
                  />

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowDeclineReasonModal(false)
                        setDeclineReasonCode("")
                        setDeclineReasonNotes("")
                      }}
                      style={{
                        padding: '9px 16px',
                        background: '#f1f5f9',
                        color: '#0f172a',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!declineReasonCode) {
                          alert("Please select a reason for declining.")
                          return
                        }
                        handleQuoteDecision("DECLINE", declineReasonCode, declineReasonNotes)
                        setShowDeclineReasonModal(false)
                      }}
                      style={{
                        padding: '9px 18px',
                        background: '#dc2626',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                      }}
                    >
                      Confirm Decline
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </aside>
        </main>
      </div>
    )
  }

  if (isModal) {
    return (
      <motion.div
        className="ltp-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) {
            onClose()
          }
        }}
      >
        <motion.div
          className="ltp-modal-window"
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderContent()}
        </motion.div>
      </motion.div>
    )
  }

  return renderContent()
}

export default CustomerTrackingPage

