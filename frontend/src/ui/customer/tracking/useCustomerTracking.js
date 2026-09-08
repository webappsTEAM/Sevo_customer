/**
 * useCustomerTracking.js
 * Authoritative customer live tracking hook with WebSocket streaming, failover REST polling,
 * out-of-order GPS packet filtering, jitter suppression, and telemetry freshness monitoring.
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { createTrackingWebSocket } from "../../../api/websocketService.js"
import { haversineDistance, calculateBearing } from "./trackingUtils.js"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? `${window.location.origin}/Caltrack/api` : `/api`)

const TERMINAL_STATUSES = new Set([
  "completed",
  "closed",
  "feedback_pending",
  "feedback_received",
  "cancelled",
  "rejected",
])

/**
 * Validates whether latitude and longitude numbers are geographically valid.
 */
function isValidLatLng(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0)
}

/**
 * Safely normalizes tracking response payload from backend into standardized schema.
 */
function normalizeTrackingPayload(raw) {
  if (!raw) return null
  const tech = raw.technician || {}
  const techLoc = raw.technician_location || {}

  const rawLat = techLoc.latitude ?? tech.latitude ?? raw.latitude
  const rawLng = techLoc.longitude ?? tech.longitude ?? raw.longitude

  const lat = rawLat != null ? parseFloat(rawLat) : null
  const lng = rawLng != null ? parseFloat(rawLng) : null

  return {
    ...raw,
    technician: {
      ...tech,
      latitude: isValidLatLng(lat, lng) ? lat : null,
      longitude: isValidLatLng(lat, lng) ? lng : null,
      heading: tech.heading ?? techLoc.heading ?? 0,
      speed: tech.speed ?? techLoc.speed ?? 0,
    },
    technician_location: isValidLatLng(lat, lng)
      ? {
          latitude: lat,
          longitude: lng,
          heading: techLoc.heading ?? tech.heading ?? 0,
          speed: techLoc.speed ?? tech.speed ?? 0,
          accuracy: techLoc.accuracy ?? tech.accuracy ?? null,
          captured_at: techLoc.captured_at ?? tech.last_seen_at ?? new Date().toISOString(),
        }
      : null,
  }
}

