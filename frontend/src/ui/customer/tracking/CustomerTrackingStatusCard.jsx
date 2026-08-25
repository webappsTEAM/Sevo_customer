/**
 * CustomerTrackingStatusCard.jsx — Floating Rapido-Style Status Card & Technician Details Panel
 */

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  Phone, MessageSquare, Star, CheckCircle2, Clock,
  MapPin, KeyRound, Bike, Copy, Check, Wrench, Shield
} from "lucide-react"
import { formatEta, formatDistance } from "./trackingUtils.js"

export function CustomerTrackingStatusCard({
  data,
  status = "on_the_way",
  etaMinutes = null,
  distanceKm = null,
  connectionState = "LIVE",
  online = true,
}) {
  const [copiedOtp, setCopiedOtp] = useState(false)

  const isAccepted = Boolean(data?.is_accepted)
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

  const rawTechLat = data?.technician_location?.latitude ?? data?.technician?.latitude
  const hasGps = rawTechLat != null && !isNaN(parseFloat(rawTechLat))

  const cleanEta = formatEta(etaMinutes, status)
  const cleanDist = formatDistance(distanceKm ? distanceKm * 1000 : null)

  const copyOtp = () => {
    if (!startOtp || !navigator.clipboard) return
    navigator.clipboard.writeText(startOtp)
    setCopiedOtp(true)
    setTimeout(() => setCopiedOtp(false), 2000)
  }

  const openWA = () => {
    if (!techPhone) return
    const msg = encodeURIComponent(
      `Hi ${techName}, following up on Sevo booking #${data?.request_id}.`
    )
    window.open(`https://wa.me/91${techPhone.replace(/\D/g, "")}?text=${msg}`, "_blank")
  }

  const cardTheme = isArrived || isCompleted ? "green" : isInProgress ? "blue" : hasGps ? "orange" : isAccepted ? "purple" : "gray"

  return (
    <div className="ltp-status-card-group">
      {/* Floating Rapido-Style Top Card Overlay on Map */}
      <div className={`ltp-floating-tracking-card ${cardTheme}`}>
        <div className="ltp-ftc-header">
          <span className={`ltp-ftc-tag ${cardTheme}`}>
            {isArrived
              ? "TECHNICIAN ARRIVED"
              : isInProgress
              ? "SERVICE IN PROGRESS"
              : isCompleted
              ? "SERVICE COMPLETED"
              : hasGps
              ? "TECHNICIAN ON THE WAY"
              : isAccepted
              ? "TECHNICIAN ACCEPTED"
              : "BOOKING CONFIRMED"}
          </span>
          {online && (
            <span className="ltp-ftc-live-badge">
              <span className={`ltp-live-dot ${isArrived ? "pulse-emerald" : "pulse-cyan"}`} />
              <span>{connectionState === "LIVE" ? "Live" : "Updating"}</span>
            </span>
          )}
        </div>

        <div className="ltp-ftc-body">
          <div className={`ltp-ftc-avatar ${cardTheme}`}>
            {isArrived || isCompleted ? (
              <CheckCircle2 size={20} />
            ) : isInProgress ? (
              <Wrench size={18} />
            ) : hasGps ? (
              <Bike size={20} />
            ) : (
              <Clock size={18} />
            )}
          </div>

          <div className="ltp-ftc-details">
            <div className="ltp-ftc-title">
              {isArrived
                ? `${techName || "Technician"} has arrived at your site`
                : isInProgress
                ? `${techName || "Technician"} is servicing your request`
                : isCompleted
                ? "Service Completed"
                : hasGps
                ? `${techName || "Assigned Partner"} is on the way`
                : isAccepted
                ? `${techName || "Service Partner"} accepted your booking`
                : "Finding your service professional…"}
            </div>

            <div className="ltp-ftc-sub">
              {isArrived ? (
                startOtp ? (
                  <span className="ltp-ftc-otp-highlight">
                    Work Start OTP: <strong>{startOtp}</strong>
                  </span>
                ) : (
                  "Partner is at your service location"
                )
              ) : isInProgress ? (
                "Service is actively underway"
              ) : isCompleted ? (
                "Thank you for choosing Sevo!"
              ) : hasGps ? (
                <>
                  {cleanDist && <strong>{cleanDist}</strong>}
                  {cleanDist && cleanEta && <span className="ltp-ftc-sep">·</span>}
                  {cleanEta ? <strong>~{cleanEta} ETA</strong> : <span>Calculating…</span>}
                </>
              ) : isAccepted ? (
                "Waiting for live location..."
              ) : (
                "Searching nearby verified professionals"
              )}
            </div>

            {data?.technician?.current_location_name && hasGps && !isArrived && !isInProgress && !isCompleted && (
              <div className="ltp-ftc-loc">
                <MapPin size={11} style={{ flexShrink: 0 }} />
                <span>{data.technician.current_location_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerTrackingStatusCard
