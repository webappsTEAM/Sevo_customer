/**
 * CustomerTrackingPage.jsx
 * Canonical, Rapido-Style Customer Live Tracking Page for CalTrack.
 */

import React, { useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Phone, MessageSquare, CheckCircle2, Clock, MapPin,
  Star, RefreshCw, KeyRound, Bike, Copy, Check,
  Wrench, WifiOff, Shield
} from "lucide-react"
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
  arrived: "Technician Arrived",
  in_progress: "Service In Progress",
  completed: "Service Completed",
  closed: "Service Completed",
  feedback_pending: "Service Completed",
  feedback_received: "Feedback Received",
  cancelled: "Booking Cancelled",
  rejected: "Booking Declined",
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

export function CustomerTrackingPage() {
  const { bookingId, jobId, token } = useParams()
  const activeIdentifier = bookingId || jobId
  const [searchParams] = useSearchParams()
  const trackingToken = searchParams.get("token") || token || null

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

  const status = (data?.status || "").toLowerCase()
  const isAccepted = Boolean(data?.is_accepted)
  const isCancelled = status === "cancelled" || status === "rejected"
  const tlIdx = getTimelineIdx(status)
  const isArrived = status === "arrived"
  const isInProgress = status === "in_progress"
  const isCompleted = ["completed", "closed", "feedback_pending", "feedback_received"].includes(status)

  const vendorName = data?.vendor?.name || ""
  const techName = data?.technician?.name || ""
  const techPhone = data?.technician?.phone || ""
  const techPhoto = data?.technician?.photo || null
  const techRating = data?.technician?.rating || null
  const techJobs = data?.technician?.jobs_completed || null
  const startOtp = data?.start_otp || null

  const etaMins = data?.technician?.eta_minutes ?? data?.eta_minutes ?? null
  const distKm = data?.technician?.distance_km ?? data?.distance_km ?? null
  const freshness = data?.freshness || "LIVE"

  const copyOtp = () => {
    if (!startOtp || !navigator.clipboard) return
    navigator.clipboard.writeText(startOtp)
    setCopiedOtp(true)
    setTimeout(() => setCopiedOtp(false), 2000)
  }

  const openWA = () => {
    if (!techPhone) return
    const msg = encodeURIComponent(
      `Hi ${techName}, following up on CalServices booking #${data?.request_id || activeIdentifier}.`
    )
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
      <div className="ltp-fullscreen ltp-center">
        <motion.div className="ltp-error-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="ltp-error-emoji">{m.icon}</div>
          <h2 className="ltp-error-title">{m.title}</h2>
          <p className="ltp-error-body">{m.body}</p>
          {!trackingToken && (
            <p className="ltp-error-hint">
              <Shield size={13} /> Secure tracking requires a valid authentication token or customer login.
            </p>
          )}
          <button className="ltp-retry-btn" onClick={refresh}>
            <RefreshCw size={14} /> Try Again
          </button>
        </motion.div>
      </div>
    )
  }

  if (isCompleted && data) {
    return (
      <div className="ltp-fullscreen ltp-center">
        <motion.div className="ltp-error-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="ltp-error-emoji">🎉</div>
          <h2 className="ltp-error-title" style={{ color: "#047857" }}>Service Completed</h2>
          <p className="ltp-error-body">Your service request <strong>#{data.request_id || activeIdentifier}</strong> has been finished successfully.</p>
          {data.issue_title && <p className="ltp-error-body" style={{ color: "#64748b", fontSize: "0.85rem" }}>{data.issue_title}</p>}
          {techName && (
            <div style={{ margin: "14px 0", padding: "10px 14px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0", textAlign: "left" }}>
              <div style={{ fontSize: "0.72rem", color: "#047857", fontWeight: 700, textTransform: "uppercase" }}>Serviced By</div>
              <div style={{ fontSize: "0.92rem", color: "#065f46", fontWeight: 800 }}>👤 {techName} {vendorName ? `(${vendorName})` : ""}</div>
            </div>
          )}
          <p className="ltp-error-hint" style={{ color: "#047857" }}>Thank you for choosing CalServices!</p>
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
          <p className="ltp-error-body">Your booking <strong>#{data.request_id || activeIdentifier}</strong> has been cancelled.</p>
          {data.issue_title && <p className="ltp-error-body" style={{ color: "#64748b", fontSize: "0.85rem" }}>{data.issue_title}</p>}
          <p className="ltp-error-hint" style={{ color: "#64748b" }}>If any advance payment was made, your full refund will be processed within 2–4 business days.</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="ltp-root">
      {/* ── Top Header ── */}
      <CustomerTrackingHeader
        requestId={data?.request_id || activeIdentifier}
        serviceCategory={data?.service_category}
        issueTitle={data?.issue_title}
        freshness={freshness}
        status={status}
        connectionState={connectionState}
        online={online}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
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
          {/* Work Start OTP Card */}
          {isAccepted && startOtp && !isCompleted && !isCancelled && (
            <div className={`ltp-card ltp-otp-card ${isArrived ? "highlight-arrived" : ""}`}>
              <div className="ltp-otp-left">
                <KeyRound size={18} color="#ea580c" />
                <div>
                  <div className="ltp-otp-label">WORK START OTP</div>
                  <div className="ltp-otp-hint">Share this code with technician to begin service</div>
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
                  <div className="ltp-vendor-label">Service Provider</div>
                  <div className="ltp-vendor-name">🏢 {vendorName}</div>
                </div>
                <span className="ltp-verified">✓ Verified Vendor</span>
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
                    <span className="ltp-partner-name">{techName}</span>
                    <span className="ltp-verified">✓ Professional</span>
                  </div>
                  <div className="ltp-partner-meta">
                    {techRating != null ? (
                      <span className="ltp-rating"><Star size={12} fill="#d97706" color="#d97706" /> {Number(techRating).toFixed(1)}</span>
                    ) : (
                      <span className="ltp-rating">★ Verified Expert</span>
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
                    <span className={`ltp-tech-status-pill ${status}`}>
                      {isArrived ? "📍 Arrived At Site" : isInProgress ? "🔧 In Progress" : isCompleted ? "✅ Completed" : "🛵 On The Way"}
                    </span>
                  </div>
                </div>
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
                <motion.div className="ltp-radar-ring r1" animate={{ scale: [1, 1.8, 2.4], opacity: [0.5, 0.15, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }} />
                <motion.div className="ltp-radar-ring r2" animate={{ scale: [1, 1.5, 2.0], opacity: [0.6, 0.25, 0] }} transition={{ repeat: Infinity, duration: 2.4, delay: 0.8, ease: "easeOut" }} />
                <div className="ltp-radar-center"><Bike size={24} color="white" /></div>
              </div>
              <div className="ltp-waiting-info">
                <div className="ltp-waiting-title">Finding your professional…</div>
                <div className="ltp-waiting-sub">Searching nearby verified service pros in your area</div>
                <div className="ltp-waiting-confirm-tag">✓ Booking Confirmed</div>
              </div>
            </div>
          )}

          {/* Compact Status Timeline */}
          <div className="ltp-card">
            <div className="ltp-sec-title">Service Lifecycle Status</div>
            <div className="ltp-timeline">
              {TIMELINE_STEPS.map((step, i) => {
                const done = tlIdx > i
                const active = tlIdx === i
                const last = i === TIMELINE_STEPS.length - 1
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
                          {isArrived ? "At Site" : isInProgress ? "Active" : isCompleted ? "Finished" : etaMins != null ? `~${etaMins} min` : "Active"}
                        </span>
                      )}
                      {done && !last && <span className="ltp-tl-done-badge">Done</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Service Location Card */}
          {(data?.destination?.address || data?.service_location?.address) && (
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
        </aside>
      </main>
    </div>
  )
}

export default CustomerTrackingPage