export function useCustomerTracking({ bookingId, jobId, trackingToken }) {
  const activeIdentifier = bookingId || jobId

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorKind, setErrorKind] = useState(null)
  const [online, setOnline] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState("CONNECTING") // LIVE | POLLING | CONNECTING | RECONNECTING | STALE | OFFLINE
  const [lastUpdated, setLastUpdated] = useState(null)

  const mountedRef = useRef(true)
  const pollRef = useRef(null)
  const wsRef = useRef(null)
  const lastCapturedAtRef = useRef(0)
  const lastKnownGpsRef = useRef(null)
  const lastKnownBearingRef = useRef(0)
  const isFetchingRef = useRef(false) // in-flight guard: prevents overlapping REST polls

  /* ── Authoritative REST Fetch ── */
  const fetchLive = useCallback(async () => {
    if (!mountedRef.current) return
    if (isFetchingRef.current) return  // skip cycle if previous request still in-flight
    isFetchingRef.current = true
    try {
      let url
      if (trackingToken) {
        url = `${API_BASE_URL}/tracking/${encodeURIComponent(trackingToken)}/`
      } else if (activeIdentifier) {
        url = `${API_BASE_URL}/booking/${encodeURIComponent(activeIdentifier)}/live-location/`
      } else {
        setErrorKind("no_id")
        setLoading(false)
        setConnectionState("OFFLINE")
        return
      }

      const res = await fetch(url, { credentials: "include" })
      if (!mountedRef.current) return

      if (res.status === 404) {
        setErrorKind("not_found")
        setLoading(false)
        return
      }
      if (res.status === 401 || res.status === 403) {
        setErrorKind("unauthorized")
        setLoading(false)
        return
      }
      if (!res.ok) {
        setErrorKind("fetch_failed")
        setLoading(false)
        return
      }

      const json = await res.json()
      if (json?.data && mountedRef.current) {
        const incomingData = normalizeTrackingPayload(json.data)

        const capturedTime = incomingData.technician?.last_seen_at
          ? new Date(incomingData.technician.last_seen_at).getTime()
          : incomingData.technician_location?.captured_at
          ? new Date(incomingData.technician_location.captured_at).getTime()
          : Date.now()

        // Out-of-order check for REST snapshot
        if (capturedTime >= lastCapturedAtRef.current) {
          lastCapturedAtRef.current = capturedTime
          const lat = incomingData.technician?.latitude
          const lng = incomingData.technician?.longitude

          if (isValidLatLng(lat, lng)) {
            // Compute bearing fallback if missing
            if (lastKnownGpsRef.current && (incomingData.technician.heading == null || incomingData.technician.heading === 0)) {
              const calcB = calculateBearing(
                lastKnownGpsRef.current[0], lastKnownGpsRef.current[1],
                lat, lng,
                lastKnownBearingRef.current
              )
              incomingData.technician.heading = calcB
              lastKnownBearingRef.current = calcB
            } else if (incomingData.technician.heading) {
              lastKnownBearingRef.current = incomingData.technician.heading
            }
            lastKnownGpsRef.current = [lat, lng]
          }
          setData(incomingData)
        } else {
          // Preserve newer real-time coordinate received via WS while updating lifecycle metadata
          setData(prev => {
            if (!prev) return incomingData
            return {
              ...incomingData,
              technician: {
                ...incomingData.technician,
                latitude: prev.technician?.latitude,
                longitude: prev.technician?.longitude,
                heading: prev.technician?.heading,
                speed: prev.technician?.speed,
                last_seen_at: prev.technician?.last_seen_at,
              },
              technician_location: prev.technician_location,
              freshness: prev.freshness,
            }
          })
        }
        setLastUpdated(new Date().toISOString())
        setOnline(true)
        setErrorKind(null)
      }
    } catch {
      if (mountedRef.current) {
        setOnline(false)
        setConnectionState("OFFLINE")
      }
    } finally {
      isFetchingRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }, [activeIdentifier, trackingToken])

  /* ── Real-Time WebSocket Channel ── */
  useEffect(() => {
    mountedRef.current = true
    const identifier = activeIdentifier || trackingToken
    if (!identifier) return

    setConnectionState("CONNECTING")

    const ws = createTrackingWebSocket(
      identifier,
      trackingToken,
      // onEvent callback
      (eventType, eventData) => {
        if (!mountedRef.current) return
        setOnline(true)
        setLastUpdated(new Date().toISOString())

        if (eventType === "initial_state" && eventData) {
          const norm = normalizeTrackingPayload(eventData)
          setData(norm)
          return
        }

        if (eventType === "technician_location_updated" && eventData) {
          // The broadcast carries the full tracking snapshot (same shape as the
          // REST payload), not a flat {latitude, longitude, ...} packet — read
          // coordinates from technician_location / technician, with a flat-shape
          // fallback for callers that do send a bare location packet.
          const locSource = eventData.technician_location || eventData.technician || eventData
          const lat = parseFloat(locSource.latitude ?? eventData.latitude ?? eventData.lat)
          const lng = parseFloat(locSource.longitude ?? eventData.longitude ?? eventData.lng)

          if (!isValidLatLng(lat, lng)) return

          // Accuracy & Jump Filter: Ignore accuracy > 150m
          const rawAccuracy = locSource.accuracy ?? eventData.accuracy
          const accuracy = rawAccuracy != null ? parseFloat(rawAccuracy) : null
          if (accuracy != null && accuracy > 150) return

          // Out-of-order check
          const rawCapturedAt = eventData.captured_at || eventData.technician?.updated_at || eventData.technician_location_updated_at
          const capturedTime = rawCapturedAt
            ? new Date(rawCapturedAt).getTime()
            : Date.now()

          if (capturedTime < lastCapturedAtRef.current) {
            // Drop stale packet arriving out of order
            return
          }

          // Impossible jump check (> 200 km/h)
          if (lastKnownGpsRef.current && lastCapturedAtRef.current > 0) {
            const timeDiffSec = (capturedTime - lastCapturedAtRef.current) / 1000
            if (timeDiffSec > 0 && timeDiffSec < 60) {
              const distM = haversineDistance(
                lastKnownGpsRef.current[0], lastKnownGpsRef.current[1],
                lat, lng
              )
              const speedKmH = (distM / timeDiffSec) * 3.6
              if (speedKmH > 200) return // Reject impossible teleportation packet
            }
          }

          lastCapturedAtRef.current = capturedTime

          const rawHeading = locSource.heading ?? eventData.heading
          const rawSpeed = locSource.speed ?? eventData.speed
          const rawLocationName = eventData.technician?.current_location_name ?? eventData.location_name

          // Calculate missing bearing fallback
          let heading = rawHeading != null ? parseFloat(rawHeading) : null
          if ((heading == null || heading === 0) && lastKnownGpsRef.current) {
            heading = calculateBearing(
              lastKnownGpsRef.current[0], lastKnownGpsRef.current[1],
              lat, lng,
              lastKnownBearingRef.current
            )
          }
          if (heading != null) lastKnownBearingRef.current = heading
          lastKnownGpsRef.current = [lat, lng]

          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              freshness: eventData.freshness || "LIVE",
              technician: {
                ...(prev.technician || {}),
                latitude: lat,
                longitude: lng,
                heading: heading ?? prev.technician?.heading ?? 0,
                speed: rawSpeed ?? prev.technician?.speed ?? 0,
                last_seen_at: rawCapturedAt || new Date().toISOString(),
                current_location_name:
                  rawLocationName ?? prev.technician?.current_location_name,
              },
              technician_location: {
                latitude: lat,
                longitude: lng,
                heading: heading ?? 0,
                speed: rawSpeed ?? 0,
                accuracy: accuracy,
                captured_at: rawCapturedAt || new Date().toISOString(),
                freshness: eventData.freshness || "LIVE",
              },
            }
          })
          return
        }

        if (["technician_assigned", "job_dispatched"].includes(eventType)) {
          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              status: "assigned",
              is_accepted: false,
              technician_assigned: true,
              technician_accepted: false,
              technician: null,
              technician_location: null,
              start_otp: null,
              freshness: "WAITING_FOR_PROFESSIONAL",
            }
          })
          return
        }

        if (["employee_accepted", "technician_accepted"].includes(eventType) && eventData) {
          setData((prev) => {
            if (!prev) return prev
            const techPayload = eventData.technician || eventData
            return {
              ...prev,
              status: "accepted",
              is_accepted: true,
              technician_assigned: true,
              technician_accepted: true,
              technician: techPayload?.name ? techPayload : prev.technician,
              start_otp: eventData.start_otp || prev.start_otp,
              freshness: "WAITING_FOR_LOCATION",
            }
          })
          return
        }

        if (["employee_rejected", "assignment_expired"].includes(eventType)) {
          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              status: "confirmed",
              is_accepted: false,
              technician_assigned: false,
              technician_accepted: false,
              technician: null,
              technician_location: null,
              start_otp: null,
              freshness: "WAITING_FOR_PROFESSIONAL",
            }
          })
          return
        }

        if (["employee_on_the_way", "technician_on_the_way"].includes(eventType)) {
          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              status: "on_the_way",
              is_accepted: true,
              freshness: "LIVE",
            }
          })
          return
        }

        if (["employee_arrived", "technician_arrived"].includes(eventType)) {
          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              status: "arrived",
              is_accepted: true,
              freshness: "LIVE",
            }
          })
          return
        }

        if (["service_started", "job_started"].includes(eventType)) {
          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              status: "in_progress",
              is_accepted: true,
            }
          })
          return
        }

        if (["service_completed", "job_completed"].includes(eventType)) {
          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              status: "completed",
              technician_location: null,
              start_otp: null,
              freshness: "COMPLETED",
            }
          })
          return
        }

        if (eventType === "technician_status_updated" && eventData) {
          setData((prev) => {
            if (!prev) return prev
            const isNowAccepted = ["accepted", "on_the_way", "arrived", "in_progress", "completed"].includes(eventData.status)
            return {
              ...prev,
              status: eventData.status || prev.status,
              is_accepted: isNowAccepted,
              start_otp: isNowAccepted ? (eventData.start_otp || prev.start_otp) : null,
            }
          })
          return
        }

        if (eventType === "otp_verification_success") {
          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              status: "in_progress",
              otp_verified: true,
            }
          })
          return
        }
      },
      // onStatusChange callback
      (state) => {
        if (!mountedRef.current) return
        // Bug found: this callback used to receive websocketService's
        // connection-state string ("connecting" | "connected" |
        // "reconnecting" | "disconnected") but treated it as a boolean --
        // every one of those strings is truthy in JS, so wsConnected/online
        // were ALWAYS true and this never actually reflected real
        // connection health: the "Live" badge never turned off, the fast
        // 5s REST-polling fallback below (which only kicks in when
        // wsConnected is false) never activated, and reconnecting/
        // disconnected states were never shown -- even though the REST
        // polling fallback was quietly doing the real work underneath the
        // whole time.
        const isConnected = state === "connected"
        setWsConnected(isConnected)
        if (isConnected) {
          setOnline(true)
          setConnectionState("LIVE")
        } else if (state === "reconnecting") {
          setConnectionState("RECONNECTING")
        } else if (state === "connecting") {
          setConnectionState("CONNECTING")
        } else {
          setConnectionState("POLLING")
        }
      }
    )

    wsRef.current = ws
    return () => {
      if (ws) ws.close()
    }
  }, [activeIdentifier, trackingToken])

  /* ── Initial REST Fetch & Polling Fallback ── */
  useEffect(() => {
    fetchLive()
    const interval = wsConnected ? 25000 : 5000 // Fast 5s REST polling when WS disconnected
    pollRef.current = setInterval(fetchLive, interval)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchLive, wsConnected])

  /* ── Auto-terminate polling on terminal status ── */
  useEffect(() => {
    if (data?.status && TERMINAL_STATUSES.has(data.status.toLowerCase())) {
      if (pollRef.current) clearInterval(pollRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [data?.status])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (pollRef.current) clearInterval(pollRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return {
    data,
    setData,
    loading,
    errorKind,
    online,
    wsConnected,
    connectionState,
    lastUpdated,
    refresh: fetchLive,
  }
}

export default useCustomerTracking
