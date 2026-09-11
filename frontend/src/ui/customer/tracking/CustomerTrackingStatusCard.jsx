/**
 * CustomerTrackingStatusCard.jsx — Floating Rapido-Style Status Card & Technician Details Panel
 */

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  Phone, MessageSquare, Star, CheckCircle2, Clock,
  MapPin, KeyRound, Bike, Copy, Check, Wrench, Shield, Truck
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

  const isLogistics = Boolean(
    data?.logistics?.leg ||
    data?.service_category?.toLowerCase().includes("goods") ||
    data?.service_category?.toLowerCase().includes("truck") ||
    data?.service_category?.toLowerCase().includes("two_wheeler") ||
    data?.service_category?.toLowerCase().includes("packers") ||
    data?.service_category?.toLowerCase().includes("transport")
  )
  const logisticsLeg = (data?.logistics?.leg || "").toUpperCase()
  const stops = Array.isArray(data?.logistics?.stops) ? data.logistics.stops : []
  const completedStops = stops.filter((s) => s.completed_at).length
  const totalStops = stops.length

  let dynamicTag = ""
  let dynamicTitle = ""
  let dynamicSub = null
  let dynamicTheme = isArrived || isCompleted ? "green" : isInProgress ? "blue" : hasGps ? "orange" : isAccepted ? "purple" : "gray"

  if (isCompleted || logisticsLeg === "DELIVERED" || logisticsLeg === "COMPLETED") {
    dynamicTag = isLogistics ? "GOODS DELIVERED" : "SERVICE COMPLETED"
    dynamicTitle = isLogistics ? "Goods Delivered Successfully" : "Service Completed"
    dynamicSub = isLogistics ? "All items have been safely transported & delivered." : "Thank you for choosing Sevo!"
    dynamicTheme = "green"
  } else if (logisticsLeg === "UNLOADING") {
    dynamicTag = "UNLOADING GOODS"
    dynamicTitle = `${techName || "Driver"} is unloading goods at destination`
    dynamicSub = "Reached delivery site — unloading items now"
    dynamicTheme = "blue"
  } else if (logisticsLeg === "EN_ROUTE_DROP" || logisticsLeg === "IN_TRANSIT") {
    dynamicTag = "EN ROUTE TO DESTINATION"
    dynamicTitle = `${techName || "Driver"} is en route to drop destination`
    dynamicSub = (
      <>
        {cleanDist && <strong>{cleanDist}</strong>}
        {cleanDist && cleanEta && <span className="ltp-ftc-sep">·</span>}
        {cleanEta ? <strong>~{cleanEta} ETA to drop</strong> : <span>In transit to destination…</span>}
      </>
    )
    dynamicTheme = "orange"
  } else if (logisticsLeg === "LOADING" || logisticsLeg === "PACKING" || logisticsLeg === "DISMANTLING") {
    dynamicTag = logisticsLeg === "PACKING" ? "PACKING GOODS" : "LOADING GOODS"
    dynamicTitle = `${techName || "Driver"} is loading items at pickup site`
    dynamicSub = "Items are currently being inspected and loaded"
    dynamicTheme = "blue"
  } else if (logisticsLeg === "EN_ROUTE_PICKUP" || logisticsLeg === "TEAM_EN_ROUTE") {
    dynamicTag = "DRIVER EN ROUTE TO PICKUP"
    dynamicTitle = `${techName || "Driver"} is driving to pickup location`
    dynamicSub = (
      <>
        {cleanDist && <strong>{cleanDist}</strong>}
        {cleanDist && cleanEta && <span className="ltp-ftc-sep">·</span>}
        {cleanEta ? <strong>~{cleanEta} ETA to pickup</strong> : <span>Navigating to pickup…</span>}
      </>
    )
    dynamicTheme = "orange"
  } else if (isArrived || logisticsLeg === "ARRIVED_PICKUP") {
    dynamicTag = isLogistics ? "DRIVER ARRIVED AT PICKUP" : "TECHNICIAN ARRIVED"
    dynamicTitle = `${techName || (isLogistics ? "Driver" : "Technician")} has arrived at your site`
    dynamicSub = startOtp ? (
      <span className="ltp-ftc-otp-highlight">
        Work Start OTP: <strong>{startOtp}</strong>
      </span>
    ) : (
      "Partner is at your service location"
    )
    dynamicTheme = "green"
  } else if (isInProgress) {
    dynamicTag = isLogistics ? "TRANSPORT IN PROGRESS" : "SERVICE IN PROGRESS"
    dynamicTitle = `${techName || (isLogistics ? "Driver" : "Technician")} is servicing your request`
    dynamicSub = isLogistics ? "Trip is actively underway" : "Service is actively underway"
    dynamicTheme = "blue"
  } else if (hasGps) {
    dynamicTag = isLogistics ? "DRIVER ON THE WAY" : "TECHNICIAN ON THE WAY"
    dynamicTitle = `${techName || (isLogistics ? "Driver" : "Assigned Partner")} is on the way`
    dynamicSub = (
      <>
        {cleanDist && <strong>{cleanDist}</strong>}
        {cleanDist && cleanEta && <span className="ltp-ftc-sep">·</span>}
        {cleanEta ? <strong>~{cleanEta} ETA</strong> : <span>Calculating…</span>}
      </>
    )
    dynamicTheme = "orange"
  } else if (isAccepted) {
    dynamicTag = isLogistics ? "DRIVER ASSIGNED" : "TECHNICIAN ACCEPTED"
    dynamicTitle = `${techName || (isLogistics ? "Driver" : "Service Partner")} accepted your booking`
    dynamicSub = "Waiting for live location..."
    dynamicTheme = "purple"
  } else {
    dynamicTag = "BOOKING CONFIRMED"
    dynamicTitle = isLogistics ? "Finding your nearest driver…" : "Finding your service professional…"
    dynamicSub = isLogistics ? "Searching nearby verified commercial vehicles" : "Searching nearby verified professionals"
    dynamicTheme = "gray"
  }

  const cardTheme = dynamicTheme

  return (
    <div className="ltp-status-card-group">
      {/* Floating Rapido-Style Top Card Overlay on Map */}
      <div className={`ltp-floating-tracking-card ${cardTheme}`}>
        <div className="ltp-ftc-header">
          <span className={`ltp-ftc-tag ${cardTheme}`}>
            {dynamicTag}
          </span>
          <div className="flex items-center gap-2">
            {totalStops > 1 && (
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900/10 text-slate-700">
                Stops: {completedStops}/{totalStops}
              </span>
            )}
            {online && (
              <span className="ltp-ftc-live-badge">
                <span className={`ltp-live-dot ${isArrived ? "pulse-emerald" : "pulse-cyan"}`} />
                <span>{connectionState === "LIVE" ? "Live" : "Updating"}</span>
              </span>
            )}
          </div>
        </div>

        <div className="ltp-ftc-body">
          <div className={`ltp-ftc-avatar ${cardTheme}`}>
            {isArrived || isCompleted || logisticsLeg === "DELIVERED" ? (
              <CheckCircle2 size={20} />
            ) : isLogistics ? (
              <Truck size={20} />
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
              {dynamicTitle}
            </div>

            <div className="ltp-ftc-sub">
              {dynamicSub}
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
