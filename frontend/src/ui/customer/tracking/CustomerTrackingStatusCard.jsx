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

  const isAccepted = Boolean(
    data?.is_accepted ||
    data?.technician_accepted ||
    data?.technician?.name ||
    data?.technician_name ||
    data?.assigned_employee?.name ||
    ["accepted", "on_the_way", "en_route", "arrived", "service_started", "in_progress", "on_hold", "proof_submitted", "payment_pending", "cash_pending", "waiting_for_payment", "settling", "completed", "closed"].includes(status)
  )
  const isArrived = status === "arrived"
  const isInProgress = status === "in_progress"
  const isCompleted = ["completed", "closed", "feedback_pending", "feedback_received"].includes(status)

  const vendorName = data?.vendor?.name || ""
  const techName = data?.technician?.name || data?.technician_name || data?.assigned_employee?.name || ""
  const techPhone = data?.technician?.phone || data?.technician_phone || data?.assigned_employee?.phone || ""
  const techPhoto = data?.technician?.photo || data?.technician_photo || data?.assigned_employee?.photo || null
  const techRating = data?.technician?.rating || data?.technician_rating || data?.assigned_employee?.rating || null
  const techJobs = data?.technician?.jobs_completed || data?.assigned_employee?.jobs_completed || null
  const startOtp = data?.start_otp || null
  const paymentConfirmationOtp = data?.payment_confirmation_otp || null
  const isCashPending = data?.payment_status === "cash_pending" || Boolean(paymentConfirmationOtp)
  const [copiedPaymentOtp, setCopiedPaymentOtp] = useState(false)

  const copyPaymentOtp = () => {
    if (!paymentConfirmationOtp || !navigator.clipboard) return
    navigator.clipboard.writeText(paymentConfirmationOtp)
    setCopiedPaymentOtp(true)
    setTimeout(() => setCopiedPaymentOtp(false), 2000)
  }

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
  // Progress counts the intermediate stops the customer added; pickup and drop
  // are the trip's ends and have their own status steps.
  const stops = (Array.isArray(data?.logistics?.stops) ? data.logistics.stops : []).filter(
    (s) => !["PICKUP", "DROP"].includes(String(s?.stop_type || "").toUpperCase()),
  )
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
  } else if (["proof_submitted", "cash_pending", "waiting_for_payment", "payment_pending"].includes(status)) {
    const isCashPending = status === "cash_pending" || data?.payment_status === "cash_pending"
    dynamicTag = isLogistics 
      ? (isCashPending ? "CASH PAYMENT PENDING" : "PROOF SUBMITTED")
      : (isCashPending ? "CASH PAYMENT PENDING" : "PROOF SUBMITTED")
    dynamicTitle = isLogistics
      ? (isCashPending ? "Share Cash Confirmation OTP with driver" : "Driver delivered goods & submitted proof")
      : (isCashPending ? "Share Cash Confirmation OTP with technician" : "Technician submitted proof of completion")
    dynamicSub = isCashPending && data?.payment_confirmation_otp ? (
      <span className="ltp-ftc-otp-highlight" style={{ color: "#059669" }}>
        Cash Confirmation OTP: <strong>{data.payment_confirmation_otp}</strong>
      </span>
    ) : (
      isLogistics ? "Awaiting payment verification to close booking." : "Awaiting payment verification to complete service."
    )
    dynamicTheme = "green"
  } else if (logisticsLeg === "REASSEMBLY") {
    dynamicTag = "REASSEMBLY IN PROGRESS"
    dynamicTitle = `${techName || "Team"} is reassembling furniture & items`
    dynamicSub = "Placing and reassembling items at your destination"
    dynamicTheme = "blue"
  } else if (logisticsLeg === "UNPACKING") {
    dynamicTag = "UNPACKING GOODS"
    dynamicTitle = `${techName || "Team"} is unpacking items at destination`
    dynamicSub = "Safely unpacking goods and organizing placement"
    dynamicTheme = "blue"
  } else if (logisticsLeg === "ARRIVED_DROP") {
    dynamicTag = "ARRIVED AT DESTINATION"
    dynamicTitle = `${techName || "Driver"} has arrived at drop location`
    dynamicSub = "Vehicle at delivery site — preparing for unloading"
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
    if (logisticsLeg === "DISMANTLING") {
      dynamicTag = "DISMANTLING ITEMS"
      dynamicTitle = `${techName || "Team"} is dismantling furniture & fixtures`
      dynamicSub = "Safely taking apart fixtures for secure transit"
    } else if (logisticsLeg === "PACKING") {
      dynamicTag = "PACKING GOODS"
      dynamicTitle = `${techName || "Team"} is packing items at pickup site`
      dynamicSub = "Items are currently being packed & protected"
    } else {
      dynamicTag = "LOADING GOODS"
      dynamicTitle = `${techName || "Driver"} is loading items at pickup site`
      dynamicSub = "Items are currently being inspected and loaded"
    }
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
            {totalStops > 0 && (
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

        {isCashPending && paymentConfirmationOtp && (
          <div style={{
            margin: "0 14px 14px 14px",
            padding: "12px 14px",
            background: "#ecfdf5",
            border: "1.5px solid #10b981",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#065f46", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Cash Payment OTP
              </div>
              <div style={{ fontSize: "11px", color: "#047857", marginTop: "1px" }}>
                Share with technician to confirm cash collection:
              </div>
              <div style={{ fontSize: "20px", fontWeight: "900", color: "#064e3b", letterSpacing: "0.2em", fontFamily: "monospace", marginTop: "2px" }}>
                {paymentConfirmationOtp}
              </div>
            </div>
            <button
              type="button"
              onClick={copyPaymentOtp}
              style={{
                padding: "6px 12px",
                background: "#059669",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              {copiedPaymentOtp ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedPaymentOtp ? "Copied" : "Copy"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomerTrackingStatusCard
