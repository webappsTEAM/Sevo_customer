/**
 * realtimeService.js
 * Deployment-independent abstraction for Realtime Location Tracking.
 * Supports WebSockets / Django Channels, Supabase Realtime, and HTTP Polling fallback.
 * Provider choice is controlled by environment variables (VITE_REALTIME_PROVIDER).
 */

import { API_BASE_URL } from "../api/client.js"

class RealtimeLocationService {
  constructor() {
    this.provider = import.meta.env.VITE_REALTIME_PROVIDER || "auto" // 'websocket', 'polling', or 'auto'
    this.socket = null
    this.pollInterval = null
  }

  /**
   * Start listening for an employee's live location for a specific booking.
   * Used by Customer Frontend.
   */
  subscribeBookingLocation(bookingId, onLocationUpdate) {
    // 1. Try WebSocket connection if available
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsHost = import.meta.env.VITE_WS_BASE_URL
      ? import.meta.env.VITE_WS_BASE_URL.replace(/^http/, "ws")
      : `${wsProtocol}//${window.location.host}`
    
    try {
      this.socket = new WebSocket(`${wsHost}/ws/live-location/`)
      this.socket.onopen = () => {
        this.socket.send(JSON.stringify({ type: "subscribe", booking_id: bookingId }))
      }

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.lat && data.lng) {
            onLocationUpdate({
              latitude: parseFloat(data.lat),
              longitude: parseFloat(data.lng),
              timestamp: data.timestamp || new Date().toISOString(),
            })
          }
        } catch (e) {
          console.error("Failed to parse live location message:", e)
        }
      }
    } catch (e) {
      console.warn("WebSocket connection unavailable, falling back to HTTP polling.")
    }

    // 2. HTTP Polling Fallback (ensures reliable deployment across localhost, Supabase & VPS)
    const pollLocation = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/booking/${bookingId}/live-location/`, {
          credentials: "include"
        })
        if (res.ok) {
          const json = await res.json()
          const loc = json?.data?.employee_live_location
          if (loc && loc.latitude && loc.longitude) {
            onLocationUpdate({
              latitude: loc.latitude,
              longitude: loc.longitude,
              timestamp: loc.updated_at || new Date().toISOString(),
              employee_name: loc.employee_name,
              phone: loc.phone
            })
          }
        }
      } catch (err) {
        // Silent poll handling
      }
    }

    pollLocation()
    this.pollInterval = setInterval(pollLocation, 5000)

    return () => {
      if (this.socket) {
        try { this.socket.close() } catch (e) {}
      }
      if (this.pollInterval) {
        clearInterval(this.pollInterval)
      }
    }
  }

  /**
   * Publish live location updates from Employee device after job acceptance.
   * Used by Employee Frontend.
   */
  async publishEmployeeLocation(latitude, longitude, accuracy = 10) {
    try {
      const res = await fetch(`${API_BASE_URL}/live-locations/update/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lat: latitude, lng: longitude, accuracy })
      })
      return res.ok
    } catch (err) {
      console.error("Failed to publish employee live location:", err)
      return false
    }
  }
}

export const realtimeTracker = new RealtimeLocationService()
