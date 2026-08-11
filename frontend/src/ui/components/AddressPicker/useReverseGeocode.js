/**
 * useReverseGeocode.js
 * Slice 2 of 4 — Debounced reverse-geocoding hook
 *
 * Behaviour:
 *  • Debounces calls by DEBOUNCE_MS after coords change
 *  • Cancels any in-flight fetch when newer coords arrive (AbortController)
 *  • Exposes { address, loading, error } reactive state
 *  • On mount (or when initialCoords first set), fires immediately after
 *    DEBOUNCE_MS so the bottom sheet populates without needing a drag
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { apiRequest } from "../../../api/client.js"

// Debounce window in ms — avoids firing on every intermediate idle after fast drags
const DEBOUNCE_MS = 500

/**
 * @param {{ lat: number, lng: number } | null} coords
 * @returns {{ address: object|null, loading: boolean, error: string|null }}
 *
 * address shape (when resolved):
 *   { formatted_address, locality, city, state, pincode, country, latitude, longitude }
 */
export function useReverseGeocode(coords) {
  const [address, setAddress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // Keep a ref to the current AbortController so we can cancel in-flight requests
  const abortRef   = useRef(null)
  const debounceRef = useRef(null)

  const fetchGeocode = useCallback(async (lat, lng, signal) => {
    setLoading(true)
    setError(null)

    try {
      const res = await apiRequest("/customer/addresses/reverse-geocode/", {
        method: "POST",
        json: { latitude: lat, longitude: lng },
        signal,                     // AbortController signal
      })

      // If aborted mid-flight, ignore
      if (signal.aborted) return

      if (res?.success && res.data) {
        setAddress(res.data)
      } else {
        setError(res?.error?.message || "Couldn't fetch address. Try adjusting the pin.")
        setAddress(null)
      }
    } catch (err) {
      // Ignore abort errors — they are intentional
      if (err?.name === "AbortError" || signal.aborted) return
      setError("Couldn't fetch address. Try adjusting the pin.")
      setAddress(null)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!coords) return

    const { lat, lng } = coords

    // Cancel any pending debounce
    clearTimeout(debounceRef.current)

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort()
    }

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller
      fetchGeocode(lat, lng, controller.signal)
    }, DEBOUNCE_MS)

    // Cleanup: cancel on unmount or coords change before timer fires
    return () => {
      clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [coords?.lat, coords?.lng, fetchGeocode])

  return { address, loading, error }
}
