/**
 * customerLocationStorage.js
 * Customer-Scoped Location & Address Storage Utility.
 *
 * Ensures customer location data is strictly partitioned by authenticated user.id.
 * Prevents cross-customer location leakage in shared browser sessions.
 */

const LEGACY_GLOBAL_KEYS = [
  "calservice_user_location",
  "calservice_selected_address",
  "calservice_selected_service_address",
  "calservice_user_coords",
  "calservice_zone_result",
  "calservice_last_booking",
  "calservice_active_tracking_id",
  "calservice_customer_token",
]

/**
 * Remove all legacy un-scoped global location and booking keys from browser storage.
 */
export function clearLegacyLocationStorage() {
  try {
    for (const key of LEGACY_GLOBAL_KEYS) {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    }
  } catch (e) {
    // Ignore storage quota / security errors in private browsing
  }
}

/**
 * Build a user-scoped storage key.
 */
function scopedKey(prefix, userId) {
  if (!userId) return null
  return `calservice_customer_${userId}_${prefix}`
}

/**
 * Get customer-scoped location label (e.g., "45, Bagalur Rd, Hosur").
 */
export function getCustomerLocation(userId) {
  if (!userId) return null
  try {
    return localStorage.getItem(scopedKey("location", userId)) || null
  } catch {
    return null
  }
}

/**
 * Set customer-scoped location label.
 */
export function setCustomerLocation(userId, locationStr) {
  if (!userId) return
  try {
    if (locationStr) {
      localStorage.setItem(scopedKey("location", userId), String(locationStr))
    } else {
      localStorage.removeItem(scopedKey("location", userId))
    }
  } catch {}
}

/**
 * Get customer-scoped selected address object.
 */
export function getCustomerSelectedAddress(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(scopedKey("selected_address", userId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Set customer-scoped selected address object.
 */
export function setCustomerSelectedAddress(userId, addressObj) {
  if (!userId) return
  try {
    if (addressObj) {
      localStorage.setItem(scopedKey("selected_address", userId), JSON.stringify(addressObj))
      localStorage.setItem(scopedKey("service_address", userId), JSON.stringify(addressObj))
      const label = typeof addressObj === "string" ? addressObj : (addressObj.formatted_address || addressObj.address_line1 || "")
      if (label) {
        localStorage.setItem(scopedKey("location", userId), label)
      }
      if (addressObj.latitude && addressObj.longitude) {
        localStorage.setItem(
          scopedKey("coordinates", userId),
          JSON.stringify({ lat: Number(addressObj.latitude), lng: Number(addressObj.longitude) })
        )
      }
    } else {
      localStorage.removeItem(scopedKey("selected_address", userId))
      localStorage.removeItem(scopedKey("service_address", userId))
      localStorage.removeItem(scopedKey("location", userId))
      localStorage.removeItem(scopedKey("coordinates", userId))
    }
  } catch {}
}

/**
 * Get customer-scoped coordinates { lat, lng }.
 */
export function getCustomerCoordinates(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(scopedKey("coordinates", userId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Set customer-scoped coordinates { lat, lng }.
 */
export function setCustomerCoordinates(userId, coords) {
  if (!userId) return
  try {
    if (coords && coords.lat != null && coords.lng != null) {
      localStorage.setItem(scopedKey("coordinates", userId), JSON.stringify(coords))
    } else {
      localStorage.removeItem(scopedKey("coordinates", userId))
    }
  } catch {}
}

/**
 * Clear all location and address storage for a specific customer.
 */
export function clearCustomerLocation(userId) {
  if (!userId) return
  try {
    localStorage.removeItem(scopedKey("location", userId))
    localStorage.removeItem(scopedKey("selected_address", userId))
    localStorage.removeItem(scopedKey("service_address", userId))
    localStorage.removeItem(scopedKey("coordinates", userId))
    localStorage.removeItem(scopedKey("zone_result", userId))
  } catch {}
}

/**
 * Purge all customer-scoped location keys across all users from localStorage.
 */
export function clearAllCustomerLocationState() {
  clearLegacyLocationStorage()
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith("calservice_customer_")) {
        keysToRemove.push(k)
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k)
    }
  } catch {}
}
