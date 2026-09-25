/**
 * logisticsAdminService.js
 * Administrator reads and writes for the Goods & Transport rate card.
 *
 * Deliberately separate from logisticsService.js, whose own header says
 * "Public endpoints, no auth required (pre-login booking pages)". Everything
 * here requires an authenticated administrator holding `pricing:view`, and
 * the per-km rate card these return is not public — the customer-facing
 * tier endpoint exposes only `starting_price` and must stay that way.
 *
 * Nothing in this module computes a fare. quote_logistics_fare() on the
 * server remains the single calculation authority; this only edits the rows
 * that authority reads.
 */
import { apiRequest } from "./client.js"

const BASE = "/logistics/admin/tiers/"

/**
 * client.js throws `{ status, body }` on any non-2xx. Flatten that into the
 * one shape the pricing screen handles, so the page never has to know how
 * the transport reports failure.
 */
function asError(err) {
  const body = (err && typeof err === "object" && err.body) || {}
  const status = (err && err.status) || 0
  return {
    status,
    code: body.error_code || (status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : "REQUEST_FAILED"),
    message:
      body.message ||
      body.detail ||
      (status === 403
        ? "Your role does not allow this change."
        : "The request could not be completed. Please try again."),
    // VALIDATION_ERROR -> { field: ["msg", ...] }
    errors: body.errors || null,
    // PRICING_FORBIDDEN / REASON_REQUIRED -> ["per_km_rate", ...]
    fields: body.fields || null,
    // TIER_CHANGED_ELSEWHERE -> the row as it now stands on the server
    current: body.current || null,
  }
}

