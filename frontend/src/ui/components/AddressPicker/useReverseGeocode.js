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

// In-memory geocode cache for instantaneous resolution when panning over visited areas
const geoCache = new Map()

// Debounce window in ms — fast enough to feel immediate, while avoiding network spam during continuous drag
const DEBOUNCE_MS = 180

function getCacheKey(lat, lng) {
  return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`
}

/**
 * @param {{ lat: number, lng: number } | null} coords
 * @returns {{ address: object|null, loading: boolean, error: string|null }}
 *
 * address shape (when resolved):
 *   { formatted_address, locality, city, state, pincode, country, latitude, longitude }
 */
export function useReverseGeocode(coords) {
  const [address, setAddress] = useState(() => {
    if (coords?.lat && coords?.lng) {
      const key = getCacheKey(coords.lat, coords.lng)
      return geoCache.get(key) || null
    }
    return null
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // Keep a ref to the current AbortController so we can cancel in-flight requests
  const abortRef   = useRef(null)
  const debounceRef = useRef(null)

  const fetchGeocode = useCallback(async (lat, lng, signal) => {
    const key = getCacheKey(lat, lng)
    if (geoCache.has(key)) {
      setAddress(geoCache.get(key))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let resolvedData = null

      const googleApiKey =
        import.meta.env.VITE_GOOGLE_MAPS_KEY ||
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
        "AIzaSyC-7JjgSXDrqNF1BMMnlvKtgRPS6_98uP8"

      // 1. Direct Google Maps Geocoding API (highest accuracy when API key is provided)
      if (googleApiKey && !signal.aborted) {
        try {
          const gRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`,
            { signal }
          )
          const gData = await gRes.json()
          if (gData.status === "OK" && gData.results && gData.results.length > 0) {
            const first = gData.results[0]
            const comps = first.address_components || []

            let streetNumber = ""
            let route = ""
            let sublocality = ""
            let locality = ""
            let city = ""
            let state = ""
            let pincode = ""
            let country = ""

            for (const c of comps) {
              const types = c.types || []
              if (types.includes("street_number")) streetNumber = c.long_name
              if (types.includes("route")) route = c.long_name
              if (types.includes("sublocality") || types.includes("sublocality_level_1")) sublocality = c.long_name
              if (types.includes("locality")) city = c.long_name
              if (types.includes("administrative_area_level_1")) state = c.long_name
              if (types.includes("postal_code")) pincode = c.long_name
              if (types.includes("country")) country = c.long_name
            }

            const cleanLoc = [streetNumber, route, sublocality].filter(Boolean).join(", ") || sublocality || route
            
            resolvedData = {
              formatted_address: first.formatted_address,
              locality: cleanLoc || sublocality || "Current Location",
              city: city || "",
              state: state || "",
              pincode: pincode || "",
              country: country || "India",
              latitude: lat,
              longitude: lng,
            }
          }
        } catch (e) { }
      }

      // 2. Try backend endpoint fallback
      if (!resolvedData && !signal.aborted) {
        try {
          const res = await apiRequest("/customer/addresses/reverse-geocode/", {
            method: "POST",
            json: { latitude: lat, longitude: lng },
            signal,
          })
          if (res?.success && res.data) {
            resolvedData = res.data
          }
        } catch (e) { }
      }

      // 3. Direct Nominatim OpenStreetMap client-side fallback
      if (!resolvedData && !signal.aborted) {
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          const nomRes = await fetch(nomUrl, {
            headers: { "Accept-Language": "en" },
            signal
          })
          if (nomRes.ok) {
            const nomData = await nomRes.json()
            if (nomData && nomData.address) {
              const a = nomData.address
              const sublocality = a.suburb || a.neighbourhood || a.residential || a.subdistrict || a.quarter || ""
              const road = a.road || a.pedestrian || a.street || ""
              const city = a.city || a.town || a.village || a.county || a.state_district || ""
              const state = a.state || ""
              const pincode = a.postcode || ""
              const cleanLoc = [road, sublocality].filter(Boolean).join(", ") || sublocality || road || "Current Location"

              resolvedData = {
                formatted_address: nomData.display_name,
                locality: cleanLoc,
                city,
                state,
                pincode,
                country: a.country || "India",
                latitude: lat,
                longitude: lng,
              }
            }
          }
        } catch (e) { }
      }

      if (signal.aborted) return

      if (resolvedData) {
        geoCache.set(getCacheKey(lat, lng), resolvedData)
        setAddress(resolvedData)
      } else {
        const fallback = {
          formatted_address: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          locality: `Current GPS Location`,
          city: "",
          state: "",
          pincode: "",
          latitude: lat,
          longitude: lng,
        }
        geoCache.set(getCacheKey(lat, lng), fallback)
        setAddress(fallback)
      }
    } catch (err) {
      if (err?.name === "AbortError" || signal.aborted) return
      setAddress({
        formatted_address: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        locality: "Current GPS Location",
        city: "",
        state: "",
        pincode: "",
        latitude: lat,
        longitude: lng,
      })
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
