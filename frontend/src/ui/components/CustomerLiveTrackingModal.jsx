import React from "react"
import { CustomerTrackingPage } from "../customer/tracking/CustomerTrackingPage.jsx"

/**
 * CustomerLiveTrackingModal
 * Smooth, full-featured in-page live tracking popup modal for CalTrack.
 * Renders the authoritative CustomerTrackingPage inside a rich modal overlay.
 */
export default function CustomerLiveTrackingModal({ booking, onClose }) {
  if (!booking) return null

  const bookingId = booking.request_id || booking.id || booking.booking_id
  const trackingToken = booking.tracking_token || null

  return (
    <CustomerTrackingPage
      bookingId={bookingId}
      trackingToken={trackingToken}
      isModal={true}
      onClose={onClose}
    />
  )
}