/** GET the rate card. `filters` keys: city, category, is_active, search. */
export async function fetchAdminTiers(filters = {}) {
  const params = new URLSearchParams()
  if (filters.city) params.set("city", filters.city)
  if (filters.category) params.set("category", filters.category)
  if (filters.is_active) params.set("is_active", filters.is_active)
  if (filters.search) params.set("search", filters.search)
  const qs = params.toString()
  try {
    const res = await apiRequest(`${BASE}${qs ? `?${qs}` : ""}`)
    return {
      ok: true,
      tiers: Array.isArray(res?.data) ? res.data : [],
      meta: res?.meta || null,
      notice: res?.price_lock_notice || "",
    }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

/**
 * PATCH one tier.
 *
 * `changes` must carry ONLY the fields that actually changed — the server
 * writes one audit row per field it receives as different, and sending a
 * whole form back would be indistinguishable from an operator having
 * retyped every rate.
 *
 * `expectedUpdatedAt` is the `updated_at` the row carried when it was
 * loaded. The server refuses the write with TIER_CHANGED_ELSEWHERE if the
 * row moved in between, rather than silently overwriting a colleague.
 */
export async function updateAdminTier(id, changes, { reason = "", expectedUpdatedAt = null } = {}) {
  const payload = { ...changes }
  if (reason) payload.reason = reason
  if (expectedUpdatedAt) payload.expected_updated_at = expectedUpdatedAt
  try {
    const res = await apiRequest(`${BASE}${id}/`, { method: "PATCH", json: payload })
    return {
      ok: true,
      tier: res?.data || null,
      changed: Array.isArray(res?.changed) ? res.changed : [],
      message: res?.message || "",
      notice: res?.price_lock_notice || "",
    }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

/** GET the audit trail for one tier (CatalogChangeLog rows, newest first). */
export async function fetchAdminTierHistory(id) {
  try {
    const res = await apiRequest(`${BASE}${id}/history/`)
    return { ok: true, rows: Array.isArray(res?.data) ? res.data : [] }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

/* =========================================================================
 * GOODS CATEGORIES ADMIN APIS
 * ========================================================================= */

const CAT_BASE = "/logistics/admin/categories/"

export async function fetchAdminGoodsCategories(filters = {}) {
  const params = new URLSearchParams()
  if (filters.is_active !== undefined) params.set("is_active", filters.is_active)
  if (filters.allows_two_wheeler !== undefined) params.set("allows_two_wheeler", filters.allows_two_wheeler)
  if (filters.search) params.set("search", filters.search)
  const qs = params.toString()
  try {
    const res = await apiRequest(`${CAT_BASE}${qs ? `?${qs}` : ""}`)
    return {
      ok: true,
      categories: Array.isArray(res?.data) ? res.data : [],
      total: res?.total_count || 0,
    }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function createAdminGoodsCategory(payload) {
  try {
    const res = await apiRequest(CAT_BASE, { method: "POST", json: payload })
    return { ok: true, category: res?.data, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function updateAdminGoodsCategory(id, changes, reason = "") {
  try {
    const res = await apiRequest(`${CAT_BASE}${id}/`, {
      method: "PATCH",
      json: { ...changes, reason },
    })
    return { ok: true, category: res?.data, changed: res?.changed, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function deleteAdminGoodsCategory(id, reason = "") {
  try {
    const res = await apiRequest(`${CAT_BASE}${id}/`, {
      method: "DELETE",
      json: { reason },
    })
    return { ok: true, category: res?.data, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

/* =========================================================================
 * GOODS ITEMS ADMIN APIS
 * ========================================================================= */

const ITEM_BASE = "/logistics/admin/items/"

export async function fetchAdminGoodsItems(filters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set("category", filters.category)
  if (filters.is_active !== undefined) params.set("is_active", filters.is_active)
  if (filters.is_prohibited !== undefined) params.set("is_prohibited", filters.is_prohibited)
  if (filters.search) params.set("search", filters.search)
  const qs = params.toString()
  try {
    const res = await apiRequest(`${ITEM_BASE}${qs ? `?${qs}` : ""}`)
    return {
      ok: true,
      items: Array.isArray(res?.data) ? res.data : [],
      total: res?.total_count || 0,
    }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function createAdminGoodsItem(payload) {
  try {
    const res = await apiRequest(ITEM_BASE, { method: "POST", json: payload })
    return { ok: true, item: res?.data, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function updateAdminGoodsItem(id, changes, reason = "") {
  try {
    const res = await apiRequest(`${ITEM_BASE}${id}/`, {
      method: "PATCH",
      json: { ...changes, reason },
    })
    return { ok: true, item: res?.data, changed: res?.changed, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function deleteAdminGoodsItem(id, reason = "") {
  try {
    const res = await apiRequest(`${ITEM_BASE}${id}/`, {
      method: "DELETE",
      json: { reason },
    })
    return { ok: true, item: res?.data, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

/* =========================================================================
 * PACKERS & MOVERS CONFIG ADMIN APIS
 * ========================================================================= */

const PM_BASE = "/logistics/admin/packers-movers-config/"

export async function fetchAdminPMConfig(city = "Hosur") {
  try {
    const res = await apiRequest(`${PM_BASE}?city=${encodeURIComponent(city)}`)
    return { ok: true, config: res?.data }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function updateAdminPMConfig(changes, reason = "", city = "Hosur") {
  try {
    const res = await apiRequest(PM_BASE, {
      method: "PATCH",
      json: { ...changes, city, reason },
    })
    return { ok: true, config: res?.data, changed: res?.changed, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

/* =========================================================================
 * OPERATING SLOTS ADMIN APIS
 * ========================================================================= */

const SLOT_BASE = "/logistics/admin/slots/"

export async function fetchAdminSlots(filters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set("category", filters.category)
  if (filters.city) params.set("city", filters.city)
  if (filters.group) params.set("group", filters.group)
  if (filters.is_active !== undefined) params.set("is_active", filters.is_active)
  if (filters.search) params.set("search", filters.search)
  const qs = params.toString()
  try {
    const res = await apiRequest(`${SLOT_BASE}${qs ? `?${qs}` : ""}`)
    return {
      ok: true,
      slots: Array.isArray(res?.data) ? res.data : [],
      total: res?.total_count || 0,
    }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function createAdminSlot(payload) {
  try {
    const res = await apiRequest(SLOT_BASE, { method: "POST", json: payload })
    return { ok: true, slot: res?.data, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function updateAdminSlot(id, changes, reason = "") {
  try {
    const res = await apiRequest(`${SLOT_BASE}${id}/`, {
      method: "PATCH",
      json: { ...changes, reason },
    })
    return { ok: true, slot: res?.data, changed: res?.changed, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function deleteAdminSlot(id, reason = "") {
  try {
    const res = await apiRequest(`${SLOT_BASE}${id}/`, {
      method: "DELETE",
      json: { reason },
    })
    return { ok: true, slot: res?.data, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

/* =========================================================================
 * 6. LANES & INTERCITY ROUTES ADMINISTRATION
 * ========================================================================= */

const LANE_BASE = "/logistics/admin/lanes/"

export async function fetchAdminLanes(filters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set("category", filters.category)
  if (filters.city) params.set("city", filters.city)
  if (filters.is_active !== undefined) params.set("is_active", filters.is_active)
  if (filters.search) params.set("search", filters.search)
  const qs = params.toString()
  try {
    const res = await apiRequest(`${LANE_BASE}${qs ? `?${qs}` : ""}`)
    return {
      ok: true,
      lanes: Array.isArray(res?.data) ? res.data : [],
      total: res?.total_count || 0,
    }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function createAdminLane(payload) {
  try {
    const res = await apiRequest(LANE_BASE, { method: "POST", json: payload })
    return { ok: true, lane: res?.data, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function updateAdminLane(id, changes, reason = "") {
  try {
    const res = await apiRequest(`${LANE_BASE}${id}/`, {
      method: "PATCH",
      json: { ...changes, reason },
    })
    return { ok: true, lane: res?.data, changed: res?.changed, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function deleteAdminLane(id, reason = "") {
  try {
    const res = await apiRequest(`${LANE_BASE}${id}/`, {
      method: "DELETE",
      json: { reason },
    })
    return { ok: true, lane: res?.data, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

/* =========================================================================
 * 7. GT PLATFORM FAQS ADMINISTRATION
 * ========================================================================= */

const FAQ_BASE = "/logistics/admin/faqs/"

export async function fetchAdminFaqs(filters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set("category", filters.category)
  if (filters.city) params.set("city", filters.city)
  if (filters.is_active !== undefined) params.set("is_active", filters.is_active)
  if (filters.search) params.set("search", filters.search)
  const qs = params.toString()
  try {
    const res = await apiRequest(`${FAQ_BASE}${qs ? `?${qs}` : ""}`)
    return {
      ok: true,
      faqs: Array.isArray(res?.data) ? res.data : [],
      total: res?.total_count || 0,
    }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function createAdminFaq(payload) {
  try {
    const res = await apiRequest(FAQ_BASE, { method: "POST", json: payload })
    return { ok: true, faq: res?.data, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function updateAdminFaq(id, changes, reason = "") {
  try {
    const res = await apiRequest(`${FAQ_BASE}${id}/`, {
      method: "PATCH",
      json: { ...changes, reason },
    })
    return { ok: true, faq: res?.data, changed: res?.changed, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function deleteAdminFaq(id, reason = "") {
  try {
    const res = await apiRequest(`${FAQ_BASE}${id}/`, {
      method: "DELETE",
      json: { reason },
    })
    return { ok: true, faq: res?.data, message: res?.message }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}



/* =========================================================================
 * 8. SERVICE COVERAGE (geofenced service areas)
 *
 * Backed by the existing ServiceZone geofence API in settings_hub
 * (/api/settings/service-zones/) -- the same zones the booking endpoint and
 * the public /check/ endpoint enforce. This tab only manages the zones that
 * are configured for Goods & Transport service slugs.
 * ========================================================================= */

const ZONE_BASE = "/settings/service-zones/"

export const GT_COVERAGE_SERVICES = [
  { slug: "goods_transport_truck", label: "Mini Truck" },
  { slug: "goods_transport_two_wheeler", label: "Two Wheeler" },
  { slug: "packers_movers", label: "Packers & Movers" },
]

export async function fetchCoverageZones(services = GT_COVERAGE_SERVICES.map((s) => s.slug)) {
  const qs = services.length ? `?services=${encodeURIComponent(services.join(","))}` : ""
  try {
    const res = await apiRequest(`${ZONE_BASE}${qs}`)
    const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
    return { ok: true, zones: list }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function createCoverageZone(payload) {
  try {
    const res = await apiRequest(ZONE_BASE, { method: "POST", json: payload })
    return { ok: true, zone: res?.data || res }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function updateCoverageZone(id, changes) {
  try {
    const res = await apiRequest(`${ZONE_BASE}${id}/`, { method: "PATCH", json: changes })
    return { ok: true, zone: res?.data || res }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

export async function deleteCoverageZone(id) {
  try {
    await apiRequest(`${ZONE_BASE}${id}/`, { method: "DELETE" })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}
