import { apiRequest } from "../../api/client.js"

// Non-rate-card default layout metadata (Note: categories and spare items are strictly database-driven)
export const DEFAULT_AC_INSPECTION_CONFIG = {
  fee: 199,
  title: "AC Inspection & Diagnostic Visit",
  subtitle: "Not sure about the fault? Certified technician visits with diagnostic instruments, inspects cooling, gas pressure & electricals, and provides an itemized quotation before repair.",
  badges: [
    "₹199 Diagnostic Fee",
    "Adjustable Against Repair",
    "Pay at Doorstep",
  ],
  includes: [
    "Comprehensive 21-point system & safety diagnostics",
    "Cooling delta temp scan & gas pressure test",
    "Compressor load & capacitor electrical scan",
    "Itemized quotation before any repair work",
  ],
  ready: [
    "Continuous power supply and remote control available for testing",
    "Clear access to indoor and outdoor AC units",
    "Area below indoor unit cleared of electronics & valuables",
    "Outdoor unit safely accessible via balcony, terrace, or window",
  ],
  rateCardCategories: [], // Strictly populated from PostgreSQL
}

const STORAGE_KEY = "calservices_ac_inspection_config"

/**
 * Fetch live AC Inspection config from server database.
 * Does NOT fall back to hardcoded items if API fails.
 */
export async function fetchACInspectionConfig() {
  try {
    const res = await apiRequest("/settings/ac-inspection/config/")
    if (res?.success && res.data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data))
      } catch (e) {}
      return res.data
    }
    if (res?.error) {
      throw new Error(res.error)
    }
  } catch (err) {
    console.error("Unable to load AC inspection config from database:", err)
    // Check if we have cached live data from previous successful database fetch
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.rateCardCategories?.length > 0) {
          return parsed
        }
      }
    } catch (e) {}
    // Return error shape for UI to render error message as required by spec
    return {
      ...DEFAULT_AC_INSPECTION_CONFIG,
      error: "Unable to load current rate card.",
      rateCardCategories: [],
    }
  }

  return {
    ...DEFAULT_AC_INSPECTION_CONFIG,
    error: "Unable to load current rate card.",
    rateCardCategories: [],
  }
}

/** Save updated AC Inspection config to server (Super Admin) */
export async function saveACInspectionConfig(configData) {
  try {
    const res = await apiRequest("/settings/ac-inspection/config/", {
      method: "PUT",
      body: JSON.stringify(configData),
    })
    if (res?.success && res.data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data))
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ac_inspection_config_updated", { detail: res.data }))
        }
      } catch (e) {}
      return res
    }
    return res || { success: true, data: configData }
  } catch (err) {
    console.error("Server save error:", err)
    throw err
  }
}

/* =========================================================================
   RELATIONAL POSTGRESQL APIs: CATEGORIES, ITEMS & CONFIGURATION
   ========================================================================= */

/** Fetch all AC Inspection Rate Categories from database */
export async function fetchACRateCategories() {
  return await apiRequest("/service-requests/admin/ac-inspection/categories/")
}

/** Create a new category in database */
export async function createACRateCategory(data) {
  return await apiRequest("/service-requests/admin/ac-inspection/categories/", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

/** Update an existing category in database */
export async function updateACRateCategory(id, data) {
  return await apiRequest(`/service-requests/admin/ac-inspection/categories/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

/** Deactivate / delete a category safely */
export async function deleteACRateCategory(id) {
  return await apiRequest(`/service-requests/admin/ac-inspection/categories/${id}/`, {
    method: "DELETE",
  })
}

/** Fetch AC Inspection Rate Items from database with optional filters */
export async function fetchACRateItems(params = {}) {
  const query = new URLSearchParams()
  if (params.category) query.set("category", params.category)
  if (params.search) query.set("search", params.search)
  if (params.is_active !== undefined) query.set("is_active", params.is_active)
  const qs = query.toString()
  const url = qs ? `/service-requests/admin/ac-inspection/items/?${qs}` : "/service-requests/admin/ac-inspection/items/"
  return await apiRequest(url)
}

/** Create a new Rate Item in database */
export async function createACRateItem(data) {
  return await apiRequest("/service-requests/admin/ac-inspection/items/", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

/** Update an existing Rate Item in database */
export async function updateACRateItem(id, data) {
  return await apiRequest(`/service-requests/admin/ac-inspection/items/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

/** Delete or safely deactivate a Rate Item in database */
export async function deleteACRateItem(id) {
  return await apiRequest(`/service-requests/admin/ac-inspection/items/${id}/`, {
    method: "DELETE",
  })
}

/** Fetch AC Inspection configuration (diagnostic fee, currency) from database */
export async function fetchACConfigDB() {
  return await apiRequest("/service-requests/admin/ac-inspection/config/")
}

/** Update AC Inspection configuration in database */
export async function updateACConfigDB(data) {
  return await apiRequest("/service-requests/admin/ac-inspection/config/", {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

/** Safely reset AC Inspection default catalog in PostgreSQL database */
export async function resetACDefaultsDB() {
  return await apiRequest("/service-requests/admin/ac-inspection/reset-defaults/", {
    method: "POST",
  })
}

/** Public / Technician endpoint to fetch active rate card for inspections */
export async function fetchPublicRateCard() {
  return await apiRequest("/service-requests/ac-inspection/rate-card/")
}

// Backward-compatibility aliases
export const fetchACRateCardItemsFromDB = fetchACRateItems
export const createACRateCardItemInDB = createACRateItem
export const updateACRateCardItemInDB = updateACRateItem
export const deleteACRateCardItemInDB = deleteACRateItem
export const resetACRateCardDefaultsInDB = resetACDefaultsDB
