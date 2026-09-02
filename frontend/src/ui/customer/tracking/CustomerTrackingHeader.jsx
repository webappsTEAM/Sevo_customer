import React from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, X, RefreshCw, WifiOff, ExternalLink } from "lucide-react"
import { getFreshnessBadge } from "./trackingUtils.js"

export function CustomerTrackingHeader({
  requestId,
  trackingToken,
  serviceCategory,
  issueTitle,
  freshness = "LIVE",
  status = "on_the_way",
  connectionState = "LIVE",
  online = true,
  lastUpdated,
  onRefresh,
  onClose,
  isModal = false,
}) {
  const navigate = useNavigate()
  const freshnessBadge = getFreshnessBadge(freshness, status)

  // Service icon / category label
  const serviceLabel = issueTitle || serviceCategory || "Service Request"

  const handleBackOrClose = () => {
    if (onClose) {
      onClose()
    } else {
      navigate(-1)
    }
  }

  const handleOpenFullPage = () => {
    if (!requestId) return
    const tokenQuery = trackingToken ? `?token=${encodeURIComponent(trackingToken)}` : ""
    window.open(`/track/${encodeURIComponent(requestId)}${tokenQuery}`, "_blank")
  }

  return (
    <header className="ltp-header">
      <div className="ltp-hdr-left">
        <button
          className="ltp-hdr-back-btn"
          onClick={handleBackOrClose}
          aria-label={isModal ? "Close live tracking" : "Back"}
          title={isModal ? "Close live tracking (Esc)" : "Back to bookings"}
        >
          {isModal ? <X size={18} color="white" /> : <ArrowLeft size={18} color="white" />}
        </button>

        <div>
          <div className="ltp-hdr-title-row">
            <h1 className="ltp-hdr-title">Track Technician</h1>
            {requestId && <span className="ltp-hdr-badge">#{requestId}</span>}
          </div>
          <div className="ltp-hdr-sub">
            <span className={`ltp-live-dot ${freshnessBadge.pillClass}`} />
            <span>{connectionState === "LIVE" ? "🟢 Live GPS" : freshnessBadge.text}</span>
            {serviceLabel && (
              <>
                <span className="ltp-sep">•</span>
                <span className="ltp-service-tag">{serviceLabel}</span>
              </>
            )}
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
        {connectionState === "POLLING" && online && (
          <span className="ltp-polling-badge">🟡 Polling</span>
        )}
        <button className="ltp-hdr-btn" onClick={onRefresh} aria-label="Refresh tracking" title="Refresh live status">
          <RefreshCw size={13} /> Refresh
        </button>
        {isModal && requestId && (
          <button
            className="ltp-hdr-btn"
            onClick={handleOpenFullPage}
            aria-label="Open full tracking in new tab"
            title="Open tracking page in new tab so you can view other pages simultaneously"
          >
            <ExternalLink size={13} /> Full Page
          </button>
        )}
        {isModal && onClose && (
          <button
            className="ltp-hdr-btn ltp-modal-close-btn"
            onClick={onClose}
            aria-label="Close tracking popup"
            title="Close popup (Esc)"
          >
            <X size={14} /> Close
          </button>
        )}
      </div>
    </header>
  )
}

export default CustomerTrackingHeader

