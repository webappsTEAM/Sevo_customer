/**
 * CustomerTrackingHeader.jsx — CalTrack Customer Live Tracking Header
 */

import React from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, RefreshCw, WifiOff } from "lucide-react"
import { getFreshnessBadge } from "./trackingUtils.js"

export function CustomerTrackingHeader({
  requestId,
  serviceCategory,
  issueTitle,
  freshness = "LIVE",
  status = "on_the_way",
  connectionState = "LIVE",
  online = true,
  lastUpdated,
  onRefresh,
}) {
  const navigate = useNavigate()
  const freshnessBadge = getFreshnessBadge(freshness, status)

  // Service icon / category label
  const serviceLabel = issueTitle || serviceCategory || "Service Request"

  return (
    <header className="ltp-header">
      <div className="ltp-hdr-left">
        <button
          className="ltp-hdr-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Back"
          title="Back to bookings"
        >
          <ArrowLeft size={18} color="white" />
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
        <button className="ltp-hdr-btn" onClick={onRefresh} aria-label="Refresh tracking">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
    </header>
  )
}

export default CustomerTrackingHeader
